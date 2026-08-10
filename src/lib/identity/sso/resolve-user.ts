/**
 * SP.2B / SP.2B.4 — resolve / link / JIT Studio *product* user from HomeCheff centralUserId.
 *
 * Canonical order after strong HC SSO:
 * 1. Lookup by centralUserId → reuse
 * 2. Lookup unlinked legacy Studio user by normalized email (exactly one) → link
 * 3. Explicit legacy claim is a separate dual-proof path (claim-user) — not inferred here
 * 4. No candidate + JIT on → create Studio PRODUCT profile only (not HC identity)
 * 5. No candidate + JIT off → IDENTITY_NOT_LINKED
 *
 * JIT may create: Studio User (+ ensureStudioAccount / wallet bootstrap).
 * JIT may NOT: create HomeCheff User, password, Google identity, guess legacy ownership.
 *
 * Critical: JIT controls CREATION only — never safe LINKING of an existing user.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStudioJitProvisioningEnabled } from "@/lib/identity/flags";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { StudioSsoError } from "./errors";
import { logStudioSsoEvent } from "./observability";

export type ResolvedStudioUser = {
  id: string;
  email: string;
  isActive: boolean;
  /** True when this SSO created or newly linked the Studio user. */
  firstProductVisit: boolean;
};

/** Test seams — production uses real prisma / flags / ensureStudioAccount. */
export type ResolveUserDeps = {
  db: typeof prisma;
  jitEnabled: () => boolean;
  ensureAccount: (userId: string, email: string) => Promise<unknown>;
};

const defaultDeps = (): ResolveUserDeps => ({
  db: prisma,
  jitEnabled: isStudioJitProvisioningEnabled,
  ensureAccount: ensureStudioAccount,
});

/** Normalize email for identity match (trim + lowercase). */
export function normalizeIdentityEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return true;
  }
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: unknown }).code === "P2002",
  );
}

async function findByCentralUserId(
  db: ResolveUserDeps["db"],
  centralUserId: string,
): Promise<{ id: string; email: string; isActive: boolean } | null> {
  const rows = await db.user.findMany({
    where: { centralUserId },
    select: { id: true, email: true, isActive: true },
    take: 2,
  });
  if (rows.length > 1) {
    logStudioSsoEvent("identity_conflict", { reason: "duplicate_centralUserId" });
    throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
  }
  return rows[0] ?? null;
}

export async function resolveStudioUserFromCentralClaims(
  input: {
    centralUserId: string;
    email: string;
  },
  deps: ResolveUserDeps = defaultDeps(),
): Promise<ResolvedStudioUser> {
  const centralUserId = input.centralUserId.trim();
  const email = normalizeIdentityEmail(input.email);
  const { db, jitEnabled, ensureAccount } = deps;

  if (!centralUserId || !email.includes("@")) {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }

  logStudioSsoEvent("sso_callback_received", {
    centralUserIdPrefix: centralUserId.slice(0, 8),
    emailDomain: email.includes("@") ? email.split("@")[1]! : null,
  });

  const byCentral = await findByCentralUserId(db, centralUserId);

  if (byCentral) {
    if (byCentral.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }
    if (normalizeIdentityEmail(byCentral.email) !== email) {
      await db.user.update({
        where: { id: byCentral.id },
        data: { email },
      });
    }
    await ensureAccount(byCentral.id, email);
    return { id: byCentral.id, email, isActive: true, firstProductVisit: false };
  }

  // Case-insensitive exact email match (PostgreSQL).
  const byEmailRows = await db.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, isActive: true, centralUserId: true },
    take: 2,
  });

  if (byEmailRows.length > 1) {
    logStudioSsoEvent("identity_conflict", { reason: "ambiguous_email" });
    throw new StudioSsoError("IDENTITY_EMAIL_COLLISION");
  }

  if (byEmailRows.length === 1) {
    const byEmail = byEmailRows[0]!;
    logStudioSsoEvent("existing_identity_candidate_found", {
      studioUserIdPrefix: byEmail.id.slice(0, 8),
      linked: Boolean(byEmail.centralUserId),
    });

    if (byEmail.centralUserId && byEmail.centralUserId !== centralUserId) {
      logStudioSsoEvent("identity_conflict", { reason: "email_central_mismatch" });
      throw new StudioSsoError("IDENTITY_EMAIL_COLLISION");
    }
    if (byEmail.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }

    if (byEmail.centralUserId === centralUserId) {
      await ensureAccount(byEmail.id, email);
      return {
        id: byEmail.id,
        email,
        isActive: true,
        firstProductVisit: false,
      };
    }

    // Transactional link: candidate must still be unlinked; centralUserId unused.
    const wasUnlinked = !byEmail.centralUserId;
    const linked = await db.$transaction(async (tx) => {
      const other = await tx.user.findFirst({
        where: { centralUserId, NOT: { id: byEmail.id } },
        select: { id: true },
      });
      if (other) {
        throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
      }

      const updated = await tx.user.updateMany({
        where: { id: byEmail.id, centralUserId: null },
        data: {
          centralUserId,
          centralLinkedAt: new Date(),
          email,
          passwordHash: null,
        },
      });
      if (updated.count !== 1) {
        // Lost race or unexpectedly already linked.
        const again = await tx.user.findUnique({
          where: { id: byEmail.id },
          select: { id: true, email: true, isActive: true, centralUserId: true },
        });
        if (again?.centralUserId === centralUserId) {
          return again;
        }
        throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
      }

      return tx.user.findUniqueOrThrow({
        where: { id: byEmail.id },
        select: { id: true, email: true, isActive: true },
      });
    });

    logStudioSsoEvent("existing_identity_linked", {
      studioUserIdPrefix: linked.id.slice(0, 8),
      centralUserIdPrefix: centralUserId.slice(0, 8),
    });

    await ensureAccount(linked.id, linked.email);
    return { ...linked, firstProductVisit: wasUnlinked };
  }

  if (!jitEnabled()) {
    logStudioSsoEvent("identity_not_linked", {
      centralUserIdPrefix: centralUserId.slice(0, 8),
      emailDomain: email.includes("@") ? email.split("@")[1]! : null,
      reason: "no_studio_candidate",
    });
    throw new StudioSsoError("IDENTITY_NOT_LINKED");
  }

  // SP.2B.4 — JIT product provisioning (Studio profile only).
  try {
    const created = await db.$transaction(async (tx) => {
      const raced = await tx.user.findMany({
        where: { centralUserId },
        select: { id: true, email: true, isActive: true },
        take: 1,
      });
      if (raced[0]) {
        return { ...raced[0], created: false as const };
      }

      const row = await tx.user.create({
        data: {
          email,
          passwordHash: null,
          centralUserId,
          centralLinkedAt: new Date(),
          role: "user",
          isActive: true,
        },
        select: { id: true, email: true, isActive: true },
      });
      return { ...row, created: true as const };
    });

    if (created.created) {
      logStudioSsoEvent("jit_product_user_created", {
        studioUserIdPrefix: created.id.slice(0, 8),
        centralUserIdPrefix: centralUserId.slice(0, 8),
      });
    }

    if (created.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }

    await ensureAccount(created.id, created.email);
    return {
      id: created.id,
      email: created.email,
      isActive: true,
      firstProductVisit: created.created,
    };
  } catch (err) {
    if (err instanceof StudioSsoError) throw err;
    // Parallel first login: unique(centralUserId) or unique(email) — reuse winner.
    if (isUniqueViolation(err)) {
      const winner = await findByCentralUserId(db, centralUserId);
      if (winner && winner.isActive !== false) {
        await ensureAccount(winner.id, normalizeIdentityEmail(winner.email) === email ? email : winner.email);
        return {
          id: winner.id,
          email: normalizeIdentityEmail(winner.email),
          isActive: true,
          firstProductVisit: false,
        };
      }
      // Email unique lost to a different unlinked user mid-flight — re-enter resolve once.
      const retry = await findByCentralUserId(db, centralUserId);
      if (retry) {
        await ensureAccount(retry.id, email);
        return { id: retry.id, email, isActive: true, firstProductVisit: false };
      }
      throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
    }
    throw err;
  }
}
