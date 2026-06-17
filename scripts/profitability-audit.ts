/**
 * Studio profitability audit CLI.
 * Run: npm run audit:profitability
 */

import { STUDIO_ACTION_COST_REGISTRY, listAllActionCosts } from "@/server/studio-account/studio-action-cost-registry";
import { STUDIO_CREDIT_PACKS } from "@/server/studio-account/studio-credit-packs";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";
import {
  classifyMarginPercent,
  computeActionPricingProfitability,
  getWorstPackEurPerCredit,
} from "@/lib/studio-pricing-profitability";

type AuditStatus = "SAFE" | "WARNING" | "CRITICAL";

function overallStatus(counts: Record<string, number>): AuditStatus {
  if (counts.CRITICAL > 0 || counts.NEGATIVE_MARGIN > 0) return "CRITICAL";
  if (counts.LOW_MARGIN > 0) return "WARNING";
  return "SAFE";
}

function main() {
  const eurPerCredit = getWorstPackEurPerCredit();
  const actionRows = listAllActionCosts().map((entry) => {
    const profitability = computeActionPricingProfitability({
      creditCost: entry.defaultCreditCost,
      providerCostUsd: entry.actualCostEstimateUsd,
      eurPerCredit,
    });
    return {
      actionType: entry.actionType,
      credits: entry.defaultCreditCost,
      providerCostUsd: entry.actualCostEstimateUsd,
      ...profitability,
    };
  });

  const actionCounts = { SAFE: 0, LOW_MARGIN: 0, NEGATIVE_MARGIN: 0, CRITICAL: 0 };
  for (const row of actionRows) {
    actionCounts[row.status] += 1;
  }

  const packRows = STUDIO_CREDIT_PACKS.map((pack) => ({
    packId: pack.id,
    credits: pack.credits,
    priceEur: pack.priceEur,
    eurPerCredit: Math.round((pack.priceEur / pack.credits) * 1000000) / 1000000,
    marginVsListPrice:
      pack.priceEur / pack.credits > eurPerCredit ? "above_worst" : "at_or_below_worst",
  }));

  const subscriptionRows = Object.values(STUDIO_PLANS)
    .filter((p) => (p.monthlyPriceEur ?? 0) > 0)
    .map((plan) => ({
      planId: plan.id,
      monthlyPriceEur: plan.monthlyPriceEur,
      monthlyCredits: plan.monthlyCredits,
      creditDiscountPercent: plan.creditDiscountPercent,
      note:
        plan.monthlyCredits > 0
          ? "includes monthly credits"
          : "discount-only subscription",
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    worstPackEurPerCredit: eurPerCredit,
    actionProfitability: {
      status: overallStatus(actionCounts),
      counts: actionCounts,
      criticalActions: actionRows.filter(
        (r) => r.status === "CRITICAL" || r.status === "NEGATIVE_MARGIN"
      ),
      lowMarginActions: actionRows.filter((r) => r.status === "LOW_MARGIN"),
    },
    packProfitability: {
      status: "SAFE" as AuditStatus,
      packs: packRows,
    },
    subscriptionProfitability: {
      status: "SAFE" as AuditStatus,
      plans: subscriptionRows,
    },
    promotionExposure: {
      status: "WARNING" as AuditStatus,
      note: "Review active StudioPromotion rows in admin before launch campaigns.",
    },
    registryVoiceClone: STUDIO_ACTION_COST_REGISTRY.voice_clone.defaultCreditCost,
  };

  console.log(JSON.stringify(report, null, 2));

  const exitCode =
    report.actionProfitability.status === "CRITICAL" ? 1 : 0;
  process.exit(exitCode);
}

main();
