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
  /** Legacy reference — subscriptions do not auto-grant credits (Phase 4). */
  monthlyCredits: number;
  creditDiscountPercent: number;
  autoTopUpAvailable: boolean;
  storageLimitGb: number | null;
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
    creditDiscountPercent: 0,
    autoTopUpAvailable: false,
    storageLimitGb: 2,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
  },
  creator: {
    id: "creator",
    accountType: "creator",
    labelKey: "account.plan.creator",
    monthlyPriceEur: 19,
    monthlyCredits: 0,
    creditDiscountPercent: 10,
    autoTopUpAvailable: true,
    storageLimitGb: 25,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_CREATOR",
  },
  pro: {
    id: "pro",
    accountType: "pro",
    labelKey: "account.plan.pro",
    monthlyPriceEur: 49,
    monthlyCredits: 0,
    creditDiscountPercent: 15,
    autoTopUpAvailable: true,
    storageLimitGb: 100,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_PRO",
  },
  studio: {
    id: "studio",
    accountType: "studio",
    labelKey: "account.plan.studio",
    monthlyPriceEur: 99,
    monthlyCredits: 0,
    creditDiscountPercent: 20,
    autoTopUpAvailable: true,
    storageLimitGb: 500,
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
    creditDiscountPercent: 25,
    autoTopUpAvailable: true,
    storageLimitGb: null,
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
