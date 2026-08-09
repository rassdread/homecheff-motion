/**
 * SHARED_PURE — Resolve commercial EUR from Stripe checkout / pack catalog.
 * Never derive customer revenue from credits × USD_PER_CREDIT.
 */

export type PackPriceLookup = {
  slug: string;
  priceEur: number;
};

export type CreditPurchaseRevenueRow = {
  /** Unique checkout / grant key — prefer stripeSessionId */
  purchaseKey: string;
  packSlug: string | null;
  /** From Stripe session.amount_total when recorded */
  amountEurFromStripe: number | null;
  creditsDelta: number;
};

export type ResolvedPurchaseRevenue = {
  purchaseKey: string;
  packSlug: string | null;
  amountEur: number;
  source: "stripe_amount" | "pack_catalog" | "unresolved";
};

/**
 * Resolve one credit_purchase to commercial EUR.
 * Prefer Stripe amount_total; else pack catalog list price (pre-discount fallback).
 */
export function resolveCreditPurchaseRevenueEur(
  row: CreditPurchaseRevenueRow,
  packPriceBySlug: Map<string, number>
): ResolvedPurchaseRevenue {
  if (row.amountEurFromStripe != null && Number.isFinite(row.amountEurFromStripe) && row.amountEurFromStripe >= 0) {
    return {
      purchaseKey: row.purchaseKey,
      packSlug: row.packSlug,
      amountEur: Math.round(row.amountEurFromStripe * 100) / 100,
      source: "stripe_amount",
    };
  }
  const slug = row.packSlug?.trim() || "";
  const catalog = slug ? packPriceBySlug.get(slug) : undefined;
  if (catalog != null && Number.isFinite(catalog) && catalog >= 0) {
    return {
      purchaseKey: row.purchaseKey,
      packSlug: row.packSlug,
      amountEur: Math.round(catalog * 100) / 100,
      source: "pack_catalog",
    };
  }
  return {
    purchaseKey: row.purchaseKey,
    packSlug: row.packSlug,
    amountEur: 0,
    source: "unresolved",
  };
}

/** Dedupe by purchaseKey (stripe session) — one Checkout = one commercial event. */
export function sumPackPurchaseRevenueEur(
  rows: CreditPurchaseRevenueRow[],
  packPriceBySlug: Map<string, number>
): {
  packRevenueEur: number;
  purchaseCount: number;
  stripeAmountCount: number;
  catalogFallbackCount: number;
  unresolvedCount: number;
} {
  const seen = new Set<string>();
  let packRevenueEur = 0;
  let purchaseCount = 0;
  let stripeAmountCount = 0;
  let catalogFallbackCount = 0;
  let unresolvedCount = 0;

  for (const row of rows) {
    if (seen.has(row.purchaseKey)) continue;
    seen.add(row.purchaseKey);
    const resolved = resolveCreditPurchaseRevenueEur(row, packPriceBySlug);
    purchaseCount += 1;
    packRevenueEur += resolved.amountEur;
    if (resolved.source === "stripe_amount") stripeAmountCount += 1;
    else if (resolved.source === "pack_catalog") catalogFallbackCount += 1;
    else unresolvedCount += 1;
  }

  return {
    packRevenueEur: Math.round(packRevenueEur * 100) / 100,
    purchaseCount,
    stripeAmountCount,
    catalogFallbackCount,
    unresolvedCount,
  };
}

export function extractPurchaseMeta(metadata: unknown): {
  stripeSessionId: string | null;
  packSlug: string | null;
  amountEur: number | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { stripeSessionId: null, packSlug: null, amountEur: null };
  }
  const m = metadata as Record<string, unknown>;
  const stripeSessionId =
    typeof m.stripeSessionId === "string" && m.stripeSessionId.trim()
      ? m.stripeSessionId.trim()
      : null;
  const packSlugRaw = m.packSlug ?? m.packId;
  const packSlug =
    typeof packSlugRaw === "string" && packSlugRaw.trim() ? packSlugRaw.trim() : null;
  let amountEur: number | null = null;
  if (typeof m.amountEur === "number" && Number.isFinite(m.amountEur)) {
    amountEur = m.amountEur;
  } else if (typeof m.amountEur === "string" && m.amountEur.trim()) {
    const n = Number(m.amountEur);
    if (Number.isFinite(n)) amountEur = n;
  } else if (typeof m.amountTotalCents === "number" && Number.isFinite(m.amountTotalCents)) {
    amountEur = m.amountTotalCents / 100;
  }
  return { stripeSessionId, packSlug, amountEur };
}

/** Stripe amount_total is in the smallest currency unit (cents for EUR). */
export function stripeAmountTotalToEur(amountTotal: number | null | undefined): number | null {
  if (amountTotal == null || !Number.isFinite(amountTotal) || amountTotal < 0) return null;
  return Math.round(amountTotal) / 100;
}

export function computeCommercialGrossMargin(input: {
  grossRevenueEur: number;
  providerCostUsd: number;
  eurToUsd: number;
}): { providerCostEur: number; netRevenueEur: number; grossMarginPercent: number } {
  const fx = input.eurToUsd > 0 ? input.eurToUsd : 1.08;
  const providerCostEur = Math.round((input.providerCostUsd / fx) * 100) / 100;
  const netRevenueEur = Math.round((input.grossRevenueEur - providerCostEur) * 100) / 100;
  const grossMarginPercent =
    input.grossRevenueEur > 0
      ? Math.round(((input.grossRevenueEur - providerCostEur) / input.grossRevenueEur) * 10000) / 100
      : 0;
  return { providerCostEur, netRevenueEur, grossMarginPercent };
}
