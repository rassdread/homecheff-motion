import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";

export const STUDIO_SOUND_PROFILE_IDS = [
  "corporate",
  "documentary",
  "community",
  "epic",
  "minimal",
  "realistic",
  "energetic",
] as const;

export type StudioSoundProfileId = (typeof STUDIO_SOUND_PROFILE_IDS)[number];

export type StudioSoundProfile = {
  id: StudioSoundProfileId;
  labelKey: `studio.sound.profile.${StudioSoundProfileId}`;
  defaultDensity: "minimal" | "balanced" | "rich";
  transitionBias: "subtle" | "cinematic" | "punchy";
  ambientBias: "low" | "medium" | "high";
};

export const STUDIO_SOUND_PROFILES: Record<StudioSoundProfileId, StudioSoundProfile> = {
  corporate: {
    id: "corporate",
    labelKey: "studio.sound.profile.corporate",
    defaultDensity: "minimal",
    transitionBias: "subtle",
    ambientBias: "low",
  },
  documentary: {
    id: "documentary",
    labelKey: "studio.sound.profile.documentary",
    defaultDensity: "balanced",
    transitionBias: "subtle",
    ambientBias: "high",
  },
  community: {
    id: "community",
    labelKey: "studio.sound.profile.community",
    defaultDensity: "balanced",
    transitionBias: "subtle",
    ambientBias: "medium",
  },
  epic: {
    id: "epic",
    labelKey: "studio.sound.profile.epic",
    defaultDensity: "rich",
    transitionBias: "cinematic",
    ambientBias: "medium",
  },
  minimal: {
    id: "minimal",
    labelKey: "studio.sound.profile.minimal",
    defaultDensity: "minimal",
    transitionBias: "subtle",
    ambientBias: "low",
  },
  realistic: {
    id: "realistic",
    labelKey: "studio.sound.profile.realistic",
    defaultDensity: "balanced",
    transitionBias: "subtle",
    ambientBias: "medium",
  },
  energetic: {
    id: "energetic",
    labelKey: "studio.sound.profile.energetic",
    defaultDensity: "rich",
    transitionBias: "punchy",
    ambientBias: "medium",
  },
};

const DIRECTOR_TO_SOUND_PROFILE: Record<StudioDirectorProfile, StudioSoundProfileId> = {
  commercial: "corporate",
  documentary: "documentary",
  cinematic: "epic",
  social_media: "energetic",
  storytelling: "community",
  educational: "minimal",
};

export function isStudioSoundProfileId(
  value: string | null | undefined
): value is StudioSoundProfileId {
  return STUDIO_SOUND_PROFILE_IDS.includes(value as StudioSoundProfileId);
}

export function normalizeStudioSoundProfileId(
  value: string | null | undefined,
  fallback: StudioSoundProfileId = "realistic"
): StudioSoundProfileId {
  const v = (value ?? "").trim().toLowerCase();
  return isStudioSoundProfileId(v) ? v : fallback;
}

export function resolveSoundProfileForDirector(
  directorProfile: StudioDirectorProfile,
  overrideStyle?: string | null
): StudioSoundProfile {
  const id = normalizeStudioSoundProfileId(
    overrideStyle?.trim() || DIRECTOR_TO_SOUND_PROFILE[directorProfile],
    DIRECTOR_TO_SOUND_PROFILE[directorProfile]
  );
  return STUDIO_SOUND_PROFILES[id];
}

export function getStudioSoundProfile(id: StudioSoundProfileId): StudioSoundProfile {
  return STUDIO_SOUND_PROFILES[id];
}

export const SOUND_DENSITY_VALUES = ["minimal", "balanced", "rich"] as const;

export type SoundDensity = (typeof SOUND_DENSITY_VALUES)[number];

export function normalizeSoundDensity(value: string | null | undefined): SoundDensity {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "minimal" || v === "rich") {
    return v;
  }
  return "balanced";
}
