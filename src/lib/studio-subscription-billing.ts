/** Subscription billing interval helpers — shared by UI and checkout. */

import {
  OFFICIAL_SUBSCRIPTION_MONTHLY_EUR,
  OFFICIAL_SUBSCRIPTION_YEARLY_EUR,
  subscriptionYearlyPriceEur,
} from "@/lib/studio-subscription-prices";

export type SubscriptionBillingInterval = "monthly" | "yearly";

/** Rounded marketing savings vs paying monthly for 12 months (≈17% at official prices). */
export const SUBSCRIPTION_YEARLY_SAVINGS_PERCENT = 17;

export function computeSubscriptionYearlySavingsPercent(
  monthlyPriceEur: number,
  yearlyPriceEur: number
): number {
  if (monthlyPriceEur <= 0 || yearlyPriceEur <= 0) {
    return 0;
  }
  const annualIfMonthly = monthlyPriceEur * 12;
  return Math.round((1 - yearlyPriceEur / annualIfMonthly) * 100);
}

export function resolvePlanYearlyPriceEur(
  monthlyPriceEur: number | null | undefined,
  yearlyPriceEur: number | null | undefined
): number | null {
  if (yearlyPriceEur != null && yearlyPriceEur > 0) {
    return yearlyPriceEur;
  }
  if (monthlyPriceEur != null && monthlyPriceEur > 0) {
    return subscriptionYearlyPriceEur(monthlyPriceEur);
  }
  return null;
}

export function officialYearlySavingsPercent(planId: keyof typeof OFFICIAL_SUBSCRIPTION_MONTHLY_EUR): number {
  return computeSubscriptionYearlySavingsPercent(
    OFFICIAL_SUBSCRIPTION_MONTHLY_EUR[planId],
    OFFICIAL_SUBSCRIPTION_YEARLY_EUR[planId]
  );
}
