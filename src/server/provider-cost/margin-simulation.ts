/** Margin simulation for video unit economics (EUR list prices). */

export const DEFAULT_SALE_PRICES_EUR = [1.99, 2.99, 4.99, 9.99] as const;

/** Reference price for loss-making analysis when no actual sale price is logged. */
export const REFERENCE_SALE_PRICE_EUR = 2.99;

const DEFAULT_EUR_TO_USD = 1.08;

export function resolveEurToUsdRate(): number {
  const raw = process.env.EUR_TO_USD_RATE?.trim();
  if (!raw) {
    return DEFAULT_EUR_TO_USD;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EUR_TO_USD;
}

export type MarginSimulationRow = {
  salePriceEur: number;
  revenueUsd: number;
  costUsd: number;
  marginUsd: number;
  marginPct: number;
  breakEven: boolean;
};

export function simulateMarginAtPrice(
  netCostUsd: number,
  salePriceEur: number,
  eurToUsd = resolveEurToUsdRate()
): MarginSimulationRow {
  const revenueUsd = Math.round(salePriceEur * eurToUsd * 100) / 100;
  const marginUsd = Math.round((revenueUsd - netCostUsd) * 100) / 100;
  const marginPct =
    revenueUsd > 0 ? Math.round((marginUsd / revenueUsd) * 10000) / 100 : 0;
  return {
    salePriceEur,
    revenueUsd,
    costUsd: netCostUsd,
    marginUsd,
    marginPct,
    breakEven: marginUsd >= 0,
  };
}

export function simulateMarginsForPrices(
  netCostUsd: number,
  pricesEur: readonly number[] = DEFAULT_SALE_PRICES_EUR
): MarginSimulationRow[] {
  return pricesEur.map((p) => simulateMarginAtPrice(netCostUsd, p));
}

/** Minimum EUR sale price to break even on net cost. */
export function breakEvenPriceEur(
  netCostUsd: number,
  eurToUsd = resolveEurToUsdRate()
): number {
  if (netCostUsd <= 0) {
    return 0;
  }
  return Math.round((netCostUsd / eurToUsd) * 100) / 100;
}

export type PortfolioMarginSummary = {
  avgNetCostPerVideoUsd: number;
  avgMarginAtReferenceEur: number;
  referenceSalePriceEur: number;
  profitableVideoCount: number;
  lossMakingVideoCount: number;
  breakEvenPriceEur: number;
};

export function summarizePortfolioMargins(
  videoCosts: { netCostUsd: number }[],
  referencePriceEur = REFERENCE_SALE_PRICE_EUR
): PortfolioMarginSummary {
  if (videoCosts.length === 0) {
    return {
      avgNetCostPerVideoUsd: 0,
      avgMarginAtReferenceEur: 0,
      referenceSalePriceEur: referencePriceEur,
      profitableVideoCount: 0,
      lossMakingVideoCount: 0,
      breakEvenPriceEur: 0,
    };
  }

  const totalCost = videoCosts.reduce((s, v) => s + v.netCostUsd, 0);
  const avgNet = Math.round((totalCost / videoCosts.length) * 100) / 100;

  let profitable = 0;
  let lossMaking = 0;
  let marginSum = 0;

  for (const v of videoCosts) {
    const sim = simulateMarginAtPrice(v.netCostUsd, referencePriceEur);
    marginSum += sim.marginUsd;
    if (sim.marginUsd >= 0) {
      profitable += 1;
    } else {
      lossMaking += 1;
    }
  }

  return {
    avgNetCostPerVideoUsd: avgNet,
    avgMarginAtReferenceEur: Math.round((marginSum / videoCosts.length) * 100) / 100,
    referenceSalePriceEur: referencePriceEur,
    profitableVideoCount: profitable,
    lossMakingVideoCount: lossMaking,
    breakEvenPriceEur: breakEvenPriceEur(avgNet),
  };
}
