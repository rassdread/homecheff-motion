import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";

export type AnimationMoodId =
  | "warm"
  | "funny"
  | "emotional"
  | "energetic"
  | "cinematic"
  | "luxury"
  | "playful";

export const ANIMATION_MOOD_IDS: readonly AnimationMoodId[] = [
  "warm",
  "funny",
  "emotional",
  "energetic",
  "cinematic",
  "luxury",
  "playful",
] as const;

export type AnimationMoodConfig = {
  id: AnimationMoodId;
  labelKey: string;
  motionEnergy?: MotionEnergy;
  emotionalActingPreset?: EmotionalActingPresetId;
};

export const ANIMATION_MOOD_PRESETS: Record<AnimationMoodId, AnimationMoodConfig> = {
  warm: {
    id: "warm",
    labelKey: "instant.mood.warm",
    motionEnergy: "expressive",
    emotionalActingPreset: "excited_seller",
  },
  funny: {
    id: "funny",
    labelKey: "instant.mood.funny",
    motionEnergy: "expressive",
    emotionalActingPreset: "playful_mascot",
  },
  emotional: {
    id: "emotional",
    labelKey: "instant.mood.emotional",
    motionEnergy: "cinematic",
    emotionalActingPreset: "confident_presenter",
  },
  energetic: {
    id: "energetic",
    labelKey: "instant.mood.energetic",
    motionEnergy: "energetic",
    emotionalActingPreset: "energetic_creator",
  },
  cinematic: {
    id: "cinematic",
    labelKey: "instant.mood.cinematic",
    motionEnergy: "cinematic",
    emotionalActingPreset: "luxury_showcase",
  },
  luxury: {
    id: "luxury",
    labelKey: "instant.mood.luxury",
    motionEnergy: "cinematic",
    emotionalActingPreset: "luxury_showcase",
  },
  playful: {
    id: "playful",
    labelKey: "instant.mood.playful",
    motionEnergy: "expressive",
    emotionalActingPreset: "playful_mascot",
  },
};

export function isAnimationMoodId(value: string): value is AnimationMoodId {
  return (ANIMATION_MOOD_IDS as readonly string[]).includes(value);
}

export function normalizeAnimationMoodId(value: unknown): AnimationMoodId | undefined {
  if (typeof value === "string" && isAnimationMoodId(value.trim())) {
    return value.trim() as AnimationMoodId;
  }
  return undefined;
}

export function applyMoodToPosterSettings(
  settings: PosterMotionSettings,
  moodId: AnimationMoodId | null | undefined
): PosterMotionSettings {
  if (!moodId) {
    return { ...settings, animationMood: undefined };
  }
  const mood = ANIMATION_MOOD_PRESETS[moodId];
  return {
    ...settings,
    animationMood: moodId,
    ...(mood.motionEnergy ? { motionEnergy: mood.motionEnergy } : {}),
    ...(mood.emotionalActingPreset
      ? { emotionalActingPreset: mood.emotionalActingPreset }
      : {}),
  };
}
