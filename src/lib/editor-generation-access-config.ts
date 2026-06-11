import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorSubscriptionTier } from "@/types/editor-generation-access";

/** Rewarded ad value expressed as low-cost generation credits. */
export const AD_VALUE_CREDIT_EQUIVALENT = 1;

/** USD value per ad-equivalent credit unit. */
export const AD_VALUE_USD_PER_CREDIT = 0.05;

export const MAX_AD_SUPPORTED_GENERATIONS = 1;

export const BASE_EDITOR_GENERATION_PROVIDER_COST_USD = 0.04;

export const LARGE_PRINT_PRESETS = new Set(["a0", "large_70x100", "large_100x150", "large_120x180"]);

export const PREMIUM_ONLY_FUSION_INTENTS = new Set<EditorFusionIntent>([
  "future_child",
  "product_family",
  "campaign_variant",
]);

export const PREMIUM_ONLY_UPSCALE_MODES = new Set(["maximum_detail"]);

export const DEFAULT_LIFE_TIMELINE_AGES = [25, 35, 45, 55, 65, 75] as const;

export const DEFAULT_PRODUCT_FAMILY_VARIANTS = ["premium", "luxury", "eco", "holiday"] as const;

export const DEFAULT_CAMPAIGN_VARIANT_OUTPUTS = ["story", "post", "banner", "poster", "marketplace"] as const;

export const TIER_INCLUDED_MONTHLY_CREDITS: Record<EditorSubscriptionTier, number> = {
  free: 3,
  plus: 30,
  premium: 120,
};

export const TIER_ALLOWS_MULTI_GENERATION: Record<EditorSubscriptionTier, boolean> = {
  free: false,
  plus: true,
  premium: true,
};

export const TIER_ALLOWS_PREMIUM_UPSCALE: Record<EditorSubscriptionTier, boolean> = {
  free: false,
  plus: false,
  premium: true,
};

export const TIER_ALLOWS_BULK_SEQUENCES: Record<EditorSubscriptionTier, boolean> = {
  free: false,
  plus: false,
  premium: true,
};

export const TRANSFORMATION_PREMIUM_STEP_THRESHOLD = 6;

export const TRANSFORMATION_MAX_STANDARD_STEPS = 6;

export function adEstimatedValueUsd(): number {
  return AD_VALUE_CREDIT_EQUIVALENT * AD_VALUE_USD_PER_CREDIT;
}
