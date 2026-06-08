/**
 * Studio profitability layer — aggregates ProviderCostEvent (full COGS) + CustomerBillingEvent (revenue).
 * Extends existing cost instrumentation; no new billing engine or schema.
 */

import { prisma } from "@/lib/prisma";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";
import type {
  FeatureProfitabilityRow,
  NegativeMarginAlert,
  PeriodProfitabilityTotals,
  ProfitabilityPeriodKey,
  ProfitabilityWarning,
  ProjectProfitabilityRow,
  ProviderCostBreakdown,
  ProviderTrendRow,
  StudioProfitabilityReport,
  SubscriptionPlanSimulation,
  UnitEconomicsRow,
  UnitEconomicsSummary,
  UserProfitabilityRow,
} from "@/types/studio-profitability";

const OPENAI_ACTIONS = new Set<string>([
  COST_ACTION.OPENAI_OCR,
  COST_ACTION.OPENAI_SCENE_IMAGE,
  COST_ACTION.OPENAI_VISION,
  COST_ACTION.OPENAI_CHARACTER_ANALYSIS,
  COST_ACTION.OPENAI_TRANSLATION,
]);

const ELEVENLABS_ACTIONS = new Set<string>([
  COST_ACTION.ELEVENLABS_TTS,
  COST_ACTION.ELEVENLABS_STT,
  COST_ACTION.ELEVENLABS_CLONE,
]);

const LOW_MARGIN_PERCENT = 20;
const COST_SPIKE_MULTIPLIER = 2;

const SUBSCRIPTION_PLANS = [
  { planId: "creator", planLabel: "Creator", monthlyPriceEur: 19 },
  { planId: "pro", planLabel: "Pro", monthlyPriceEur: 49 },
  { planId: "studio", planLabel: "Studio", monthlyPriceEur: 99 },
] as const;

const FEATURE_LABELS: Record<string, string> = {
  voice_preview: "Voice previews",
  voice_clone: "Voice clones",
  scene_image: "Scene images",
  asset_reference: "Asset references",
  asset_derivation: "Asset derivations",
  vision_qa: "Vision QA",
  translation: "Translations",
  motion_render: "Motion renders",
  language_export: "Language exports",
  text_rerender: "Text rerenders",
  other: "Other",
};

export type CostEventInput = {
  id: string;
  createdAt: Date;
  userId: string | null;
  projectId: string | null;
  provider: string;
  actionType: string;
  internalCostUsd: number | null;
  totalCostUsd: number | null;
  metadataJson: unknown;
};

export type BillingEventInput = {
  id: string;
  createdAt: Date;
  userId: string;
  projectId: string | null;
  actionType: string;
  renderType: string;
  netPriceEur: number;
  grossPriceEur: number;
};

function eventCostUsd(row: { internalCostUsd: number | null; totalCostUsd: number | null }): number {
  return row.internalCostUsd ?? row.totalCostUsd ?? 0;
}

function usdToEur(usd: number): number {
  return Math.round((usd / resolveEurToUsdRate()) * 100) / 100;
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function roundEur(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyBreakdown(): ProviderCostBreakdown {
  return {
    openaiUsd: 0,
    elevenlabsUsd: 0,
    viduUsd: 0,
    storageUsd: 0,
    otherUsd: 0,
    totalUsd: 0,
  };
}

export function classifyCostToBreakdown(
  row: Pick<CostEventInput, "provider" | "actionType" | "internalCostUsd" | "totalCostUsd">
): ProviderCostBreakdown {
  const cost = eventCostUsd(row);
  const bucket = emptyBreakdown();
  if (OPENAI_ACTIONS.has(row.actionType)) {
    bucket.openaiUsd = cost;
  } else if (ELEVENLABS_ACTIONS.has(row.actionType)) {
    bucket.elevenlabsUsd = cost;
  } else if (row.actionType === COST_ACTION.VIDU_RENDER) {
    bucket.viduUsd = cost;
  } else if (row.provider === "vercel_blob" || row.actionType === COST_ACTION.STORAGE_UPLOAD) {
    bucket.storageUsd = cost;
  } else {
    bucket.otherUsd = cost;
  }
  bucket.totalUsd = cost;
  return bucket;
}

export function mergeBreakdowns(a: ProviderCostBreakdown, b: ProviderCostBreakdown): ProviderCostBreakdown {
  return {
    openaiUsd: roundUsd(a.openaiUsd + b.openaiUsd),
    elevenlabsUsd: roundUsd(a.elevenlabsUsd + b.elevenlabsUsd),
    viduUsd: roundUsd(a.viduUsd + b.viduUsd),
    storageUsd: roundUsd(a.storageUsd + b.storageUsd),
    otherUsd: roundUsd(a.otherUsd + b.otherUsd),
    totalUsd: roundUsd(a.totalUsd + b.totalUsd),
  };
}

export function computeProfitMetrics(revenueEur: number, costUsd: number): {
  profitEur: number;
  marginPercent: number;
  costEur: number;
} {
  const costEur = usdToEur(costUsd);
  const profitEur = roundEur(revenueEur - costEur);
  const marginPercent =
    revenueEur > 0 ? Math.round((profitEur / revenueEur) * 1000) / 10
    : costEur > 0 ? -100
    : 0;
  return { profitEur, marginPercent, costEur };
}

function metaFeature(metadataJson: unknown): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const f = (metadataJson as Record<string, unknown>).feature;
  return typeof f === "string" ? f : null;
}

export function resolveProfitabilityFeatureKey(
  event: Pick<CostEventInput, "actionType" | "metadataJson">
): string {
  const feature = metaFeature(event.metadataJson);
  if (feature?.startsWith("voice_preview")) {
    return "voice_preview";
  }
  if (feature === "voice_preview_cache_hit") {
    return "voice_preview";
  }
  if (feature === "voice_clone" || event.actionType === COST_ACTION.ELEVENLABS_CLONE) {
    return "voice_clone";
  }
  if (feature === "asset_reference_generate") {
    return "asset_reference";
  }
  if (feature === "asset_derivation") {
    return "asset_derivation";
  }
  if (
    feature?.startsWith("scene_image") ||
    event.actionType === COST_ACTION.OPENAI_SCENE_IMAGE
  ) {
    return "scene_image";
  }
  if (
    feature?.startsWith("vision_") ||
    event.actionType === COST_ACTION.OPENAI_VISION ||
    event.actionType === COST_ACTION.OPENAI_CHARACTER_ANALYSIS
  ) {
    return "vision_qa";
  }
  if (
    feature === "language_translation" ||
    event.actionType === COST_ACTION.OPENAI_TRANSLATION
  ) {
    return "translation";
  }
  if (event.actionType === COST_ACTION.VIDU_RENDER) {
    return "motion_render";
  }
  return "other";
}

export function resolveBillingFeatureKey(event: Pick<BillingEventInput, "actionType" | "renderType">): string {
  if (event.actionType === "text_rerender" || event.renderType === "text_rerender") {
    return "text_rerender";
  }
  if (event.actionType === "language_export" || event.renderType === "language_export") {
    return "language_export";
  }
  if (
    event.actionType === "vidu_render" ||
    event.renderType === "story_mode" ||
    event.renderType === "transition_mode" ||
    event.renderType === "full_rerender"
  ) {
    return "motion_render";
  }
  return "other";
}

function resolveWarning(
  revenueEur: number,
  profitEur: number,
  marginPercent: number
): ProfitabilityWarning | null {
  if (profitEur < 0 || (revenueEur > 0 && marginPercent < 0)) {
    return "negative_margin";
  }
  if (revenueEur > 0 && marginPercent >= 0 && marginPercent < LOW_MARGIN_PERCENT) {
    return "low_margin";
  }
  return null;
}

function periodKeyForDate(at: Date, now: Date): ProfitabilityPeriodKey[] {
  const keys: ProfitabilityPeriodKey[] = ["allTime"];
  const last365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (at >= last365) {
    keys.push("last365Days");
  }
  if (at >= last90) {
    keys.push("last90Days");
  }
  if (at >= last30) {
    keys.push("last30Days");
  }
  if (at >= last7) {
    keys.push("last7Days");
  }
  return keys;
}

function emptyPeriodTotals(): PeriodProfitabilityTotals {
  return {
    revenueEur: 0,
    costUsd: 0,
    costEur: 0,
    profitEur: 0,
    marginPercent: 0,
    projectCount: 0,
    userCount: 0,
    costEventCount: 0,
    billingEventCount: 0,
  };
}

export function buildProfitabilityFromEvents(params: {
  costEvents: CostEventInput[];
  billingEvents: BillingEventInput[];
  projectTitles: Map<string, string | null>;
  userEmails: Map<string, string>;
  now?: Date;
  topLimit?: number;
}): StudioProfitabilityReport {
  const now = params.now ?? new Date();
  const topLimit = params.topLimit ?? 20;

  const executiveSummary: Record<ProfitabilityPeriodKey, PeriodProfitabilityTotals> = {
    last7Days: emptyPeriodTotals(),
    last30Days: emptyPeriodTotals(),
    last90Days: emptyPeriodTotals(),
    last365Days: emptyPeriodTotals(),
    allTime: emptyPeriodTotals(),
  };

  const projectCosts = new Map<string, ProviderCostBreakdown>();
  const projectRevenue = new Map<string, number>();
  const userCosts = new Map<string, ProviderCostBreakdown>();
  const userRevenue = new Map<string, number>();
  const userProjects = new Map<string, Set<string>>();
  const userCostByPeriod = new Map<string, { last7: number; last90: number }>();
  const userCost30 = new Map<string, number>();
  const userCost90 = new Map<string, number>();
  const userCost365 = new Map<string, number>();
  const userRevenue30 = new Map<string, number>();
  const userRevenue90 = new Map<string, number>();
  const userRevenue365 = new Map<string, number>();

  const featureMap = new Map<
    string,
    { calls: number; costUsd: number; revenueEur: number }
  >();

  const providerPeriod = new Map<
    keyof Omit<ProviderCostBreakdown, "totalUsd">,
    { last7: number; last30: number; last90: number; last365: number }
  >();
  for (const key of ["openaiUsd", "elevenlabsUsd", "viduUsd", "storageUsd", "otherUsd"] as const) {
    providerPeriod.set(key, { last7: 0, last30: 0, last90: 0, last365: 0 });
  }

  const periodProjects = new Map<ProfitabilityPeriodKey, Set<string>>();
  const periodUsers = new Map<ProfitabilityPeriodKey, Set<string>>();
  for (const k of Object.keys(executiveSummary) as ProfitabilityPeriodKey[]) {
    periodProjects.set(k, new Set());
    periodUsers.set(k, new Set());
  }

  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (const e of params.costEvents) {
    const cost = eventCostUsd(e);
    const breakdown = classifyCostToBreakdown(e);
    const periods = periodKeyForDate(e.createdAt, now);

    for (const p of periods) {
      const ex = executiveSummary[p];
      ex.costUsd = roundUsd(ex.costUsd + cost);
      ex.costEventCount += 1;
      if (e.projectId) {
        periodProjects.get(p)!.add(e.projectId);
      }
      if (e.userId) {
        periodUsers.get(p)!.add(e.userId);
      }
    }

    if (e.projectId) {
      projectCosts.set(e.projectId, mergeBreakdowns(projectCosts.get(e.projectId) ?? emptyBreakdown(), breakdown));
    }
    if (e.userId) {
      userCosts.set(e.userId, mergeBreakdowns(userCosts.get(e.userId) ?? emptyBreakdown(), breakdown));
      const up = userProjects.get(e.userId) ?? new Set<string>();
      if (e.projectId) {
        up.add(e.projectId);
      }
      userProjects.set(e.userId, up);

      const uc = userCostByPeriod.get(e.userId) ?? { last7: 0, last90: 0 };
      if (e.createdAt >= last7) {
        uc.last7 += cost;
      }
      if (e.createdAt >= last90) {
        uc.last90 += cost;
      }
      userCostByPeriod.set(e.userId, uc);

      if (e.createdAt >= last30) {
        userCost30.set(e.userId, roundUsd((userCost30.get(e.userId) ?? 0) + cost));
      }
      if (e.createdAt >= last90) {
        userCost90.set(e.userId, roundUsd((userCost90.get(e.userId) ?? 0) + cost));
      }
      const last365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      if (e.createdAt >= last365) {
        userCost365.set(e.userId, roundUsd((userCost365.get(e.userId) ?? 0) + cost));
      }
    }

    const fKey = resolveProfitabilityFeatureKey(e);
    const fCur = featureMap.get(fKey) ?? { calls: 0, costUsd: 0, revenueEur: 0 };
    fCur.calls += 1;
    fCur.costUsd = roundUsd(fCur.costUsd + cost);
    featureMap.set(fKey, fCur);

    const b = classifyCostToBreakdown(e);
    for (const provKey of ["openaiUsd", "elevenlabsUsd", "viduUsd", "storageUsd", "otherUsd"] as const) {
      const amount = b[provKey];
      if (amount <= 0) {
        continue;
      }
      const row = providerPeriod.get(provKey)!;
      if (e.createdAt >= last7) {
        row.last7 = roundUsd(row.last7 + amount);
      }
      if (e.createdAt >= last30) {
        row.last30 = roundUsd(row.last30 + amount);
      }
      if (e.createdAt >= last90) {
        row.last90 = roundUsd(row.last90 + amount);
      }
      if (e.createdAt >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
        row.last365 = roundUsd(row.last365 + amount);
      }
    }
  }

  for (const e of params.billingEvents) {
    const revenue = e.netPriceEur;
    const periods = periodKeyForDate(e.createdAt, now);

    for (const p of periods) {
      const ex = executiveSummary[p];
      ex.revenueEur = roundEur(ex.revenueEur + revenue);
      ex.billingEventCount += 1;
      if (e.projectId) {
        periodProjects.get(p)!.add(e.projectId);
      }
      periodUsers.get(p)!.add(e.userId);
    }

    if (e.projectId) {
      projectRevenue.set(e.projectId, roundEur((projectRevenue.get(e.projectId) ?? 0) + revenue));
    }
    userRevenue.set(e.userId, roundEur((userRevenue.get(e.userId) ?? 0) + revenue));

    if (e.createdAt >= last30) {
      userRevenue30.set(e.userId, roundEur((userRevenue30.get(e.userId) ?? 0) + revenue));
    }
    if (e.createdAt >= last90) {
      userRevenue90.set(e.userId, roundEur((userRevenue90.get(e.userId) ?? 0) + revenue));
    }
    const last365Billing = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (e.createdAt >= last365Billing) {
      userRevenue365.set(e.userId, roundEur((userRevenue365.get(e.userId) ?? 0) + revenue));
    }

    const fKey = resolveBillingFeatureKey(e);
    const fCur = featureMap.get(fKey) ?? { calls: 0, costUsd: 0, revenueEur: 0 };
    fCur.revenueEur = roundEur(fCur.revenueEur + revenue);
    if (fKey === "motion_render" || fKey === "language_export" || fKey === "text_rerender") {
      fCur.calls += 1;
    }
    featureMap.set(fKey, fCur);
  }

  for (const key of Object.keys(executiveSummary) as ProfitabilityPeriodKey[]) {
    const ex = executiveSummary[key];
    ex.costEur = usdToEur(ex.costUsd);
    ex.profitEur = roundEur(ex.revenueEur - ex.costEur);
    ex.marginPercent =
      ex.revenueEur > 0 ? Math.round((ex.profitEur / ex.revenueEur) * 1000) / 10
      : ex.costEur > 0 ? -100
      : 0;
    ex.projectCount = periodProjects.get(key)!.size;
    ex.userCount = periodUsers.get(key)!.size;
  }

  const allProjectIds = new Set([...projectCosts.keys(), ...projectRevenue.keys()]);
  const projectProfitability: ProjectProfitabilityRow[] = [...allProjectIds].map((projectId) => {
    const costs = projectCosts.get(projectId) ?? emptyBreakdown();
    const revenueEur = projectRevenue.get(projectId) ?? 0;
    const { profitEur, marginPercent } = computeProfitMetrics(revenueEur, costs.totalUsd);
    return {
      projectId,
      projectTitle: params.projectTitles.get(projectId) ?? null,
      revenueEur,
      costs,
      totalCostUsd: costs.totalUsd,
      profitEur,
      marginPercent,
      warning: resolveWarning(revenueEur, profitEur, marginPercent),
    };
  });

  const allUserIds = new Set([...userCosts.keys(), ...userRevenue.keys()]);
  const userActivity = [...allUserIds].map((id) => ({
    userId: id,
    activity: (userCosts.get(id)?.totalUsd ?? 0) + (userRevenue.get(id) ?? 0),
  }));
  userActivity.sort((a, b) => b.activity - a.activity);
  const powerUserThreshold =
    userActivity.length > 0 ?
      userActivity[Math.max(0, Math.floor(userActivity.length * 0.1) - 1)]?.activity ?? 0
    : 0;

  const userPeriodMetrics = (userId: string, revMap: Map<string, number>, costMap: Map<string, number>) => {
    const revenueEur = revMap.get(userId) ?? 0;
    const costUsd = costMap.get(userId) ?? 0;
    const { profitEur, marginPercent } = computeProfitMetrics(revenueEur, costUsd);
    return { revenueEur, costUsd, profitEur, marginPercent };
  };

  const userProfitability: UserProfitabilityRow[] = [...allUserIds].map((userId) => {
    const costs = userCosts.get(userId) ?? emptyBreakdown();
    const revenueEur = userRevenue.get(userId) ?? 0;
    const { profitEur, marginPercent } = computeProfitMetrics(revenueEur, costs.totalUsd);
    const uc = userCostByPeriod.get(userId);
    let warning = resolveWarning(revenueEur, profitEur, marginPercent);
    if (!warning && uc && uc.last90 > 0) {
      const weeklyAvg = uc.last90 / (90 / 7);
      if (uc.last7 > weeklyAvg * COST_SPIKE_MULTIPLIER) {
        warning = "cost_spike";
      }
    }
    return {
      userId,
      email: params.userEmails.get(userId) ?? userId,
      revenueEur,
      costs,
      totalCostUsd: costs.totalUsd,
      profitEur,
      marginPercent,
      projectCount: userProjects.get(userId)?.size ?? 0,
      last30Days: userPeriodMetrics(userId, userRevenue30, userCost30),
      last90Days: userPeriodMetrics(userId, userRevenue90, userCost90),
      last365Days: userPeriodMetrics(userId, userRevenue365, userCost365),
      warning,
      isPowerUser: (costs.totalUsd + revenueEur) >= powerUserThreshold && powerUserThreshold > 0,
    };
  });

  const featureProfitability: FeatureProfitabilityRow[] = [...featureMap.entries()]
    .filter(([key]) => key !== "other")
    .map(([featureKey, data]) => {
      const { profitEur, marginPercent } = computeProfitMetrics(data.revenueEur, data.costUsd);
      return {
        featureKey,
        label: FEATURE_LABELS[featureKey] ?? featureKey,
        calls: data.calls,
        revenueEur: data.revenueEur,
        costUsd: data.costUsd,
        profitEur,
        marginPercent,
        avgCostUsd: data.calls > 0 ? roundUsd(data.costUsd / data.calls) : 0,
        avgRevenueEur: data.calls > 0 ? roundEur(data.revenueEur / data.calls) : 0,
        warning: resolveWarning(data.revenueEur, profitEur, marginPercent),
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd);

  const total30d = providerPeriod.get("openaiUsd")!.last30 +
    providerPeriod.get("elevenlabsUsd")!.last30 +
    providerPeriod.get("viduUsd")!.last30 +
    providerPeriod.get("storageUsd")!.last30 +
    providerPeriod.get("otherUsd")!.last30;

  const providerLabels: Record<keyof Omit<ProviderCostBreakdown, "totalUsd">, string> = {
    openaiUsd: "OpenAI",
    elevenlabsUsd: "ElevenLabs",
    viduUsd: "Vidu",
    storageUsd: "Storage",
    otherUsd: "Other",
  };

  const providerBreakdown: ProviderTrendRow[] = (
    ["openaiUsd", "elevenlabsUsd", "viduUsd", "storageUsd", "otherUsd"] as const
  ).map((provider) => {
    const row = providerPeriod.get(provider)!;
    return {
      provider,
      label: providerLabels[provider],
      last7DaysUsd: row.last7,
      last30DaysUsd: row.last30,
      last90DaysUsd: row.last90,
      last365DaysUsd: row.last365,
      sharePercent30d:
        total30d > 0 ? Math.round((row.last30 / total30d) * 1000) / 10 : 0,
    };
  });

  const negativeMarginAlerts: NegativeMarginAlert[] = [];
  for (const p of projectProfitability) {
    if (p.warning) {
      negativeMarginAlerts.push({
        kind: "project",
        id: p.projectId,
        label: p.projectTitle ?? p.projectId,
        revenueEur: p.revenueEur,
        costEur: usdToEur(p.totalCostUsd),
        profitEur: p.profitEur,
        marginPercent: p.marginPercent,
        warning: p.warning,
      });
    }
  }
  for (const u of userProfitability) {
    if (u.warning) {
      negativeMarginAlerts.push({
        kind: "user",
        id: u.userId,
        label: u.email,
        revenueEur: u.revenueEur,
        costEur: usdToEur(u.totalCostUsd),
        profitEur: u.profitEur,
        marginPercent: u.marginPercent,
        warning: u.warning,
      });
    }
  }
  for (const f of featureProfitability) {
    if (f.warning) {
      negativeMarginAlerts.push({
        kind: "feature",
        id: f.featureKey,
        label: f.label,
        revenueEur: f.revenueEur,
        costEur: usdToEur(f.costUsd),
        profitEur: f.profitEur,
        marginPercent: f.marginPercent,
        warning: f.warning,
      });
    }
  }

  const subscriptionSimulation: SubscriptionPlanSimulation[] = SUBSCRIPTION_PLANS.map((plan) => {
    const activeUsers = [...userCost30.keys()];
    let profitable = 0;
    let loss = 0;
    let marginSum = 0;
    for (const userId of activeUsers) {
      const costEur = usdToEur(userCost30.get(userId) ?? 0);
      const margin = plan.monthlyPriceEur - costEur;
      marginSum += margin;
      if (margin >= 0) {
        profitable += 1;
      } else {
        loss += 1;
      }
    }
    const total = activeUsers.length;
    return {
      planId: plan.planId,
      planLabel: plan.planLabel,
      monthlyPriceEur: plan.monthlyPriceEur,
      profitableUserCount: profitable,
      lossMakingUserCount: loss,
      totalUsers: total,
      avgMarginEur: total > 0 ? roundEur(marginSum / total) : 0,
      avgMarginPercent:
        total > 0 && plan.monthlyPriceEur > 0 ?
          Math.round((marginSum / total / plan.monthlyPriceEur) * 1000) / 10
        : 0,
      breakEvenUserPercent:
        total > 0 ? Math.round((profitable / total) * 1000) / 10 : 0,
    };
  });

  const unitByAction: UnitEconomicsRow[] = featureProfitability.map((f) => ({
    actionKey: f.featureKey,
    label: f.label,
    totalCalls: f.calls,
    totalCostUsd: f.costUsd,
    avgCostUsd: f.avgCostUsd,
    totalRevenueEur: f.revenueEur,
    avgRevenueEur: f.avgRevenueEur,
  }));

  const activeProjectCount = allProjectIds.size;
  const activeUserCount = allUserIds.size;
  const totalCostAll = params.costEvents.reduce((s, e) => s + eventCostUsd(e), 0);
  const totalRevenueAll = params.billingEvents.reduce((s, e) => s + e.netPriceEur, 0);

  const unitEconomics: UnitEconomicsSummary = {
    costPerProjectUsd:
      activeProjectCount > 0 ? roundUsd(totalCostAll / activeProjectCount) : 0,
    costPerActiveUserUsd:
      activeUserCount > 0 ? roundUsd(totalCostAll / activeUserCount) : 0,
    revenuePerProjectEur:
      activeProjectCount > 0 ? roundEur(totalRevenueAll / activeProjectCount) : 0,
    revenuePerActiveUserEur:
      activeUserCount > 0 ? roundEur(totalRevenueAll / activeUserCount) : 0,
    projectCount: activeProjectCount,
    activeUserCount,
    byAction: unitByAction,
  };

  const sortByProfit = <T extends { profitEur: number }>(rows: T[]) =>
    [...rows].sort((a, b) => b.profitEur - a.profitEur);
  const sortByCost = <T extends { totalCostUsd: number }>(rows: T[]) =>
    [...rows].sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  return {
    generatedAt: now.toISOString(),
    executiveSummary,
    providerBreakdown,
    projectProfitability: sortByProfit(projectProfitability).slice(0, topLimit),
    userProfitability: sortByProfit(userProfitability).slice(0, topLimit),
    featureProfitability,
    negativeMarginAlerts: negativeMarginAlerts.slice(0, 50),
    subscriptionSimulation,
    unitEconomics,
    topProfitableUsers: sortByProfit(userProfitability).slice(0, 10),
    topCostUsers: sortByCost(userProfitability).slice(0, 10),
    topProfitableProjects: sortByProfit(projectProfitability).slice(0, 10),
    topLossProjects: [...projectProfitability]
      .sort((a, b) => a.profitEur - b.profitEur)
      .filter((p) => p.profitEur < 0)
      .slice(0, 10),
    topProfitableFeatures: [...featureProfitability]
      .sort((a, b) => b.profitEur - a.profitEur)
      .slice(0, 5),
    topLossFeatures: [...featureProfitability]
      .sort((a, b) => a.profitEur - b.profitEur)
      .filter((f) => f.profitEur < 0 || f.revenueEur === 0)
      .slice(0, 5),
  };
}

export async function buildStudioProfitabilityReport(): Promise<StudioProfitabilityReport> {
  const [costEvents, billingEvents] = await Promise.all([
    prisma.providerCostEvent.findMany({
      select: {
        id: true,
        createdAt: true,
        userId: true,
        projectId: true,
        provider: true,
        actionType: true,
        internalCostUsd: true,
        totalCostUsd: true,
        metadataJson: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerBillingEvent.findMany({
      select: {
        id: true,
        createdAt: true,
        userId: true,
        projectId: true,
        actionType: true,
        renderType: true,
        netPriceEur: true,
        grossPriceEur: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projectIds = new Set<string>();
  const userIds = new Set<string>();
  for (const e of costEvents) {
    if (e.projectId) {
      projectIds.add(e.projectId);
    }
    if (e.userId) {
      userIds.add(e.userId);
    }
  }
  for (const e of billingEvents) {
    if (e.projectId) {
      projectIds.add(e.projectId);
    }
    userIds.add(e.userId);
  }

  const [projects, users] = await Promise.all([
    projectIds.size > 0 ?
      prisma.animationProject.findMany({
        where: { id: { in: [...projectIds] } },
        select: { id: true, title: true },
      })
    : Promise.resolve([]),
    userIds.size > 0 ?
      prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, email: true },
      })
    : Promise.resolve([]),
  ]);

  const projectTitles = new Map(projects.map((p) => [p.id, p.title]));
  const userEmails = new Map(users.map((u) => [u.id, u.email]));

  return buildProfitabilityFromEvents({
    costEvents,
    billingEvents,
    projectTitles,
    userEmails,
  });
}
