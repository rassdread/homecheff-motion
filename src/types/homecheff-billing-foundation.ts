/**
 * Billing foundation — subscription tiers per product (architecture only, no payment wiring).
 */

import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const BILLING_PRODUCT_PLAN_IDS = [
  "editor",
  "studio",
  "motion",
  "publish",
  "complete_suite",
] as const;

export type BillingProductPlanId = (typeof BILLING_PRODUCT_PLAN_IDS)[number];

export type BillingProductPlan = {
  id: BillingProductPlanId;
  labelKey: string;
  includesProducts: HomeCheffProductId[];
  /** Future Stripe / billing provider SKU — not wired */
  futureSku?: string;
};
