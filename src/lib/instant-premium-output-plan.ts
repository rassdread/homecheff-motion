import { MIN_INSTANT_PREMIUM_IMAGES } from "@/lib/instant-premium-pricing";

export type InstantPremiumOutputMode = "single_transition" | "cinematic_story";

export type InstantPremiumOutputPlan = {
  imageCount: number;
  transitionCount: number;
  totalDurationSeconds: number;
  perTransitionSeconds: number;
  mode: InstantPremiumOutputMode;
};

/** Total target length from image count (used for merge + locked text timing). */
export function resolveInstantPremiumTotalDurationSeconds(imageCount: number): number {
  if (imageCount <= MIN_INSTANT_PREMIUM_IMAGES) {
    return 5;
  }
  if (imageCount === 3) {
    return 8;
  }
  if (imageCount === 4) {
    return 12;
  }
  if (imageCount === 5) {
    return 15;
  }
  return 15 + (imageCount - 5) * 4;
}

/** Per-transition Vidu duration: spread total across segments, clamped 1–16s. */
export function instantPremiumPerTransitionSeconds(
  totalSeconds: number,
  imageCount: number
): number {
  const n = Math.max(1, imageCount - 1);
  const raw = Math.round(totalSeconds / n);
  return Math.max(1, Math.min(16, raw));
}

export function resolveInstantPremiumOutputPlan(imageCount: number): InstantPremiumOutputPlan {
  const safeCount = Math.max(0, imageCount);
  const transitionCount = Math.max(0, safeCount - 1);
  const totalDurationSeconds = resolveInstantPremiumTotalDurationSeconds(safeCount);
  const perTransitionSeconds = instantPremiumPerTransitionSeconds(totalDurationSeconds, safeCount);

  if (safeCount <= MIN_INSTANT_PREMIUM_IMAGES) {
    return {
      imageCount: safeCount,
      transitionCount: Math.max(1, transitionCount),
      totalDurationSeconds: 5,
      perTransitionSeconds: 5,
      mode: "single_transition",
    };
  }

  return {
    imageCount: safeCount,
    transitionCount,
    totalDurationSeconds,
    perTransitionSeconds,
    mode: "cinematic_story",
  };
}
