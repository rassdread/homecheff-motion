/**
 * SP.2B — controlled legacy Studio account claim (dual-proof).
 *
 * Proves control of BOTH:
 * - existing Studio session (legacy product account)
 * - authenticated HomeCheff central identity (SSO claims)
 *
 * Does NOT use email match. Does NOT create users. Does NOT move wallets/projects.
 * JIT remains irrelevant here.
 */

import { prisma } from "@/lib/prisma";
import { StudioSsoError } from "./errors";
import { logStudioSsoEvent } from "./observability";

export type ClaimResult = {
  id: string;
  email: string;
  centralUserId: string;
  alreadyLinked: boolean;
};

export type ClaimDeps = {
  db: typeof prisma;
};

const defaultDeps = (): ClaimDeps => ({ db: prisma });

/**
 * Link an existing unlinked Studio user to an authenticated HC centralUserId.
 * Preserves Studio User.id, email, passwordHash, and all product ownership.
 */
export async function claimExistingStudioUser(
  input: {
    /** Must match the authenticated Studio session user. */
    studioUserId: string;
    /** From HomeCheff SSO claims only. */
    centralUserId: string;
    claimMethod?: "dual_proof_legacy_session";
  },
  deps: ClaimDeps = defaultDeps(),
): Promise<ClaimResult> {
  const studioUserId = input.studioUserId.trim();
  const centralUserId = input.centralUserId.trim();
  const claimMethod = input.claimMethod ?? "dual_proof_legacy_session";
  const { db } = deps;

  if (!studioUserId || !centralUserId) {
    throw new StudioSsoError("CLAIM_UNAUTHORIZED");
  }

  logStudioSsoEvent("central_identity_claim", {
    phase: "start",
    studioUserIdPrefix: studioUserId.slice(0, 8),
    centralUserIdPrefix: centralUserId.slice(0, 8),
    claimMethod,
  });

  const result = await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: studioUserId },
      select: {
        id: true,
        email: true,
        isActive: true,
        centralUserId: true,
      },
    });

    if (!target || target.isActive === false) {
      throw new StudioSsoError("CLAIM_UNAUTHORIZED");
    }

    // Idempotent: already linked to this central identity.
    if (target.centralUserId === centralUserId) {
      return {
        id: target.id,
        email: target.email,
        centralUserId,
        alreadyLinked: true,
      };
    }

    if (target.centralUserId && target.centralUserId !== centralUserId) {
      logStudioSsoEvent("identity_conflict", { reason: "target_already_claimed" });
      throw new StudioSsoError("CLAIM_ALREADY_LINKED");
    }

    const other = await tx.user.findFirst({
      where: { centralUserId, NOT: { id: studioUserId } },
      select: { id: true },
    });
    if (other) {
      logStudioSsoEvent("identity_conflict", { reason: "central_owned_elsewhere" });
      throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
    }

    const updated = await tx.user.updateMany({
      where: { id: studioUserId, centralUserId: null },
      data: {
        centralUserId,
        centralLinkedAt: new Date(),
        // Preserve email + passwordHash (legacy fallback until REQUIRED).
      },
    });

    if (updated.count !== 1) {
      const again = await tx.user.findUnique({
        where: { id: studioUserId },
        select: { id: true, email: true, centralUserId: true },
      });
      if (again?.centralUserId === centralUserId) {
        return {
          id: again.id,
          email: again.email,
          centralUserId,
          alreadyLinked: true,
        };
      }
      throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
    }

    const linked = await tx.user.findUniqueOrThrow({
      where: { id: studioUserId },
      select: { id: true, email: true, centralUserId: true },
    });

    return {
      id: linked.id,
      email: linked.email,
      centralUserId: linked.centralUserId!,
      alreadyLinked: false,
    };
  });

  logStudioSsoEvent("central_identity_claim", {
    phase: result.alreadyLinked ? "already_linked" : "linked",
    studioUserIdPrefix: result.id.slice(0, 8),
    centralUserIdPrefix: result.centralUserId.slice(0, 8),
    claimMethod,
  });

  return result;
}
