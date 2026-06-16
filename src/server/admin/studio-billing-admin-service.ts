import { prisma } from "@/lib/prisma";
import { adminAdjustCredits } from "@/server/studio-account/studio-wallet-service";
import { loadStudioBillingPolicy, patchStudioBillingPolicy } from "@/server/studio-account/studio-billing-policy-service";
import {
  createStudioPromotion,
  listStudioPromotions,
  updateStudioPromotion,
} from "@/server/studio-account/studio-promotion-service";
import {
  listStudioPricingRules,
  upsertStudioPricingRule,
} from "@/server/studio-account/studio-pricing-rule-service";
import { getPlanBenefits } from "@/server/studio-account/studio-billing-policy-service";
import type { AdminUserBillingSnapshot, CreditOriginType } from "@/types/studio-billing";
import { mapWalletSnapshot } from "@/server/studio-account/studio-wallet-service";

export async function searchBillingUsers(query: string, limit = 20) {
  const q = query.trim();
  if (!q) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      email: { contains: q, mode: "insensitive" },
    },
    take: limit,
    include: {
      studioAccount: true,
      studioWallet: true,
      _count: { select: { homeCheffProjects: true, animationProjects: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return users.map((user) => ({
    userId: user.id,
    email: user.email,
    plan: user.studioAccount?.studioPlan ?? "free",
    billingStatus: user.studioAccount?.billingStatus ?? "none",
    wallet: user.studioWallet
      ? {
          balance: user.studioWallet.balance,
          purchasedBalance: user.studioWallet.purchasedBalance,
          promotionalBalance: user.studioWallet.promotionalBalance,
          reservedBalance: user.studioWallet.reservedBalance,
          lifetimePurchased: user.studioWallet.lifetimePurchased,
          lifetimeGranted: user.studioWallet.lifetimeGranted,
          lifetimeSpent: user.studioWallet.lifetimeSpent,
        }
      : null,
    projectCount: user._count.homeCheffProjects + user._count.animationProjects,
    lastActivity: user.updatedAt.toISOString(),
  }));
}

export async function adminGrantUserCredits(input: {
  userId: string;
  credits: number;
  adminUserId: string;
  reason: string;
  creditOrigin?: CreditOriginType;
}) {
  return adminAdjustCredits({
    userId: input.userId,
    creditsDelta: input.credits,
    adminUserId: input.adminUserId,
    reason: input.reason,
    creditOrigin: input.creditOrigin ?? "MANUAL_GRANT",
  });
}

export async function adminRemoveUserCredits(input: {
  userId: string;
  credits: number;
  adminUserId: string;
  reason: string;
}) {
  return adminAdjustCredits({
    userId: input.userId,
    creditsDelta: -Math.abs(input.credits),
    adminUserId: input.adminUserId,
    reason: input.reason,
    creditOrigin: "MANUAL_GRANT",
  });
}

export async function loadUserBillingDetail(userId: string): Promise<AdminUserBillingSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studioAccount: true,
      studioWallet: true,
    },
  });
  if (!user) {
    return null;
  }

  const [ledger, promotionsRedeemed, promoCodesUsed, costAgg] = await Promise.all([
    prisma.studioLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.studioPromotionRedemption.findMany({
      where: { userId },
      include: { promotion: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.studioPromoCodeRedemption.findMany({
      where: { userId },
      include: { promoCode: { select: { code: true } } },
      orderBy: { appliedAt: "desc" },
      take: 20,
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { userId, actionType: "usage_capture" },
      _sum: { providerCostUsd: true, marginEstimate: true },
    }),
  ]);

  return {
    userId: user.id,
    email: user.email,
    plan: user.studioAccount?.studioPlan ?? "free",
    billingStatus: user.studioAccount?.billingStatus ?? "none",
    wallet: user.studioWallet ? mapWalletSnapshot(user.studioWallet) : null,
    ledger: ledger.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      creditsDelta: row.creditsDelta,
      balanceAfter: row.balanceAfter,
      creditOrigin: row.creditOrigin,
      createdAt: row.createdAt.toISOString(),
    })),
    promotionsRedeemed: promotionsRedeemed.map((row) => ({
      name: row.promotion.name,
      creditsGranted: row.creditsGranted,
      createdAt: row.createdAt.toISOString(),
    })),
    promoCodesUsed: promoCodesUsed.map((row) => ({
      code: row.promoCode.code,
      appliedAt: row.appliedAt.toISOString(),
    })),
    totalSpentCredits: user.studioWallet?.lifetimeSpent ?? 0,
    providerCostUsd: costAgg._sum.providerCostUsd ?? 0,
    marginEstimateUsd: costAgg._sum.marginEstimate ?? 0,
  };
}

export async function loadAdminBillingOverview() {
  const [policy, promotions, pricingRules, wallets] = await Promise.all([
    loadStudioBillingPolicy(),
    listStudioPromotions(),
    listStudioPricingRules(),
    prisma.studioWallet.aggregate({
      _sum: {
        balance: true,
        purchasedBalance: true,
        promotionalBalance: true,
        reservedBalance: true,
        lifetimeSpent: true,
        lifetimePurchased: true,
        lifetimeGranted: true,
      },
      _count: true,
    }),
  ]);

  const topSpenders = await prisma.studioWallet.findMany({
    orderBy: { lifetimeSpent: "desc" },
    take: 8,
    include: { user: { select: { email: true } } },
  });

  const recentLedger = await prisma.studioLedgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { email: true } } },
  });

  return {
    policy,
    promotions,
    pricingRules,
    totals: {
      wallets: wallets._count,
      balance: wallets._sum.balance ?? 0,
      purchasedBalance: wallets._sum.purchasedBalance ?? 0,
      promotionalBalance: wallets._sum.promotionalBalance ?? 0,
      reservedBalance: wallets._sum.reservedBalance ?? 0,
      lifetimeSpent: wallets._sum.lifetimeSpent ?? 0,
      lifetimePurchased: wallets._sum.lifetimePurchased ?? 0,
      lifetimeGranted: wallets._sum.lifetimeGranted ?? 0,
    },
    topSpenders: topSpenders.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      lifetimeSpent: row.lifetimeSpent,
      balance: row.balance,
    })),
    recentLedger: recentLedger.map((row) => ({
      id: row.id,
      email: row.user.email,
      actionType: row.actionType,
      creditsDelta: row.creditsDelta,
      creditOrigin: row.creditOrigin,
      createdAt: row.createdAt.toISOString(),
    })),
    planBenefits: {
      creator: await getPlanBenefits("creator"),
      pro: await getPlanBenefits("pro"),
      studio: await getPlanBenefits("studio"),
    },
  };
}

export {
  patchStudioBillingPolicy,
  createStudioPromotion,
  updateStudioPromotion,
  upsertStudioPricingRule,
};
