import {
  getInstantOutputDurationSeconds,
  MAX_TRANSITION_MODE_IMAGES,
  MIN_TRANSITION_MODE_IMAGES,
  type InstantTransitionSeconds,
} from "@/lib/instant-premium-mode-types";

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
  durationSeconds?: number;
  transitionSeconds?: InstantTransitionSeconds;
};

/** EUR estimate scaled by output duration vs legacy baseline for the same image count. */
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
