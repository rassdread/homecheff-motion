import { prisma } from "@/lib/prisma";
import { USD_PER_CREDIT } from "@/server/studio-account/studio-action-cost-registry";
import { listStudioSubscriptionPlans } from "@/server/studio-account/studio-subscription-plan-service";
import type { BillingAnalyticsSnapshot } from "@/types/studio-billing";

export async function loadBillingAnalytics(): Promise<BillingAnalyticsSnapshot> {
  const [
    walletAgg,
    ledgerPurchases,
    ledgerGrants,
    ledgerCaptures,
    providerCostAgg,
    activeSubs,
    churnedSubs,
    topPromotions,
    planCounts,
    packPurchases,
  ] = await Promise.all([
    prisma.studioWallet.aggregate({
      _sum: { lifetimePurchased: true, lifetimeSpent: true, lifetimeGranted: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { actionType: "credit_purchase" },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { actionType: { in: ["promotional_grant", "admin_grant", "bonus_grant", "subscription_grant"] } },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { actionType: "usage_capture" },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      _sum: { providerCostUsd: true, marginEstimate: true },
    }),
    prisma.studioAccount.count({ where: { billingStatus: "active" } }),
    prisma.studioAccount.count({ where: { billingStatus: { in: ["canceled", "prepaid"] } } }),
    prisma.studioPromotionRedemption.groupBy({
      by: ["promotionId"],
      _count: true,
      _sum: { creditsGranted: true },
      orderBy: { _count: { promotionId: "desc" } },
      take: 5,
    }),
    prisma.studioAccount.groupBy({
      by: ["studioPlan"],
      _count: true,
      orderBy: { _count: { studioPlan: "desc" } },
      take: 5,
    }),
    prisma.studioLedgerEntry.findMany({
      where: { actionType: "credit_purchase" },
      select: { metadataJson: true, creditsDelta: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const plans = await listStudioSubscriptionPlans();
  const planPriceMap = new Map(plans.map((p) => [p.slug, p.monthlyPriceEur ?? 0]));
  let mrrEur = 0;
  for (const row of planCounts) {
    mrrEur += (planPriceMap.get(row.studioPlan) ?? 0) * row._count;
  }

  const creditsSold = ledgerPurchases._sum.creditsDelta ?? walletAgg._sum.lifetimePurchased ?? 0;
  const creditsGranted = ledgerGrants._sum.creditsDelta ?? walletAgg._sum.lifetimeGranted ?? 0;
  const creditsConsumed = Math.abs(ledgerCaptures._sum.creditsDelta ?? walletAgg._sum.lifetimeSpent ?? 0);
  const providerCostUsd = providerCostAgg._sum.providerCostUsd ?? 0;
  const grossRevenueEur = Math.round(creditsSold * USD_PER_CREDIT * 100) / 100;
  const netRevenueEur = Math.round((grossRevenueEur - providerCostUsd) * 100) / 100;
  const grossMarginPercent =
    grossRevenueEur > 0
      ? Math.round(((grossRevenueEur - providerCostUsd) / grossRevenueEur) * 10000) / 100
      : 0;

  const promotionRows = await prisma.studioPromotion.findMany({
    where: { id: { in: topPromotions.map((r) => r.promotionId) } },
    select: { id: true, name: true },
  });
  const promoNameMap = new Map(promotionRows.map((r) => [r.id, r.name]));

  const packSlugCounts = new Map<string, number>();
  for (const row of packPurchases) {
    const meta = row.metadataJson as { packId?: string; packSlug?: string };
    const slug = meta.packSlug ?? meta.packId ?? "unknown";
    packSlugCounts.set(slug, (packSlugCounts.get(slug) ?? 0) + row.creditsDelta);
  }

  const dbPacks = await prisma.studioCreditPack.findMany({ select: { slug: true, name: true } });
  const packNameMap = new Map(dbPacks.map((p) => [p.slug, p.name]));

  return {
    mrrEur: Math.round(mrrEur * 100) / 100,
    arrEur: Math.round(mrrEur * 12 * 100) / 100,
    creditsSold,
    creditsConsumed,
    creditsGranted,
    providerCostUsd: Math.round(providerCostUsd * 100) / 100,
    grossRevenueEur,
    netRevenueEur,
    grossMarginPercent,
    activeSubscriptions: activeSubs,
    churnedSubscriptions: churnedSubs,
    topPromotions: topPromotions.map((row) => ({
      name: promoNameMap.get(row.promotionId) ?? row.promotionId,
      redemptions: row._count,
      creditsGranted: row._sum.creditsGranted ?? 0,
    })),
    topPlans: planCounts.map((row) => ({
      slug: row.studioPlan,
      name: row.studioPlan,
      subscribers: row._count,
    })),
    topCreditPacks: [...packSlugCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug, creditsSoldCount]) => ({
        slug,
        name: packNameMap.get(slug) ?? slug,
        creditsSold: creditsSoldCount,
      })),
  };
}
