/**
 * Credit summary after cancelling a render (ProviderCostEvent balance delta).
 */

import { UNIT_COST_USD } from "@/server/provider-cost/cost-event-types";

export type CancelCostEventRow = {
  id: string;
  providerJobId: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  unitsUsed: number | null;
  status: string;
  isEstimated: boolean;
  estimateReason: string | null;
};

export type CancelCreditSummary = {
  creditsUsed: number | null;
  totalCostUsd: number | null;
  costStatus: "known" | "none" | "pending_cost_check";
  isEstimated: boolean;
  estimateReason: string | null;
  events: Array<{
    eventId: string;
    providerJobId: string | null;
    creditsUsed: number | null;
    status: string;
    isEstimated: boolean;
  }>;
};

export const CANCEL_COST_PENDING_REASON =
  "Cancelled before final provider balance check";

export function computeCreditsUsedFromBalances(
  balanceBefore: number | null,
  balanceAfter: number | null
): number | null {
  if (balanceBefore == null || balanceAfter == null) {
    return null;
  }
  const delta = balanceBefore - balanceAfter;
  return delta < 0 ? 0 : delta;
}

export function summarizeCancelCredits(events: CancelCostEventRow[]): CancelCreditSummary {
  if (events.length === 0) {
    return {
      creditsUsed: 0,
      totalCostUsd: 0,
      costStatus: "none",
      isEstimated: false,
      estimateReason: null,
      events: [],
    };
  }

  let totalCredits: number | null = 0;
  let anyPending = false;
  let anyEstimated = false;
  let estimateReason: string | null = null;

  const mapped = events.map((row) => {
    const creditsUsed =
      row.unitsUsed != null ?
        row.unitsUsed
      : computeCreditsUsedFromBalances(row.balanceBefore, row.balanceAfter);

    if (row.status === "pending_cost_check") {
      anyPending = true;
    }
    if (row.isEstimated) {
      anyEstimated = true;
      estimateReason = row.estimateReason ?? estimateReason;
    }

    if (creditsUsed == null) {
      totalCredits = null;
    } else if (totalCredits != null) {
      totalCredits += creditsUsed;
    }

    return {
      eventId: row.id,
      providerJobId: row.providerJobId,
      creditsUsed,
      status: row.status,
      isEstimated: row.isEstimated,
    };
  });

  const costStatus =
    anyPending ? "pending_cost_check"
    : totalCredits == null ? "pending_cost_check"
    : totalCredits === 0 ? "none"
    : "known";

  return {
    creditsUsed: totalCredits,
    totalCostUsd:
      totalCredits != null ? totalCredits * UNIT_COST_USD.vidu_credit : null,
    costStatus,
    isEstimated: anyEstimated || costStatus === "pending_cost_check",
    estimateReason:
      costStatus === "pending_cost_check" ?
        estimateReason ?? CANCEL_COST_PENDING_REASON
      : estimateReason,
    events: mapped,
  };
}
