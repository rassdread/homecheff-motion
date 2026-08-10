/**
 * SP.2B — resolve / link / JIT Studio user from HomeCheff centralUserId.
 *
 * Rules:
 * 1. Match by centralUserId (unique).
 * 2. If missing and JIT on: link existing Studio user by email when unlinked.
 * 3. If missing and JIT on: create Studio user (no local password) + billing bootstrap.
 * 4. Never invent a second identity for the same centralUserId.
 */

import { prisma } from "@/lib/prisma";
import { isStudioJitProvisioningEnabled } from "@/lib/identity/flags";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { StudioSsoError } from "./errors";

export type ResolvedStudioUser = {
  id: string;
  email: string;
  isActive: boolean;
  /** True when this SSO created or newly linked the Studio user. */
  firstProductVisit: boolean;
};

export async function resolveStudioUserFromCentralClaims(input: {
  centralUserId: string;
  email: string;
}): Promise<ResolvedStudioUser> {
  const centralUserId = input.centralUserId.trim();
  const email = input.email.trim().toLowerCase();

  const byCentral = await prisma.user.findMany({
    where: { centralUserId },
    select: { id: true, email: true, isActive: true },
    take: 2,
  });

  if (byCentral.length > 1) {
    throw new StudioSsoError("IDENTITY_MAPPING_CONFLICT");
  }

  if (byCentral.length === 1) {
    const user = byCentral[0]!;
    if (user.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }
    if (user.email !== email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }
    return { id: user.id, email, isActive: true, firstProductVisit: false };
  }

  if (!isStudioJitProvisioningEnabled()) {
    throw new StudioSsoError("IDENTITY_NOT_LINKED");
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true, centralUserId: true },
  });

  if (byEmail) {
    if (byEmail.centralUserId && byEmail.centralUserId !== centralUserId) {
      throw new StudioSsoError("IDENTITY_EMAIL_COLLISION");
    }
    if (byEmail.isActive === false) {
      throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
    }
    const wasUnlinked = !byEmail.centralUserId;
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        centralUserId,
        centralLinkedAt: new Date(),
        passwordHash: null,
      },
      select: { id: true, email: true, isActive: true },
    });
    await ensureStudioAccount(linked.id, linked.email);
    return { ...linked, firstProductVisit: wasUnlinked };
  }

  const created = await prisma.user.create({
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
  await ensureStudioAccount(created.id, created.email);
  return { ...created, firstProductVisit: true };
}
