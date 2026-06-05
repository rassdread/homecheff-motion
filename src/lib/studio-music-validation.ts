import {
  MUSIC_CUE_TYPES,
  MUSIC_END_BEHAVIORS,
  MUSIC_ENERGY_TARGETS,
  MUSIC_START_BEHAVIORS,
  MUSIC_TRANSITION_TYPES,
  type MusicCueType,
  type MusicEndBehavior,
  type MusicEnergyTarget,
  type MusicStartBehavior,
  type MusicTransitionType,
} from "@/types/studio-music-director";

export function isMusicCueType(value: string | null | undefined): value is MusicCueType {
  return MUSIC_CUE_TYPES.includes(value as MusicCueType);
}

export function isMusicEnergyTarget(
  value: string | null | undefined
): value is MusicEnergyTarget {
  return MUSIC_ENERGY_TARGETS.includes(value as MusicEnergyTarget);
}

export function isMusicTransitionType(
  value: string | null | undefined
): value is MusicTransitionType {
  return MUSIC_TRANSITION_TYPES.includes(value as MusicTransitionType);
}

export function isMusicStartBehavior(
  value: string | null | undefined
): value is MusicStartBehavior {
  return MUSIC_START_BEHAVIORS.includes(value as MusicStartBehavior);
}

export function isMusicEndBehavior(
  value: string | null | undefined
): value is MusicEndBehavior {
  return MUSIC_END_BEHAVIORS.includes(value as MusicEndBehavior);
}

export const MUSIC_INTENSITY_VALUES = ["subtle", "balanced", "bold", "high"] as const;

export function normalizeMusicIntensity(value: string | null | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (MUSIC_INTENSITY_VALUES.includes(v as (typeof MUSIC_INTENSITY_VALUES)[number])) {
    return v;
  }
  return "balanced";
}
