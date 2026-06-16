import { prisma } from "@/lib/prisma";
import {
  STUDIO_ACTION_COST_REGISTRY,
  USD_PER_CREDIT,
  estimateMarginUsd,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import { getPlanBenefits } from "@/server/studio-account/studio-billing-policy-service";
import { getStudioSubscriptionPlanBySlug } from "@/server/studio-account/studio-subscription-plan-service";
import type { StudioPricingRuleSnapshot } from "@/types/studio-billing";

export type ResolvedActionCreditCost = {
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  reservedCostUsd: number;
  marginEstimateUsd: number;
  source: "database" | "registry";
  discountPercent: number;
};

export async function resolveActionCreditCost(input: {
  actionType: string;
  planId?: string;
  overrideCredits?: number;
}): Promise<ResolvedActionCreditCost | null> {
  const dbRule = await prisma.studioPricingRule.findUnique({
    where: { actionType: input.actionType },
  });

  const registry =
    input.actionType in STUDIO_ACTION_COST_REGISTRY
      ? STUDIO_ACTION_COST_REGISTRY[input.actionType as StudioActionType]
      : null;

  if (!dbRule?.active && !registry) {
    return null;
  }

  const planBenefits = await getPlanBenefits(input.planId ?? "free");
  const dbPlan = await getStudioSubscriptionPlanBySlug(input.planId ?? "free");
  const discount =
    dbPlan?.source === "database"
      ? dbPlan.discountPercent
      : planBenefits.creditDiscountPercent;

  let baseCredits: number;
  let providerCostUsd: number;
  let reservedCostUsd: number;
  let source: "database" | "registry";

  if (dbRule?.active) {
    baseCredits = dbRule.creditCost;
    providerCostUsd = dbRule.providerCostUsd;
    reservedCostUsd = dbRule.providerCostUsd;
    source = "database";
  } else if (registry) {
    baseCredits = registry.defaultCreditCost;
    providerCostUsd = registry.actualCostEstimateUsd;
    reservedCostUsd = registry.reservedCostUsd;
    source = "registry";
  } else {
    return null;
  }

  if (input.overrideCredits != null && input.overrideCredits > 0) {
    baseCredits = input.overrideCredits;
  }

  const discountedCredits =
    discount > 0
      ? Math.max(1, Math.ceil(baseCredits * (1 - discount / 100)))
      : baseCredits;

  return {
    actionType: input.actionType,
    creditCost: discountedCredits,
    providerCostUsd,
    reservedCostUsd,
    marginEstimateUsd: estimateMarginUsd(reservedCostUsd, discountedCredits),
    source,
    discountPercent: discount,
  };
}

export async function listStudioPricingRules(): Promise<StudioPricingRuleSnapshot[]> {
  const dbRules = await prisma.studioPricingRule.findMany({ orderBy: { actionType: "asc" } });
  const dbMap = new Map(dbRules.map((r) => [r.actionType, r]));

  const merged: StudioPricingRuleSnapshot[] = [];

  for (const actionType of Object.keys(STUDIO_ACTION_COST_REGISTRY)) {
    const registry = STUDIO_ACTION_COST_REGISTRY[actionType as StudioActionType];
    const db = dbMap.get(actionType);
    if (db) {
      merged.push({
        id: db.id,
        actionType: db.actionType,
        creditCost: db.creditCost,
        providerCostUsd: db.providerCostUsd,
        active: db.active,
        notes: db.notes,
        source: "database",
      });
      dbMap.delete(actionType);
    } else {
      merged.push({
        id: `registry_${actionType}`,
        actionType,
        creditCost: registry.defaultCreditCost,
        providerCostUsd: registry.reservedCostUsd,
        active: true,
        notes: "From studio-action-cost-registry",
        source: "registry",
      });
    }
  }

  for (const db of dbMap.values()) {
    merged.push({
      id: db.id,
      actionType: db.actionType,
      creditCost: db.creditCost,
      providerCostUsd: db.providerCostUsd,
      active: db.active,
      notes: db.notes,
      source: "database",
    });
  }

  return merged.sort((a, b) => a.actionType.localeCompare(b.actionType));
}

export async function upsertStudioPricingRule(input: {
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  active?: boolean;
  notes?: string;
}) {
  return prisma.studioPricingRule.upsert({
    where: { actionType: input.actionType },
    create: {
      actionType: input.actionType,
      creditCost: input.creditCost,
      providerCostUsd: input.providerCostUsd,
      active: input.active ?? true,
      notes: input.notes ?? "",
    },
    update: {
      creditCost: input.creditCost,
      providerCostUsd: input.providerCostUsd,
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
}

export function creditCostToCustomerUsd(credits: number): number {
  return Math.round(credits * USD_PER_CREDIT * 10000) / 10000;
}
