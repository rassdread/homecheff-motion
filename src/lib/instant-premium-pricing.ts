import {
  getInstantOutputDurationSeconds,
  INSTANT_TRANSITION_SECONDS_OPTIONS,
  MAX_TRANSITION_MODE_IMAGES,
  MIN_TRANSITION_MODE_IMAGES,
  type InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";
import {
  estimateInstantPremiumCreditsForPlan,
  resolveInstantPremiumOutputPlan,
  type ResolveInstantPremiumOutputPlanInput,
} from "@/lib/instant-premium-output-plan";
import { getAnimationPreset } from "@/lib/animation-presets";

export {
  INSTANT_TRANSITION_SECONDS_OPTIONS,
  getInstantTransitionCount,
  getInstantOutputDurationSeconds,
  type InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";

export const MIN_INSTANT_PREMIUM_IMAGES = MIN_TRANSITION_MODE_IMAGES;
export const MAX_INSTANT_PREMIUM_IMAGES = MAX_TRANSITION_MODE_IMAGES;

/** Legacy tier price by image count (transition mode baseline). */
function legacyTierPriceEur(imageCount: number): number {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return 0;
  }
  if (imageCount === 2) {
    return 0.49;
  }
  if (imageCount === 3) {
    return 0.99;
  }
  if (imageCount === 4) {
    return 1.49;
  }
  if (imageCount === 5) {
    return 1.99;
  }
  return 1.99 + (imageCount - 5) * 0.5;
}

/** Baseline duration at Standard (5s) pacing — used to scale tier price when duration differs. */
function standardPacingDurationSeconds(imageCount: number): number {
  return getInstantOutputDurationSeconds(imageCount, 5);
}

export type InstantPremiumPriceOptions = {
  /** @deprecated Prefer providerDurationSeconds for billing estimates. */
  durationSeconds?: number;
  /** Billable generated video length (Vidu output). */
  providerDurationSeconds?: number;
  transitionSeconds?: InstantTransitionSeconds;
};

/** EUR estimate scaled by provider output duration vs legacy baseline for the same image count. */
export function estimateInstantPremiumPriceEur(
  imageCount: number,
  options?: InstantPremiumPriceOptions
): number {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return 0;
  }
  const tier = legacyTierPriceEur(imageCount);
  const baselineDuration = standardPacingDurationSeconds(imageCount);
  const transitionSeconds = options?.transitionSeconds ?? 5;
  const durationSeconds =
    options?.providerDurationSeconds ??
    options?.durationSeconds ??
    getInstantOutputDurationSeconds(imageCount, transitionSeconds);
  if (baselineDuration <= 0 || durationSeconds <= 0) {
    return tier;
  }
  const scaled = tier * (durationSeconds / baselineDuration);
  return Math.round(scaled * 100) / 100;
}

export function estimateInstantPremiumPriceCents(
  imageCount: number,
  options?: InstantPremiumPriceOptions
): number {
  return Math.round(estimateInstantPremiumPriceEur(imageCount, options) * 100);
}

/** User-facing price label, e.g. €0,49 (nl) or €0.49 (en). */
export function formatInstantPremiumPriceEur(
  imageCount: number,
  locale: "nl" | "en" = "nl",
  options?: InstantPremiumPriceOptions
): string {
  const value = estimateInstantPremiumPriceEur(imageCount, options);
  const formatted = value.toFixed(2).replace(".", locale === "nl" ? "," : ".");
  return `€${formatted}`;
}

export type InstantPremiumPricingSummary = {
  priceEur: number;
  priceLabel: string;
  providerDurationSeconds: number;
  storyboardDurationSeconds: number;
  transitionCount: number;
  perTransitionProviderSeconds: number;
  estimatedCredits: number;
  /** True when Fast / Standard / Cinematic yield the same EUR estimate. */
  pacingOptionsShareSamePrice: boolean;
};

function pricingOptionsFromPlan(
  plan: ReturnType<typeof resolveInstantPremiumOutputPlan>
): InstantPremiumPriceOptions {
  return {
    providerDurationSeconds: plan.providerDurationSeconds,
    transitionSeconds: plan.transitionSeconds,
  };
}

/** Compare EUR estimates across all pacing presets for the current wizard state. */
export function instantPremiumPacingOptionsShareSamePrice(
  imageCount: number,
  input: Omit<ResolveInstantPremiumOutputPlanInput, "imageCount">
): boolean {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return true;
  }
  const prices = INSTANT_TRANSITION_SECONDS_OPTIONS.map((transitionSeconds) => {
    const plan = resolveInstantPremiumOutputPlan({
      ...input,
      imageCount,
      transitionSeconds,
    });
    return estimateInstantPremiumPriceEur(imageCount, pricingOptionsFromPlan(plan));
  });
  return prices.every((price) => price === prices[0]);
}

/** Live pricing + output plan fields used in the Instant wizard. */
export function resolveInstantPremiumPricingSummary(
  imageCount: number,
  input: ResolveInstantPremiumOutputPlanInput,
  locale: "nl" | "en" = "nl"
): InstantPremiumPricingSummary {
  const safeCount = Math.max(MIN_INSTANT_PREMIUM_IMAGES, imageCount);
  const plan = resolveInstantPremiumOutputPlan({ ...input, imageCount: safeCount });
  const priceOptions = pricingOptionsFromPlan(plan);
  const priceEur = estimateInstantPremiumPriceEur(safeCount, priceOptions);
  const preset = getAnimationPreset("standard");
  return {
    priceEur,
    priceLabel: formatInstantPremiumPriceEur(safeCount, locale, priceOptions),
    providerDurationSeconds: plan.providerDurationSeconds,
    storyboardDurationSeconds: plan.storyboardDurationSeconds,
    transitionCount: plan.transitionCount,
    perTransitionProviderSeconds: plan.viduSegmentDurationSeconds,
    estimatedCredits: estimateInstantPremiumCreditsForPlan(
      plan,
      preset.estimatedCreditsPerSecond
    ),
    pacingOptionsShareSamePrice: instantPremiumPacingOptionsShareSamePrice(safeCount, {
      instantMode: input.instantMode,
      sceneTexts: input.sceneTexts,
    }),
  };
}
