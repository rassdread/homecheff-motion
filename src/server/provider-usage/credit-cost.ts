import { CREDIT_USD } from "@/lib/animation-presets";

/** Official Vidu credit unit price (USD). */
export const CREDIT_UNIT_COST_USD = CREDIT_USD;

export function creditsToTotalCostUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) {
    return 0;
  }
  return Math.round(credits * CREDIT_UNIT_COST_USD * 10000) / 10000;
}

export type CreditAccuracy = "exact" | "estimated" | "pending";

export function resolveCreditAccuracy(row: {
  isEstimated: boolean;
  creditsUsed: number | null;
  completedAt: Date | null | undefined;
}): CreditAccuracy {
  if (row.creditsUsed == null && !row.completedAt) {
    return "pending";
  }
  if (row.isEstimated) {
    return "estimated";
  }
  return "exact";
}
