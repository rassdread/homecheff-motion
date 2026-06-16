import {
  STUDIO_ACTION_COST_REGISTRY,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import { getStudioPlan } from "@/server/studio-account/studio-plan-config";
import type { CarryMode } from "@/types/studio-billing";

export function applyPlanCreditDiscount(baseCredits: number, discountPercent: number): number {
  if (discountPercent <= 0) {
    return baseCredits;
  }
  return Math.max(1, Math.ceil(baseCredits * (1 - discountPercent / 100)));
}

export function resolveRegistryActionCreditCost(input: {
  actionType: string;
  planId?: string;
  overrideCredits?: number;
}): { creditCost: number; discountPercent: number; actionType: string } | null {
  if (!(input.actionType in STUDIO_ACTION_COST_REGISTRY)) {
    return null;
  }
  const registry = STUDIO_ACTION_COST_REGISTRY[input.actionType as StudioActionType];
  const plan = getStudioPlan(input.planId ?? "free");
  const base =
    input.overrideCredits != null && input.overrideCredits > 0
      ? input.overrideCredits
      : registry.defaultCreditCost;
  return {
    actionType: input.actionType,
    creditCost: applyPlanCreditDiscount(base, plan.creditDiscountPercent),
    discountPercent: plan.creditDiscountPercent,
  };
}

export function splitSpendFromBuckets(
  wallet: { promotionalBalance: number; purchasedBalance: number },
  credits: number
): { fromPromotional: number; fromPurchased: number } {
  const fromPromotional = Math.min(wallet.promotionalBalance, credits);
  return { fromPromotional, fromPurchased: credits - fromPromotional };
}

export function carryModeAllowsRetention(carryMode: CarryMode): boolean {
  return carryMode !== "NONE";
}
