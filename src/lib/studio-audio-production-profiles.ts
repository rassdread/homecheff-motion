import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";

export const STUDIO_AUDIO_STYLE_IDS = [
  "corporate",
  "documentary",
  "cinematic",
  "balanced",
  "natural",
] as const;

export type StudioAudioStyleId = (typeof STUDIO_AUDIO_STYLE_IDS)[number];

export const AUDIO_PRIORITY_STRATEGIES = ["voice_first", "balanced", "cinematic"] as const;

export type AudioPriorityStrategy = (typeof AUDIO_PRIORITY_STRATEGIES)[number];

export type StudioAudioStyleProfile = {
  id: StudioAudioStyleId;
  labelKey: `studio.audio.profile.${StudioAudioStyleId}`;
  defaultStrategy: AudioPriorityStrategy;
  voiceBias: number;
  musicBias: number;
  soundBias: number;
};

export const STUDIO_AUDIO_STYLE_PROFILES: Record<StudioAudioStyleId, StudioAudioStyleProfile> = {
  corporate: {
    id: "corporate",
    labelKey: "studio.audio.profile.corporate",
    defaultStrategy: "voice_first",
    voiceBias: 1.1,
    musicBias: 0.7,
    soundBias: 0.6,
  },
  documentary: {
    id: "documentary",
    labelKey: "studio.audio.profile.documentary",
    defaultStrategy: "balanced",
    voiceBias: 1,
    musicBias: 0.75,
    soundBias: 0.9,
  },
  cinematic: {
    id: "cinematic",
    labelKey: "studio.audio.profile.cinematic",
    defaultStrategy: "cinematic",
    voiceBias: 0.9,
    musicBias: 1.15,
    soundBias: 1.05,
  },
  balanced: {
    id: "balanced",
    labelKey: "studio.audio.profile.balanced",
    defaultStrategy: "balanced",
    voiceBias: 1,
    musicBias: 1,
    soundBias: 1,
  },
  natural: {
    id: "natural",
    labelKey: "studio.audio.profile.natural",
    defaultStrategy: "balanced",
    voiceBias: 1.05,
    musicBias: 0.8,
    soundBias: 0.85,
  },
};

const DIRECTOR_TO_AUDIO_STYLE: Record<StudioDirectorProfile, StudioAudioStyleId> = {
  commercial: "corporate",
  documentary: "documentary",
  cinematic: "cinematic",
  social_media: "balanced",
  storytelling: "natural",
  educational: "corporate",
};

export function isStudioAudioStyleId(value: string | null | undefined): value is StudioAudioStyleId {
  return STUDIO_AUDIO_STYLE_IDS.includes(value as StudioAudioStyleId);
}

export function normalizeStudioAudioStyleId(
  value: string | null | undefined,
  fallback: StudioAudioStyleId = "balanced"
): StudioAudioStyleId {
  const v = (value ?? "").trim().toLowerCase();
  return isStudioAudioStyleId(v) ? v : fallback;
}

export function resolveAudioStyleForDirector(
  directorProfile: StudioDirectorProfile,
  override?: string | null
): StudioAudioStyleProfile {
  const id = normalizeStudioAudioStyleId(
    override?.trim() || DIRECTOR_TO_AUDIO_STYLE[directorProfile],
    DIRECTOR_TO_AUDIO_STYLE[directorProfile]
  );
  return STUDIO_AUDIO_STYLE_PROFILES[id];
}

export function normalizeAudioPriorityStrategy(
  value: string | null | undefined,
  fallback: AudioPriorityStrategy = "balanced"
): AudioPriorityStrategy {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "voice_first" || v === "cinematic") {
    return v;
  }
  if (v === "natural") {
    return "balanced";
  }
  return fallback;
}

/** Named mix templates (recommendations only, 0–100). */
export const MIX_TEMPLATES = {
  voice_heavy: { voice: 100, music: 25, sound: 20 },
  montage: { voice: 0, music: 100, sound: 40 },
  balanced: { voice: 70, music: 60, sound: 50 },
  sound_action: { voice: 50, music: 40, sound: 90 },
  climax: { voice: 60, music: 90, sound: 80 },
  opening_clean: { voice: 80, music: 30, sound: 25 },
  resolution: { voice: 75, music: 35, sound: 30 },
} as const;
