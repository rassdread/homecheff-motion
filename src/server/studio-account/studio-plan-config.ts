/**
 * Central Studio subscription plan configuration.
 * Adjust prices and credit grants here — not scattered in UI or API routes.
 */

import type { StudioAccountType } from "@/types/studio-account";
import {
  OFFICIAL_SUBSCRIPTION_MONTHLY_EUR,
  subscriptionYearlyPriceEur,
} from "@/lib/studio-subscription-prices";
import { OFFICIAL_PLAN_STORAGE_GB } from "@/lib/studio-subscription-storage";

export { OFFICIAL_SUBSCRIPTION_MONTHLY_EUR, subscriptionYearlyPriceEur } from "@/lib/studio-subscription-prices";
export { OFFICIAL_PLAN_STORAGE_GB, formatPlanStorageGb } from "@/lib/studio-subscription-storage";

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
  /** Monthly Stripe Price ID — set via env when wired */
  stripePriceIdEnvKey?: string;
  /** Yearly Stripe Price ID — set via env when wired */
  stripePriceIdYearlyEnvKey?: string;
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
    storageLimitGb: OFFICIAL_PLAN_STORAGE_GB.free,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
  },
  creator: {
    id: "creator",
    accountType: "creator",
    labelKey: "account.plan.creator",
    monthlyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.creator,
    monthlyCredits: 0,
    creditDiscountPercent: 10,
    autoTopUpAvailable: true,
    storageLimitGb: OFFICIAL_PLAN_STORAGE_GB.creator,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_CREATOR",
    stripePriceIdYearlyEnvKey: "STRIPE_PRICE_CREATOR_YEARLY",
  },
  pro: {
    id: "pro",
    accountType: "pro",
    labelKey: "account.plan.pro",
    monthlyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.pro,
    monthlyCredits: 0,
    creditDiscountPercent: 15,
    autoTopUpAvailable: true,
    storageLimitGb: OFFICIAL_PLAN_STORAGE_GB.pro,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_PRO",
    stripePriceIdYearlyEnvKey: "STRIPE_PRICE_PRO_YEARLY",
  },
  studio: {
    id: "studio",
    accountType: "studio",
    labelKey: "account.plan.studio",
    monthlyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.studio,
    monthlyCredits: 0,
    creditDiscountPercent: 20,
    autoTopUpAvailable: true,
    storageLimitGb: OFFICIAL_PLAN_STORAGE_GB.studio,
    planVersion: STUDIO_PLAN_VERSION,
    creditPolicyVersion: STUDIO_CREDIT_POLICY_VERSION,
    stripePriceIdEnvKey: "STRIPE_PRICE_STUDIO",
    stripePriceIdYearlyEnvKey: "STRIPE_PRICE_STUDIO_YEARLY",
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

export function resolveStripePriceId(
  planId: StudioPlanId,
  interval: "monthly" | "yearly" = "monthly"
): string | null {
  const plan = STUDIO_PLANS[planId];
  const envKey =
    interval === "yearly" ? plan.stripePriceIdYearlyEnvKey : plan.stripePriceIdEnvKey;
  if (!envKey) {
    return null;
  }
  return process.env[envKey]?.trim() || null;
}
