import {
  STUDIO_ACTION_COST_REGISTRY,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import { getStudioPlan } from "@/server/studio-account/studio-plan-config";
import { resolveCatalogCreditCostSync } from "@/server/studio-account/studio-pricing-rule-service";
import type { CarryMode } from "@/types/studio-billing";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

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
  pricingCatalog?: StudioPricingCatalogPublicEntry[];
}): { creditCost: number; discountPercent: number; actionType: string } | null {
  const plan = getStudioPlan(input.planId ?? "free");

  if (input.pricingCatalog?.length) {
    const base = resolveCatalogCreditCostSync({
      catalog: input.pricingCatalog,
      actionType: input.actionType,
      planId: input.planId,
      overrideCredits: input.overrideCredits,
    });
    if (base != null) {
      return {
        actionType: input.actionType,
        creditCost: applyPlanCreditDiscount(base, plan.creditDiscountPercent),
        discountPercent: plan.creditDiscountPercent,
      };
    }
  }

  if (!(input.actionType in STUDIO_ACTION_COST_REGISTRY)) {
    return null;
  }
  const registry = STUDIO_ACTION_COST_REGISTRY[input.actionType as StudioActionType];
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
