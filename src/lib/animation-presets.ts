/** Shared animation quality presets (server + client safe; no secrets). */

export type AnimationPresetId = "basic" | "standard" | "pro" | "smooth";

/** 1 Vidu credit pricing assumption for UI estimates only (not billing). */
export const CREDIT_USD = 0.005;

export const MIN_ANIMATION_IMAGES = 2;

/** Max length for optional user direction text (enforced server-side too). */
export const MAX_ANIMATION_USER_PROMPT_LENGTH = 500;

export type AnimationPreset = {
  id: AnimationPresetId;
  model: string;
  resolution: string;
  durationSeconds: number;
  maxImages: number;
  maxTransitions: number;
  /** Internal Vidu direction — combined server-side with optional user hint. */
  prompt: string;
  /** viduq3-turbo credits per second of output (estimate). */
  estimatedCreditsPerSecond: number;
  /** durationSeconds × estimatedCreditsPerSecond */
  estimatedCreditsPerTransition: number;
  /** maxTransitions × estimatedCreditsPerTransition */
  estimatedMaxCredits: number;
  /** estimatedMaxCredits × CREDIT_USD */
  estimatedMaxUsd: number;
};

export const ANIMATION_PRESETS: Record<AnimationPresetId, AnimationPreset> = {
  basic: {
    id: "basic",
    model: "viduq3-turbo",
    resolution: "540p",
    durationSeconds: 3,
    maxImages: 3,
    maxTransitions: 2,
    prompt:
      "Continuous transformation between images, simple smooth evolution, no hard cuts, no slideshow effect.",
    estimatedCreditsPerSecond: 8,
    estimatedCreditsPerTransition: 3 * 8,
    estimatedMaxCredits: 2 * 3 * 8,
    estimatedMaxUsd: 2 * 3 * 8 * CREDIT_USD,
  },
  standard: {
    id: "standard",
    model: "viduq3-turbo",
    resolution: "720p",
    durationSeconds: 5,
    maxImages: 5,
    maxTransitions: 4,
    prompt:
      "Continuous cinematic transformation where each image evolves naturally into the next, preserving the main subject, soft motion blur, no cuts or slideshow effect.",
    estimatedCreditsPerSecond: 12,
    estimatedCreditsPerTransition: 5 * 12,
    estimatedMaxCredits: 4 * 5 * 12,
    estimatedMaxUsd: 4 * 5 * 12 * CREDIT_USD,
  },
  smooth: {
    id: "smooth",
    model: "viduq3-turbo",
    resolution: "540p",
    durationSeconds: 5,
    maxImages: 5,
    maxTransitions: 4,
    prompt:
      "Seamless morphing transformation between images, subject remains consistent while the scene evolves fluidly, no hard transitions, no slideshow effect, realistic motion.",
    estimatedCreditsPerSecond: 8,
    estimatedCreditsPerTransition: 5 * 8,
    estimatedMaxCredits: 4 * 5 * 8,
    estimatedMaxUsd: 4 * 5 * 8 * CREDIT_USD,
  },
  pro: {
    id: "pro",
    model: "viduq3-turbo",
    resolution: "1080p",
    durationSeconds: 5,
    maxImages: 7,
    maxTransitions: 6,
    prompt:
      "High-quality cinematic transformation sequence, images evolve into each other as one continuous scene, dynamic camera motion, ultra smooth morphing, no cuts, no slideshow, no artifacts.",
    estimatedCreditsPerSecond: 14,
    estimatedCreditsPerTransition: 5 * 14,
    estimatedMaxCredits: 6 * 5 * 14,
    estimatedMaxUsd: 6 * 5 * 14 * CREDIT_USD,
  },
};

export const PRESET_IDS_ALL: AnimationPresetId[] = ["basic", "standard", "smooth", "pro"];

export function getDefaultAnimationPreset(): AnimationPreset {
  return ANIMATION_PRESETS.standard;
}

export function validateAnimationPresetId(value: unknown): value is AnimationPresetId {
  return (
    value === "basic" ||
    value === "standard" ||
    value === "pro" ||
    value === "smooth"
  );
}

export function getAnimationPreset(presetId: AnimationPresetId): AnimationPreset {
  return ANIMATION_PRESETS[presetId];
}

export function estimatedCreditsPerTransitionFromPreset(preset: AnimationPreset): number {
  return preset.durationSeconds * preset.estimatedCreditsPerSecond;
}

export function estimatedMaxCreditsForPreset(preset: AnimationPreset): number {
  return preset.maxTransitions * estimatedCreditsPerTransitionFromPreset(preset);
}

export function estimatedMaxUsdForPreset(preset: AnimationPreset): number {
  return estimatedMaxCreditsForPreset(preset) * CREDIT_USD;
}

/**
 * Rough project credit estimate: transitions × duration × credits/sec.
 * Uses actual transition count from image count (capped by preset max).
 */
export function estimateProjectCredits(imageCount: number, preset: AnimationPreset): number {
  if (imageCount < MIN_ANIMATION_IMAGES) {
    return 0;
  }
  const transitions = Math.min(imageCount - 1, preset.maxTransitions);
  return transitions * preset.durationSeconds * preset.estimatedCreditsPerSecond;
}

export function estimateProjectUsd(imageCount: number, preset: AnimationPreset): number {
  return estimateProjectCredits(imageCount, preset) * CREDIT_USD;
}
