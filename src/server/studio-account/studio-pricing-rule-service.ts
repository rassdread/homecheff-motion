import { prisma } from "@/lib/prisma";
import {
  getPricingCatalogMeta,
  type PricingCatalogCategory,
} from "@/lib/studio-pricing-catalog-meta";
import {
  STUDIO_ACTION_COST_REGISTRY,
  USD_PER_CREDIT,
  estimateMarginUsd,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import { computeActionPricingProfitability } from "@/lib/studio-pricing-profitability";
import { getPlanBenefits } from "@/server/studio-account/studio-billing-policy-service";
import { getStudioSubscriptionPlanBySlug } from "@/server/studio-account/studio-subscription-plan-service";
import type { StudioPricingRuleSnapshot } from "@/types/studio-billing";
import type {
  StudioPricingCatalogAdminEntry,
  StudioPricingCatalogPublicEntry,
  StudioPricingRuleUpdateInput,
} from "@/types/studio-pricing-catalog";

export type ResolvedActionCreditCost = {
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  reservedCostUsd: number;
  marginEstimateUsd: number;
  source: "database" | "registry";
  discountPercent: number;
};

type DbPricingRule = {
  id: string;
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  active: boolean;
  notes: string;
  category: string | null;
  displayNameNl: string | null;
  displayNameEn: string | null;
  descriptionNl: string | null;
  descriptionEn: string | null;
  visibleInCatalog: boolean;
  sortOrder: number;
  provider: string | null;
  marginWarningThreshold: number;
  updatedByUserId: string | null;
  updatedAt: Date;
};

function registryEntry(actionType: string) {
  return actionType in STUDIO_ACTION_COST_REGISTRY
    ? STUDIO_ACTION_COST_REGISTRY[actionType as StudioActionType]
    : null;
}

function mergeAdminEntry(db: DbPricingRule | null, actionType: string): StudioPricingCatalogAdminEntry | null {
  const registry = registryEntry(actionType);
  const meta = getPricingCatalogMeta(actionType);
  if (!registry && !db) {
    return null;
  }

  const category = (db?.category ?? meta?.category ?? "utility") as PricingCatalogCategory;
  const creditCost = db?.creditCost ?? registry?.defaultCreditCost ?? 0;
  const providerCostUsd = db?.providerCostUsd ?? registry?.reservedCostUsd ?? 0;
  const estimatedProviderCostUsd = registry?.actualCostEstimateUsd ?? providerCostUsd;
  const marginEstimateUsd = estimateMarginUsd(providerCostUsd, creditCost);
  const profitability = computeActionPricingProfitability({
    creditCost,
    providerCostUsd: estimatedProviderCostUsd,
  });
  const threshold = db?.marginWarningThreshold ?? 0;

  return {
    id: db?.id ?? `registry_${actionType}`,
    actionType,
    category,
    displayNameNl: db?.displayNameNl ?? meta?.displayNameNl ?? actionType,
    displayNameEn: db?.displayNameEn ?? meta?.displayNameEn ?? actionType,
    descriptionNl: db?.descriptionNl ?? meta?.descriptionNl ?? "",
    descriptionEn: db?.descriptionEn ?? meta?.descriptionEn ?? "",
    creditCost,
    providerCostUsd,
    estimatedProviderCostUsd,
    marginEstimateUsd,
    marginWarning: marginEstimateUsd < threshold,
    profitabilityStatus: profitability.status,
    revenueEur: profitability.revenueEur,
    costEur: profitability.costEur,
    marginEur: profitability.marginEur,
    marginPercent: profitability.marginPercent,
    provider: db?.provider ?? registry?.provider ?? "internal",
    active: db ? db.active : true,
    isFree: meta?.isFree ?? creditCost <= 0,
    visibleInCatalog: db?.visibleInCatalog ?? meta?.visibleInCatalog ?? true,
    sortOrder: db?.sortOrder ?? meta?.sortOrder ?? 999,
    notes: db?.notes ?? "",
    source: db ? "database" : "registry",
    registryDefaultCreditCost: registry?.defaultCreditCost ?? creditCost,
    registryDefaultProviderCostUsd: registry?.reservedCostUsd ?? providerCostUsd,
    updatedAt: db?.updatedAt.toISOString() ?? null,
    updatedByUserId: db?.updatedByUserId ?? null,
  };
}

export async function resolveActionCreditCost(input: {
  actionType: string;
  planId?: string;
  overrideCredits?: number;
}): Promise<ResolvedActionCreditCost | null> {
  const dbRule = await prisma.studioPricingRule.findUnique({
    where: { actionType: input.actionType },
  });
  const registry = registryEntry(input.actionType);

  if (dbRule && !dbRule.active) {
    return null;
  }

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

export async function listStudioPricingCatalogAdmin(): Promise<StudioPricingCatalogAdminEntry[]> {
  const dbRules = await prisma.studioPricingRule.findMany({ orderBy: { actionType: "asc" } });
  const dbMap = new Map(dbRules.map((r) => [r.actionType, r as DbPricingRule]));

  const actionTypes = new Set<string>([
    ...Object.keys(STUDIO_ACTION_COST_REGISTRY),
    ...dbRules.map((r) => r.actionType),
  ]);

  const merged: StudioPricingCatalogAdminEntry[] = [];
  for (const actionType of actionTypes) {
    const entry = mergeAdminEntry(dbMap.get(actionType) ?? null, actionType);
    if (entry) {
      merged.push(entry);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.actionType.localeCompare(b.actionType));
}

export async function listPublicPricingCatalog(locale?: string): Promise<StudioPricingCatalogPublicEntry[]> {
  const admin = await listStudioPricingCatalogAdmin();
  const nl = !locale || locale.startsWith("nl");

  return admin
    .filter((row) => row.active && row.visibleInCatalog)
    .map((row) => ({
      actionType: row.actionType,
      category: row.category,
      displayName: nl ? row.displayNameNl : row.displayNameEn,
      description: nl ? row.descriptionNl : row.descriptionEn,
      creditCost: row.creditCost,
      sortOrder: row.sortOrder,
      isFree: row.isFree,
    }));
}

export async function listStudioPricingRules(): Promise<StudioPricingRuleSnapshot[]> {
  const catalog = await listStudioPricingCatalogAdmin();
  return catalog.map((row) => ({
    id: row.id,
    actionType: row.actionType,
    creditCost: row.creditCost,
    providerCostUsd: row.providerCostUsd,
    active: row.active,
    notes: row.notes,
    source: row.source,
  }));
}

export async function updateStudioPricingCatalogRule(
  actionType: string,
  input: StudioPricingRuleUpdateInput,
  updatedByUserId?: string | null
): Promise<StudioPricingCatalogAdminEntry | null> {
  const registry = registryEntry(actionType);
  const meta = getPricingCatalogMeta(actionType);
  if (!registry && !input.restoreDefaults) {
    const existing = await prisma.studioPricingRule.findUnique({ where: { actionType } });
    if (!existing) {
      return null;
    }
  }

  if (input.restoreDefaults) {
    await prisma.studioPricingRule.deleteMany({ where: { actionType } });
    return mergeAdminEntry(null, actionType);
  }

  const defaults = mergeAdminEntry(null, actionType);
  if (!defaults && !registry) {
    return null;
  }

  const row = await prisma.studioPricingRule.upsert({
    where: { actionType },
    create: {
      actionType,
      creditCost: input.creditCost ?? defaults?.registryDefaultCreditCost ?? registry!.defaultCreditCost,
      providerCostUsd:
        input.providerCostUsd ?? defaults?.registryDefaultProviderCostUsd ?? registry!.reservedCostUsd,
      active: input.active ?? true,
      notes: input.notes ?? "",
      category: input.category ?? defaults?.category ?? meta?.category ?? "utility",
      displayNameNl: input.displayNameNl ?? defaults?.displayNameNl ?? null,
      displayNameEn: input.displayNameEn ?? defaults?.displayNameEn ?? null,
      descriptionNl: input.descriptionNl ?? defaults?.descriptionNl ?? null,
      descriptionEn: input.descriptionEn ?? defaults?.descriptionEn ?? null,
      visibleInCatalog: input.visibleInCatalog ?? defaults?.visibleInCatalog ?? true,
      sortOrder: input.sortOrder ?? defaults?.sortOrder ?? 999,
      provider: input.provider ?? defaults?.provider ?? registry?.provider ?? null,
      marginWarningThreshold: input.marginWarningThreshold ?? 0,
      updatedByUserId: updatedByUserId ?? null,
    },
    update: {
      ...(input.creditCost !== undefined ? { creditCost: input.creditCost } : {}),
      ...(input.providerCostUsd !== undefined ? { providerCostUsd: input.providerCostUsd } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.displayNameNl !== undefined ? { displayNameNl: input.displayNameNl } : {}),
      ...(input.displayNameEn !== undefined ? { displayNameEn: input.displayNameEn } : {}),
      ...(input.descriptionNl !== undefined ? { descriptionNl: input.descriptionNl } : {}),
      ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
      ...(input.visibleInCatalog !== undefined ? { visibleInCatalog: input.visibleInCatalog } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.marginWarningThreshold !== undefined ?
        { marginWarningThreshold: input.marginWarningThreshold }
      : {}),
      updatedByUserId: updatedByUserId ?? null,
    },
  });

  return mergeAdminEntry(row as DbPricingRule, actionType);
}

export async function syncStudioPricingDefaults(updatedByUserId?: string | null): Promise<number> {
  let synced = 0;
  for (const actionType of Object.keys(STUDIO_ACTION_COST_REGISTRY)) {
    const existing = await prisma.studioPricingRule.findUnique({ where: { actionType } });
    if (existing) {
      continue;
    }
    const registry = STUDIO_ACTION_COST_REGISTRY[actionType as StudioActionType];
    const meta = getPricingCatalogMeta(actionType);
    await prisma.studioPricingRule.create({
      data: {
        actionType,
        creditCost: registry.defaultCreditCost,
        providerCostUsd: registry.reservedCostUsd,
        active: true,
        category: meta?.category ?? "utility",
        displayNameNl: meta?.displayNameNl ?? null,
        displayNameEn: meta?.displayNameEn ?? null,
        descriptionNl: meta?.descriptionNl ?? null,
        descriptionEn: meta?.descriptionEn ?? null,
        visibleInCatalog: meta?.visibleInCatalog ?? true,
        sortOrder: meta?.sortOrder ?? 999,
        provider: registry.provider,
        notes: meta?.defaultAdminNotes ?? "",
        updatedByUserId: updatedByUserId ?? null,
      },
    });
    synced += 1;
  }
  return synced;
}

/** @deprecated Use updateStudioPricingCatalogRule */
export async function upsertStudioPricingRule(input: {
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  active?: boolean;
  notes?: string;
}) {
  return updateStudioPricingCatalogRule(input.actionType, {
    creditCost: input.creditCost,
    providerCostUsd: input.providerCostUsd,
    active: input.active,
    notes: input.notes,
  });
}

export function creditCostToCustomerUsd(credits: number): number {
  return Math.round(credits * USD_PER_CREDIT * 10000) / 10000;
}

export function resolveCatalogCreditCostSync(input: {
  catalog: StudioPricingCatalogPublicEntry[];
  actionType: string;
  planId?: string;
  overrideCredits?: number;
}): number | null {
  const row = input.catalog.find((entry) => entry.actionType === input.actionType);
  if (!row) {
    const registry = registryEntry(input.actionType);
    if (!registry) {
      return null;
    }
    const base =
      input.overrideCredits != null && input.overrideCredits > 0
        ? input.overrideCredits
        : registry.defaultCreditCost;
    return base;
  }
  if (input.overrideCredits != null && input.overrideCredits > 0) {
    return input.overrideCredits;
  }
  return row.creditCost;
}
