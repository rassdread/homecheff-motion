/**
 * Customer-facing Studio subscription catalog — re-exports NL B2C target SSOT.
 * Legacy Motion Stripe list prices (€7.99/€24.99/€79.99) stay internal only.
 */
import {
  STUDIO_NL_TARGET_CATALOG,
  type StudioNlTargetPlanKey,
} from "@/lib/studio-nl-b2c-catalog";
import { subscriptionYearlyPriceEur } from "@/lib/studio-subscription-prices";

export type CustomerFacingStudioPlanKey = StudioNlTargetPlanKey;

export const CUSTOMER_FACING_STUDIO_PLANS = STUDIO_NL_TARGET_CATALOG;

export const LOWEST_PAID_SUBSCRIPTION_MONTHLY_EUR =
  STUDIO_NL_TARGET_CATALOG.creator.grossConsumerPriceEur;

export function customerFacingMonthlyPriceEur(planKey: CustomerFacingStudioPlanKey): number {
  return STUDIO_NL_TARGET_CATALOG[planKey].grossConsumerPriceEur;
}

export function customerFacingMonthlyHcGrant(planKey: CustomerFacingStudioPlanKey): number {
  return STUDIO_NL_TARGET_CATALOG[planKey].monthlyHcGrant;
}

export function customerFacingYearlyPriceEur(planKey: CustomerFacingStudioPlanKey): number {
  return subscriptionYearlyPriceEur(customerFacingMonthlyPriceEur(planKey));
}
