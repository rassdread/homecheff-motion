/**
 * Central Studio subscription plan configuration.
 * Adjust prices and credit grants here — not scattered in UI or API routes.
 */

import type { StudioAccountType } from "@/types/studio-account";

export const STUDIO_PLAN_VERSION = "v1" as const;
export const STUDIO_CREDIT_POLICY_VERSION = "v1" as const;

export type StudioPlanId = "free" | "creator" | "pro" | "studio" | "enterprise";

export type StudioPlanConfig = {
  id: StudioPlanId;
  accountType: StudioAccountType;
  labelKey: string;
  monthlyPriceEur: number | null;
  monthlyCredits: number;
  monthlyCreditsMax?: number;
  planVersion: typeof STUDIO_PLAN_VERSION;
  creditPolicyVersion: typeof STUDIO_CREDIT_POLICY_VERSION;
  /** Future Stripe Price ID — set via env when wired */
  stripePriceIdEnvKey?: string;
};

export const STUDIO_PLANS: Record<StudioPlanId, StudioPlanConfig> = {
  free: {
    id: "free",
    accountType: "free",
    labelKey: "account.plan.free",
    monthlyPriceEur: 0,
    monthlyCredits: 0,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
  },
  creator: {
    id: "creator",
    accountType: "creator",
    labelKey: "account.plan.creator",
    monthlyPriceEur: 19,
    monthlyCredits: 3000,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_CREATOR",
  },
  pro: {
    id: "pro",
    accountType: "pro",
    labelKey: "account.plan.pro",
    monthlyPriceEur: 49,
    monthlyCredits: 8000,
    monthlyCreditsMax: 10000,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_PRO",
  },
  studio: {
    id: "studio",
    accountType: "studio",
    labelKey: "account.plan.studio",
    monthlyPriceEur: 99,
    monthlyCredits: 12000,
    monthlyCreditsMax: 15000,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_STUDIO",
  },
  enterprise: {
    id: "enterprise",
    accountType: "enterprise",
    labelKey: "account.plan.enterprise",
    monthlyPriceEur: null,
    monthlyCredits: 0,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
  },
};

export function getStudioPlan(planId: string): StudioPlanConfig {
  if (planId in STUDIO_PLANS) {
    return STUDIO_PLANS[planId as StudioPlanId];
  }
  return STUDIO_PLANS.free;
}

export function resolveStripePriceId(planId: StudioPlanId): string | null {
  const plan = STUDIO_PLANS[planId];
  if (!plan.stripePriceIdEnvKey) {
    return null;
  }
  return process.env[plan.stripePriceIdEnvKey]?.trim() || null;
}
