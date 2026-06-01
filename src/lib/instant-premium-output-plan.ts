import {
  getInstantOutputDurationSeconds,
  getInstantTransitionCount,
  type InstantMode,
  type InstantTransitionSeconds,
  normalizeInstantTransitionSeconds,
  parseInstantMode,
  viduMultiframeSegmentDurationSeconds,
  viduMultiframeTotalDurationSeconds,
} from "@/lib/instant-premium-mode-types";
import { MIN_INSTANT_PREMIUM_IMAGES } from "@/lib/instant-premium-pricing";

export type InstantPremiumOutputMode = "single_transition" | "cinematic_story" | "story_multiframe";

export type InstantPremiumOutputPlan = {
  imageCount: number;
  transitionCount: number;
  totalDurationSeconds: number;
  perTransitionSeconds: number;
  /** Vidu-requested duration per segment (may differ from UI transition seconds in story mode). */
  viduSegmentDurationSeconds: number;
  /** Story multiframe: sum of Vidu segment durations. */
  viduTotalDurationSeconds: number;
  mode: InstantPremiumOutputMode;
  instantMode: InstantMode;
  transitionSeconds: InstantTransitionSeconds;
};

export type ResolveInstantPremiumOutputPlanInput = {
  imageCount: number;
  instantMode?: InstantMode | string | null;
  transitionSeconds?: InstantTransitionSeconds | number | null;
};

/** Total target length from image count and per-transition seconds. */
export function resolveInstantPremiumTotalDurationSeconds(
  imageCount: number,
  transitionSeconds: InstantTransitionSeconds = 5
): number {
  return getInstantOutputDurationSeconds(imageCount, transitionSeconds);
}

/** Per-transition Vidu duration for transition mode (start-end2video, clamped 1–16s). */
export function instantPremiumPerTransitionSeconds(
  totalSeconds: number,
  imageCount: number
): number {
  const n = Math.max(1, imageCount - 1);
  const raw = Math.round(totalSeconds / n);
  return Math.max(1, Math.min(16, raw));
}

export function resolveInstantPremiumOutputPlan(
  input: number | ResolveInstantPremiumOutputPlanInput
): InstantPremiumOutputPlan {
  const params: ResolveInstantPremiumOutputPlanInput =
    typeof input === "number" ? { imageCount: input } : input;
  const safeCount = Math.max(0, params.imageCount);
  const instantMode = parseInstantMode(params.instantMode);
  const transitionSeconds = normalizeInstantTransitionSeconds(params.transitionSeconds);
  const transitionCount = getInstantTransitionCount(safeCount);
  const totalDurationSeconds = getInstantOutputDurationSeconds(safeCount, transitionSeconds);
  const viduSegmentDurationSeconds =
    instantMode === "story" ?
      viduMultiframeSegmentDurationSeconds(transitionSeconds)
    : Math.max(1, Math.min(16, transitionSeconds));
  const viduTotalDurationSeconds =
    instantMode === "story" ?
      viduMultiframeTotalDurationSeconds(safeCount, transitionSeconds)
    : transitionCount * viduSegmentDurationSeconds;

  const perTransitionSeconds =
    instantMode === "story" ?
      viduSegmentDurationSeconds
    : viduSegmentDurationSeconds;

  if (instantMode === "story" && safeCount >= MIN_INSTANT_PREMIUM_IMAGES) {
    return {
      imageCount: safeCount,
      transitionCount,
      totalDurationSeconds,
      perTransitionSeconds,
      viduSegmentDurationSeconds,
      viduTotalDurationSeconds,
      mode: "story_multiframe",
      instantMode,
      transitionSeconds,
    };
  }

  if (safeCount <= MIN_INSTANT_PREMIUM_IMAGES) {
    return {
      imageCount: safeCount,
      transitionCount: Math.max(1, transitionCount),
      totalDurationSeconds,
      perTransitionSeconds: transitionSeconds,
      viduSegmentDurationSeconds: Math.max(1, Math.min(16, transitionSeconds)),
      viduTotalDurationSeconds: transitionCount * Math.max(1, Math.min(16, transitionSeconds)),
      mode: "single_transition",
      instantMode: "transition",
      transitionSeconds,
    };
  }

  return {
    imageCount: safeCount,
    transitionCount,
    totalDurationSeconds,
    perTransitionSeconds: transitionSeconds,
    viduSegmentDurationSeconds,
    viduTotalDurationSeconds,
    mode: "cinematic_story",
    instantMode: "transition",
    transitionSeconds,
  };
}
