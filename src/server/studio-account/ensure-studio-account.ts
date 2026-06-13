import { prisma } from "@/lib/prisma";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";
import type {
  StudioAccountSnapshot,
  StudioAccountType,
  StudioBillingStatus,
} from "@/types/studio-account";

export async function ensureStudioAccount(
  userId: string,
  email: string
): Promise<StudioAccountSnapshot> {
  let account = await prisma.studioAccount.findUnique({ where: { userId } });
  if (!account) {
    account = await prisma.studioAccount.create({
      data: {
        userId,
        accountType: "free",
        studioPlan: "free",
        activatedAt: new Date(),
      },
    });
    await ensureStudioWallet(userId);
  }

  return mapAccountSnapshot(account, email);
}

function mapAccountSnapshot(
  row: {
    userId: string;
    accountType: string;
    studioPlan: string;
    planVersion: string;
    creditPolicyVersion: string;
    accountStatus: string;
    billingStatus: string;
    activatedAt: Date | null;
    autoChargeSmallActions: boolean;
    confirmAboveCredits: number;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
  },
  email: string
): StudioAccountSnapshot {
  return {
    userId: row.userId,
    email,
    accountType: row.accountType as StudioAccountType,
    studioPlan: row.studioPlan,
    planVersion: row.planVersion,
    creditPolicyVersion: row.creditPolicyVersion,
    accountStatus: row.accountStatus as StudioAccountSnapshot["accountStatus"],
    billingStatus: row.billingStatus as StudioBillingStatus,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    autoChargeSmallActions: row.autoChargeSmallActions,
    confirmAboveCredits: row.confirmAboveCredits,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function updateStudioAccountPlan(input: {
  userId: string;
  planId: string;
  billingStatus?: StudioBillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const plan = STUDIO_PLANS[input.planId as keyof typeof STUDIO_PLANS] ?? STUDIO_PLANS.free;
  await prisma.studioAccount.update({
    where: { userId: input.userId },
    data: {
      accountType: plan.accountType,
      studioPlan: plan.id,
      planVersion: plan.planVersion,
      creditPolicyVersion: plan.creditPolicyVersion,
      ...(input.billingStatus ? { billingStatus: input.billingStatus } : {}),
      ...(input.stripeCustomerId !== undefined ? { stripeCustomerId: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: input.stripeSubscriptionId }
        : {}),
      ...(input.stripePriceId !== undefined ? { stripePriceId: input.stripePriceId } : {}),
      ...(input.currentPeriodStart !== undefined
        ? { currentPeriodStart: input.currentPeriodStart }
        : {}),
      ...(input.currentPeriodEnd !== undefined ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
      ...(input.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
        : {}),
    },
  });
}

export async function patchStudioCreditSettings(
  userId: string,
  patch: { autoChargeSmallActions?: boolean; confirmAboveCredits?: number }
): Promise<void> {
  await prisma.studioAccount.update({
    where: { userId },
    data: {
      ...(patch.autoChargeSmallActions !== undefined
        ? { autoChargeSmallActions: patch.autoChargeSmallActions }
        : {}),
      ...(patch.confirmAboveCredits !== undefined
        ? { confirmAboveCredits: Math.max(1, Math.min(10000, patch.confirmAboveCredits)) }
        : {}),
    },
  });
}
