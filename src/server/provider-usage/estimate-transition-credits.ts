import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";

export type TransitionCreditEstimateInput = {
  presetId: string;
  viduDurationSeconds: number | null;
  instantTransitionSeconds: number;
  estimatedCredits: number | null;
  transitionCount: number;
};

function resolvePresetId(presetId: string): AnimationPresetId {
  return validateAnimationPresetId(presetId) ? presetId : "standard";
}

/** Derive credits from preset × duration when balance delta is unavailable. */
export function estimateCreditsForTransition(input: TransitionCreditEstimateInput): number {
  if (input.estimatedCredits != null && input.estimatedCredits > 0 && input.transitionCount > 0) {
    return Math.max(1, Math.round(input.estimatedCredits / input.transitionCount));
  }
  const preset = getAnimationPreset(resolvePresetId(input.presetId));
  const duration =
    input.viduDurationSeconds ??
    input.instantTransitionSeconds ??
    preset.durationSeconds;
  return Math.max(1, duration * preset.estimatedCreditsPerSecond);
}
