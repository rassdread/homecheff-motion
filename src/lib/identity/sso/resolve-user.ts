/**
 * SP.2B — resolve / link / JIT Studio user from HomeCheff centralUserId.
 *
 * Rules:
 * 1. Match by centralUserId (unique).
 * 2. If missing: after strong HC auth, link exactly one existing Studio user by
 *    safely normalized email when centralUserId is null.
 *    Conflicting centralUserId → DENY. Ambiguous duplicates → DENY.
 * 3. If missing and no Studio user and JIT on: create Studio user (no local password)
 *    + billing bootstrap.
 * 4. If missing and no Studio user and JIT off: IDENTITY_NOT_LINKED.
 * 5. Never invent a second identity for the same centralUserId.
 *
 * Critical: JIT controls CREATION only — never safe LINKING of an existing user.
 */

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

  logStudioSsoEvent("sso_callback_received", {
    centralUserIdPrefix: centralUserId.slice(0, 8),
    emailDomain: email.includes("@") ? email.split("@")[1]! : null,
  });

  const byCentral = await db.user.findMany({
    where: { centralUserId },
    select: { id: true, email: true, isActive: true },
    take: 2,
  });

  if (byCentral.length > 1) {
    logStudioSsoEvent("identity_conflict", { reason: "duplicate_centralUserId" });
    throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
  }

  if (byCentral.length === 1) {
    const user = byCentral[0]!;
    if (user.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }
    if (normalizeIdentityEmail(user.email) !== email) {
      await db.user.update({
        where: { id: user.id },
        data: { email },
      });
    }
    return { id: user.id, email, isActive: true, firstProductVisit: false };
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

  const created = await db.user.create({
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
  await ensureAccount(created.id, created.email);
  return { ...created, firstProductVisit: true };
}
