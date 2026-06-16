import { prisma } from "@/lib/prisma";
import type {
  CarryMode,
  StudioBillingPolicySnapshot,
  StudioPlanBenefits,
} from "@/types/studio-billing";
import { STUDIO_PLANS, type StudioPlanId } from "@/server/studio-account/studio-plan-config";

const DEFAULT_PLAN_BENEFITS: Record<StudioPlanId, StudioPlanBenefits> = {
  free: {
    creditDiscountPercent: 0,
    autoTopUpAvailable: false,
    storageLimitGb: 2,
    featureFlags: [],
  },
  creator: {
    creditDiscountPercent: 10,
    autoTopUpAvailable: true,
    storageLimitGb: 25,
    featureFlags: ["priority_export"],
  },
  pro: {
    creditDiscountPercent: 15,
    autoTopUpAvailable: true,
    storageLimitGb: 100,
    featureFlags: ["priority_export", "advanced_motion"],
  },
  studio: {
    creditDiscountPercent: 20,
    autoTopUpAvailable: true,
    storageLimitGb: 500,
    featureFlags: ["priority_export", "advanced_motion", "team_workspace"],
  },
  enterprise: {
    creditDiscountPercent: 25,
    autoTopUpAvailable: true,
    storageLimitGb: null,
    featureFlags: ["priority_export", "advanced_motion", "team_workspace", "sla"],
  },
};

function parsePlansJson(raw: unknown): Record<string, StudioPlanBenefits> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PLAN_BENEFITS };
  }
  const merged: Record<string, StudioPlanBenefits> = { ...DEFAULT_PLAN_BENEFITS };
  for (const [planId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const row = value as Partial<StudioPlanBenefits>;
    merged[planId] = {
      creditDiscountPercent:
        typeof row.creditDiscountPercent === "number"
          ? row.creditDiscountPercent
          : merged[planId]?.creditDiscountPercent ?? 0,
      autoTopUpAvailable:
        typeof row.autoTopUpAvailable === "boolean"
          ? row.autoTopUpAvailable
          : merged[planId]?.autoTopUpAvailable ?? false,
      storageLimitGb:
        row.storageLimitGb === null
          ? null
          : typeof row.storageLimitGb === "number"
            ? row.storageLimitGb
            : merged[planId]?.storageLimitGb ?? null,
      featureFlags: Array.isArray(row.featureFlags)
        ? row.featureFlags.filter((f): f is string => typeof f === "string")
        : merged[planId]?.featureFlags ?? [],
    };
  }
  return merged;
}

export async function ensureStudioBillingPolicy() {
  const existing = await prisma.studioBillingPolicy.findUnique({ where: { id: "default" } });
  if (existing) {
    return existing;
  }
  return prisma.studioBillingPolicy.create({
    data: {
      id: "default",
      carryMode: "UNLIMITED",
      newUserGrantCredits: 0,
      defaultConfirmAboveCredits: 100,
      plansJson: DEFAULT_PLAN_BENEFITS,
    },
  });
}

export async function loadStudioBillingPolicy(): Promise<StudioBillingPolicySnapshot> {
  const row = await ensureStudioBillingPolicy();
  return {
    carryMode: row.carryMode as CarryMode,
    newUserGrantCredits: row.newUserGrantCredits,
    newUserPromotionCredits: row.newUserPromotionCredits,
    betaLaunchCredits: row.betaLaunchCredits,
    newUserCampaignMaxUsers: row.newUserCampaignMaxUsers,
    newUserCampaignRedeemed: row.newUserCampaignRedeemed,
    defaultConfirmAboveCredits: row.defaultConfirmAboveCredits,
    plans: parsePlansJson(row.plansJson),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function getDefaultPlanBenefits(planId: string): StudioPlanBenefits {
  const key = planId in STUDIO_PLANS ? (planId as StudioPlanId) : "free";
  return DEFAULT_PLAN_BENEFITS[key];
}

export async function getPlanBenefits(planId: string): Promise<StudioPlanBenefits> {
  const policy = await loadStudioBillingPolicy();
  return policy.plans[planId] ?? getDefaultPlanBenefits(planId);
}

export async function patchStudioBillingPolicy(input: {
  carryMode?: CarryMode;
  newUserGrantCredits?: number;
  newUserPromotionCredits?: number;
  betaLaunchCredits?: number;
  newUserCampaignMaxUsers?: number;
  defaultConfirmAboveCredits?: number;
  plans?: Record<string, Partial<StudioPlanBenefits>>;
}): Promise<StudioBillingPolicySnapshot> {
  const current = await loadStudioBillingPolicy();
  const plans = input.plans
    ? {
        ...current.plans,
        ...Object.fromEntries(
          Object.entries(input.plans).map(([id, patch]) => [
            id,
            { ...current.plans[id] ?? getDefaultPlanBenefits(id), ...patch },
          ])
        ),
      }
    : current.plans;

  const row = await prisma.studioBillingPolicy.update({
    where: { id: "default" },
    data: {
      ...(input.carryMode ? { carryMode: input.carryMode } : {}),
      ...(input.newUserGrantCredits !== undefined
        ? { newUserGrantCredits: Math.max(0, input.newUserGrantCredits) }
        : {}),
      ...(input.newUserPromotionCredits !== undefined
        ? { newUserPromotionCredits: Math.max(0, input.newUserPromotionCredits) }
        : {}),
      ...(input.betaLaunchCredits !== undefined
        ? { betaLaunchCredits: Math.max(0, input.betaLaunchCredits) }
        : {}),
      ...(input.newUserCampaignMaxUsers !== undefined
        ? { newUserCampaignMaxUsers: Math.max(0, input.newUserCampaignMaxUsers) }
        : {}),
      ...(input.defaultConfirmAboveCredits !== undefined
        ? { defaultConfirmAboveCredits: Math.max(1, input.defaultConfirmAboveCredits) }
        : {}),
      ...(input.plans ? { plansJson: plans } : {}),
    },
  });

  return {
    carryMode: row.carryMode as CarryMode,
    newUserGrantCredits: row.newUserGrantCredits,
    newUserPromotionCredits: row.newUserPromotionCredits,
    betaLaunchCredits: row.betaLaunchCredits,
    newUserCampaignMaxUsers: row.newUserCampaignMaxUsers,
    newUserCampaignRedeemed: row.newUserCampaignRedeemed,
    defaultConfirmAboveCredits: row.defaultConfirmAboveCredits,
    plans: parsePlansJson(row.plansJson),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Atomically claim a new-user campaign slot. Returns false if campaign is full. */
export async function claimNewUserCampaignSlot(): Promise<boolean> {
  const policy = await ensureStudioBillingPolicy();
  if (policy.newUserCampaignMaxUsers <= 0) {
    return true;
  }
  if (policy.newUserCampaignRedeemed >= policy.newUserCampaignMaxUsers) {
    return false;
  }
  const updated = await prisma.studioBillingPolicy.updateMany({
    where: {
      id: "default",
      newUserCampaignRedeemed: { lt: policy.newUserCampaignMaxUsers },
    },
    data: { newUserCampaignRedeemed: { increment: 1 } },
  });
  return updated.count === 1;
}

export function creditsNeverExpire(carryMode: CarryMode): boolean {
  return carryMode === "UNLIMITED";
}
