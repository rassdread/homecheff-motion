import { STUDIO_CREDIT_PACKS } from "@/server/studio-account/studio-credit-packs";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";

export type PricingProfitabilityStatus =
  | "SAFE"
  | "LOW_MARGIN"
  | "NEGATIVE_MARGIN"
  | "CRITICAL";

export type ActionPricingProfitability = {
  status: PricingProfitabilityStatus;
  revenueEur: number;
  costEur: number;
  marginEur: number;
  marginPercent: number;
  eurPerCredit: number;
};

/** Worst-case €/credit from the largest credit pack (lowest unit value). */
export function getWorstPackEurPerCredit(): number {
  return STUDIO_CREDIT_PACKS.reduce(
    (worst, pack) => Math.min(worst, pack.priceEur / pack.credits),
    Number.POSITIVE_INFINITY
  );
}

export function classifyMarginPercent(marginPercent: number): PricingProfitabilityStatus {
  if (marginPercent < 0) {
    return marginPercent < -50 ? "CRITICAL" : "NEGATIVE_MARGIN";
  }
  if (marginPercent < 60) {
    return "LOW_MARGIN";
  }
  return "SAFE";
}

export function computeActionPricingProfitability(input: {
  creditCost: number;
  providerCostUsd: number;
  eurPerCredit?: number;
  eurToUsd?: number;
}): ActionPricingProfitability {
  const eurPerCredit = input.eurPerCredit ?? getWorstPackEurPerCredit();
  const eurToUsd = input.eurToUsd ?? resolveEurToUsdRate();
  const revenueEur = Math.round(input.creditCost * eurPerCredit * 10000) / 10000;
  const costEur = Math.round((input.providerCostUsd / eurToUsd) * 10000) / 10000;
  const marginEur = Math.round((revenueEur - costEur) * 10000) / 10000;
  const marginPercent =
    revenueEur > 0 ? Math.round((marginEur / revenueEur) * 10000) / 100 : 0;

  return {
    status: classifyMarginPercent(marginPercent),
    revenueEur,
    costEur,
    marginEur,
    marginPercent,
    eurPerCredit,
  };
}
