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
import type { InstantSceneText, NormalizedSceneText } from "@/lib/story-overlay-templates";
import {
  getStoryTransitionDurationSeconds,
  hasCustomTransitionDurations,
  resolveViduSegmentDurationsFromStoryboard,
} from "@/lib/story-overlay-templates";
import { MIN_INSTANT_PREMIUM_IMAGES } from "@/lib/instant-premium-pricing";

export type InstantPremiumOutputMode = "single_transition" | "cinematic_story" | "story_multiframe";

export type InstantPremiumOutputPlan = {
  imageCount: number;
  transitionCount: number;
  /** @deprecated Same as providerDurationSeconds in Story Mode (transition sum). */
  storyboardDurationSeconds: number;
  /** Vidu-generated / billable video duration (sum of transition durations). */
  providerDurationSeconds: number;
  /** @deprecated Use storyboardDurationSeconds */
  totalDurationSeconds: number;
  perTransitionSeconds: number;
  /** Vidu-requested duration per segment (first segment when durations vary). */
  viduSegmentDurationSeconds: number;
  /** @deprecated Use providerDurationSeconds */
  viduTotalDurationSeconds: number;
  /** providerDurationSeconds / storyboardDurationSeconds when storyboard > 0 */
  durationScale: number;
  providerSegmentCount: number;
  mode: InstantPremiumOutputMode;
  instantMode: InstantMode;
  transitionSeconds: InstantTransitionSeconds;
};

export type ResolveInstantPremiumOutputPlanInput = {
  imageCount: number;
  instantMode?: InstantMode | string | null;
  transitionSeconds?: InstantTransitionSeconds | number | null;
  sceneTexts?: InstantSceneText[] | NormalizedSceneText[] | null;
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

function buildPlanFields(params: {
  safeCount: number;
  instantMode: InstantMode;
  transitionSeconds: InstantTransitionSeconds;
  transitionCount: number;
  sceneTexts: InstantSceneText[] | NormalizedSceneText[];
}): Pick<
  InstantPremiumOutputPlan,
  | "storyboardDurationSeconds"
  | "providerDurationSeconds"
  | "viduSegmentDurationSeconds"
  | "durationScale"
  | "providerSegmentCount"
  | "perTransitionSeconds"
> {
  const { safeCount, instantMode, transitionSeconds, transitionCount, sceneTexts } = params;
  const customTransitions = instantMode === "story" && hasCustomTransitionDurations(sceneTexts);
  let storyboardDurationSeconds =
    customTransitions ?
      getStoryTransitionDurationSeconds(sceneTexts, safeCount, transitionSeconds)
    : getInstantOutputDurationSeconds(safeCount, transitionSeconds);

  const providerSegmentCount = Math.max(0, transitionCount);
  let providerDurationSeconds: number;
  let viduSegmentDurationSeconds: number;

  if (instantMode === "story") {
    if (customTransitions) {
      const segments = resolveViduSegmentDurationsFromStoryboard(
        sceneTexts,
        safeCount,
        transitionSeconds
      );
      providerDurationSeconds = segments.reduce((sum, value) => sum + value, 0);
      storyboardDurationSeconds = providerDurationSeconds;
      viduSegmentDurationSeconds =
        segments[0] ?? viduMultiframeSegmentDurationSeconds(transitionSeconds);
    } else {
      viduSegmentDurationSeconds = viduMultiframeSegmentDurationSeconds(transitionSeconds);
      providerDurationSeconds = viduMultiframeTotalDurationSeconds(safeCount, transitionSeconds);
    }
  } else {
    viduSegmentDurationSeconds = Math.max(1, Math.min(16, transitionSeconds));
    providerDurationSeconds = providerSegmentCount * viduSegmentDurationSeconds;
  }

  const durationScale =
    storyboardDurationSeconds > 0 ?
      providerDurationSeconds / storyboardDurationSeconds
    : 1;

  const perTransitionSeconds =
    instantMode === "story" ? viduSegmentDurationSeconds : viduSegmentDurationSeconds;

  return {
    storyboardDurationSeconds,
    providerDurationSeconds,
    viduSegmentDurationSeconds,
    durationScale,
    providerSegmentCount,
    perTransitionSeconds,
  };
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
  const sceneTexts = params.sceneTexts ?? [];
  const durations = buildPlanFields({
    safeCount,
    instantMode,
    transitionSeconds,
    transitionCount,
    sceneTexts,
  });

  const base = {
    imageCount: safeCount,
    transitionCount,
    ...durations,
    totalDurationSeconds: durations.storyboardDurationSeconds,
    viduTotalDurationSeconds: durations.providerDurationSeconds,
    instantMode,
    transitionSeconds,
  };

  if (instantMode === "story" && safeCount >= MIN_INSTANT_PREMIUM_IMAGES) {
    return {
      ...base,
      mode: "story_multiframe",
    };
  }

  if (safeCount <= MIN_INSTANT_PREMIUM_IMAGES) {
    return {
      ...base,
      perTransitionSeconds: transitionSeconds,
      viduSegmentDurationSeconds: Math.max(1, Math.min(16, transitionSeconds)),
      providerDurationSeconds:
        Math.max(1, transitionCount) * Math.max(1, Math.min(16, transitionSeconds)),
      storyboardDurationSeconds: getInstantOutputDurationSeconds(safeCount, transitionSeconds),
      totalDurationSeconds: getInstantOutputDurationSeconds(safeCount, transitionSeconds),
      viduTotalDurationSeconds:
        Math.max(1, transitionCount) * Math.max(1, Math.min(16, transitionSeconds)),
      durationScale: 1,
      mode: "single_transition",
      instantMode: "transition",
    };
  }

  return {
    ...base,
    perTransitionSeconds: transitionSeconds,
    mode: "cinematic_story",
    instantMode: "transition",
  };
}

/** Credit estimate from provider (generated) video duration. */
export function estimateInstantPremiumCreditsForPlan(
  plan: InstantPremiumOutputPlan,
  creditsPerSecond: number
): number {
  return Math.round(plan.providerDurationSeconds * creditsPerSecond);
}
