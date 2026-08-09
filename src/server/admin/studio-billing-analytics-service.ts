import { prisma } from "@/lib/prisma";
import {
  computeCommercialGrossMargin,
  extractPurchaseMeta,
  sumPackPurchaseRevenueEur,
  type CreditPurchaseRevenueRow,
} from "@/lib/studio-commercial-revenue";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";
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
    packPurchaseRows,
    subscriptionPaymentRows,
    dbPacks,
  ] = await Promise.all([
    prisma.studioWallet.aggregate({
      _sum: { lifetimePurchased: true, lifetimeSpent: true, lifetimeGranted: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { actionType: "credit_purchase" },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: {
        actionType: {
          in: ["promotional_grant", "admin_grant", "bonus_grant", "subscription_grant"],
        },
      },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      where: { actionType: "usage_capture" },
      _sum: { creditsDelta: true },
    }),
    prisma.studioLedgerEntry.aggregate({
      _sum: { providerCostUsd: true },
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
      select: { id: true, metadataJson: true, creditsDelta: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.studioLedgerEntry.findMany({
      where: { actionType: "subscription_payment" },
      select: { id: true, metadataJson: true },
    }),
    prisma.studioCreditPack.findMany({
      select: { slug: true, name: true, priceEur: true },
    }),
  ]);

  const plans = await listStudioSubscriptionPlans();
  const planPriceMap = new Map(plans.map((p) => [p.slug, p.monthlyPriceEur ?? 0]));
  let mrrEur = 0;
  for (const row of planCounts) {
    mrrEur += (planPriceMap.get(row.studioPlan) ?? 0) * row._count;
  }

  const packPriceBySlug = new Map(dbPacks.map((p) => [p.slug, p.priceEur]));
  const purchaseRows: CreditPurchaseRevenueRow[] = packPurchaseRows.map((row) => {
    const meta = extractPurchaseMeta(row.metadataJson);
    return {
      purchaseKey: meta.stripeSessionId ?? `ledger:${row.id}`,
      packSlug: meta.packSlug,
      amountEurFromStripe: meta.amountEur,
      creditsDelta: row.creditsDelta,
    };
  });
  const packSum = sumPackPurchaseRevenueEur(purchaseRows, packPriceBySlug);

  let subscriptionRevenueEur = 0;
  let subscriptionInvoiceCount = 0;
  const seenInvoices = new Set<string>();
  for (const row of subscriptionPaymentRows) {
    const meta = extractPurchaseMeta(row.metadataJson);
    const m =
      row.metadataJson && typeof row.metadataJson === "object" && !Array.isArray(row.metadataJson)
        ? (row.metadataJson as Record<string, unknown>)
        : {};
    const invoiceId =
      typeof m.stripeInvoiceId === "string" && m.stripeInvoiceId.trim()
        ? m.stripeInvoiceId.trim()
        : row.id;
    if (seenInvoices.has(invoiceId)) continue;
    seenInvoices.add(invoiceId);
    const amount =
      typeof m.amountEur === "number" && Number.isFinite(m.amountEur)
        ? m.amountEur
        : meta.amountEur ?? 0;
    subscriptionRevenueEur += amount;
    subscriptionInvoiceCount += 1;
  }
  subscriptionRevenueEur = Math.round(subscriptionRevenueEur * 100) / 100;

  const creditsSold = ledgerPurchases._sum.creditsDelta ?? walletAgg._sum.lifetimePurchased ?? 0;
  const creditsGranted = ledgerGrants._sum.creditsDelta ?? walletAgg._sum.lifetimeGranted ?? 0;
  const creditsConsumed = Math.abs(
    ledgerCaptures._sum.creditsDelta ?? walletAgg._sum.lifetimeSpent ?? 0
  );
  const providerCostUsd = providerCostAgg._sum.providerCostUsd ?? 0;
  const grossRevenueEur = Math.round((packSum.packRevenueEur + subscriptionRevenueEur) * 100) / 100;
  const margin = computeCommercialGrossMargin({
    grossRevenueEur,
    providerCostUsd,
    eurToUsd: resolveEurToUsdRate(),
  });

  const promotionRows = await prisma.studioPromotion.findMany({
    where: { id: { in: topPromotions.map((r) => r.promotionId) } },
    select: { id: true, name: true },
  });
  const promoNameMap = new Map(promotionRows.map((r) => [r.id, r.name]));

  const packSlugCredits = new Map<string, number>();
  const packSlugRevenue = new Map<string, number>();
  const seenPurchaseKeys = new Set<string>();
  for (const row of purchaseRows) {
    if (seenPurchaseKeys.has(row.purchaseKey)) continue;
    seenPurchaseKeys.add(row.purchaseKey);
    const slug = row.packSlug ?? "unknown";
    packSlugCredits.set(slug, (packSlugCredits.get(slug) ?? 0) + row.creditsDelta);
    const resolved = sumPackPurchaseRevenueEur([row], packPriceBySlug);
    packSlugRevenue.set(slug, (packSlugRevenue.get(slug) ?? 0) + resolved.packRevenueEur);
  }
  const packNameMap = new Map(dbPacks.map((p) => [p.slug, p.name]));

  return {
    mrrEur: Math.round(mrrEur * 100) / 100,
    arrEur: Math.round(mrrEur * 12 * 100) / 100,
    creditsSold,
    creditsConsumed,
    creditsGranted,
    providerCostUsd: Math.round(providerCostUsd * 100) / 100,
    providerCostEur: margin.providerCostEur,
    packRevenueEur: packSum.packRevenueEur,
    subscriptionRevenueEur,
    grossRevenueEur,
    netRevenueEur: margin.netRevenueEur,
    grossMarginPercent: margin.grossMarginPercent,
    revenueSource: {
      stripeAmountPurchases: packSum.stripeAmountCount,
      catalogFallbackPurchases: packSum.catalogFallbackCount,
      unresolvedPurchases: packSum.unresolvedCount,
      subscriptionInvoiceCount,
    },
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
    topCreditPacks: [...packSlugCredits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slug, creditsSoldCount]) => ({
        slug,
        name: packNameMap.get(slug) ?? slug,
        creditsSold: creditsSoldCount,
        revenueEur: Math.round((packSlugRevenue.get(slug) ?? 0) * 100) / 100,
      })),
  };
}
