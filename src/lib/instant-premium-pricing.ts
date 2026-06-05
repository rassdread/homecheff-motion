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
import { formatPriceEur, quoteVideoPrice } from "@/server/billing/video-pricing";

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

/** EUR estimate from V1 credit-tier pricing (central billing service). */
export function estimateInstantPremiumPriceEur(
  imageCount: number,
  options?: InstantPremiumPriceOptions & {
    instantMode?: "transition" | "story";
    userRole?: string;
    locale?: "nl" | "en";
  }
): number {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return 0;
  }
  const transitionSeconds = options?.transitionSeconds ?? 5;
  const durationSeconds =
    options?.providerDurationSeconds ??
    options?.durationSeconds ??
    getInstantOutputDurationSeconds(imageCount, transitionSeconds);
  const preset = getAnimationPreset("standard");
  const transitionCount = Math.max(1, imageCount - 1);
  const estimatedCredits = Math.round(
    transitionCount * durationSeconds * preset.estimatedCreditsPerSecond
  );
  const renderType = options?.instantMode === "story" ? "story_mode" : "transition_mode";
  const quote = quoteVideoPrice({
    renderType,
    creditsUsed: estimatedCredits,
    user: options?.userRole ? { role: options.userRole } : undefined,
    locale: options?.locale,
  });
  return quote.netPriceEur;
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
  options?: InstantPremiumPriceOptions & {
    instantMode?: "transition" | "story";
    userRole?: string;
  }
): string {
  const value = estimateInstantPremiumPriceEur(imageCount, { ...options, locale });
  return formatPriceEur(value, locale);
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
  pricingRuleLabel: string;
  isAdminFree: boolean;
  /** Final price may differ when actual credit usage is known. */
  priceIsEstimate: boolean;
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
  locale: "nl" | "en" = "nl",
  userRole?: string
): InstantPremiumPricingSummary {
  const safeCount = Math.max(MIN_INSTANT_PREMIUM_IMAGES, imageCount);
  const plan = resolveInstantPremiumOutputPlan({ ...input, imageCount: safeCount });
  const priceOptions = {
    ...pricingOptionsFromPlan(plan),
    instantMode: input.instantMode,
    userRole,
    locale,
  };
  const preset = getAnimationPreset("standard");
  const estimatedCredits = estimateInstantPremiumCreditsForPlan(
    plan,
    preset.estimatedCreditsPerSecond
  );
  const renderType = input.instantMode === "story" ? "story_mode" : "transition_mode";
  const quote = quoteVideoPrice({
    renderType,
    creditsUsed: estimatedCredits,
    user: userRole ? { role: userRole } : undefined,
    locale,
  });
  return {
    priceEur: quote.netPriceEur,
    priceLabel: formatPriceEur(quote.netPriceEur, locale),
    providerDurationSeconds: plan.providerDurationSeconds,
    storyboardDurationSeconds: plan.storyboardDurationSeconds,
    transitionCount: plan.transitionCount,
    perTransitionProviderSeconds: plan.viduSegmentDurationSeconds,
    estimatedCredits,
    pacingOptionsShareSamePrice: instantPremiumPacingOptionsShareSamePrice(safeCount, {
      instantMode: input.instantMode,
      sceneTexts: input.sceneTexts,
    }),
    pricingRuleLabel: quote.pricingRuleLabel,
    isAdminFree: quote.isAdminFree,
    priceIsEstimate: true,
  };
}
