/** Official subscription prices (EUR) — shared by server config, client UI, and audits. */

export const OFFICIAL_SUBSCRIPTION_MONTHLY_EUR = {
  creator: 7.99,
  pro: 24.99,
  studio: 79.99,
} as const;

export type PaidStudioPlanId = keyof typeof OFFICIAL_SUBSCRIPTION_MONTHLY_EUR;

export const PAID_STUDIO_PLAN_IDS: PaidStudioPlanId[] = ["creator", "pro", "studio"];

/** Yearly list price = 10× monthly (2-month discount convention). */
export function subscriptionYearlyPriceEur(monthlyPriceEur: number): number {
  return Math.round(monthlyPriceEur * 10 * 100) / 100;
}

export const OFFICIAL_SUBSCRIPTION_YEARLY_EUR = {
  creator: subscriptionYearlyPriceEur(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.creator),
  pro: subscriptionYearlyPriceEur(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.pro),
  studio: subscriptionYearlyPriceEur(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.studio),
} as const;
