/**
 * Target NL B2C Studio catalog — displayed when CENTRAL_STUDIO_TECHNICAL_READY.
 * Legacy €7.99/€24.99/€79.99 remains live until public acquisition enabled.
 */
import { OFFICIAL_SUBSCRIPTION_MONTHLY_EUR } from "@/lib/studio-subscription-prices";

export type StudioNlTargetPlanKey = "creator" | "pro" | "studio";

export type StudioNlTargetPlan = {
  planKey: StudioNlTargetPlanKey;
  grossConsumerPriceEur: number;
  monthlyHcGrant: number;
  vatCopyKey: "pricing.inclusiveVat";
  legacyPriceEur: number;
};

export const STUDIO_NL_TARGET_CATALOG: Record<StudioNlTargetPlanKey, StudioNlTargetPlan> = {
  creator: {
    planKey: "creator",
    grossConsumerPriceEur: 15,
    monthlyHcGrant: 900,
    vatCopyKey: "pricing.inclusiveVat",
    legacyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.creator,
  },
  pro: {
    planKey: "pro",
    grossConsumerPriceEur: 29,
    monthlyHcGrant: 1800,
    vatCopyKey: "pricing.inclusiveVat",
    legacyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.pro,
  },
  studio: {
    planKey: "studio",
    grossConsumerPriceEur: 79,
    monthlyHcGrant: 5000,
    vatCopyKey: "pricing.inclusiveVat",
    legacyPriceEur: OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.studio,
  },
};

export const STUDIO_NL_HC_ACTION_TARGETS = {
  motion_render_5s_720p_turbo: 80,
  premium_vision_analysis: 8,
} as const;
