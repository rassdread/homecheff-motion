import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type {
  MusicCueType,
  MusicEndBehavior,
  MusicStartBehavior,
  MusicTransitionType,
} from "@/types/studio-music-director";

export const STUDIO_MUSIC_PROFILE_IDS = [
  "cinematic",
  "inspirational",
  "corporate",
  "emotional",
  "epic",
  "documentary",
  "social_media",
  "tech_startup",
  "community",
  "adventure",
] as const;

export type StudioMusicProfileId = (typeof STUDIO_MUSIC_PROFILE_IDS)[number];

export type StudioMusicProfile = {
  id: StudioMusicProfileId;
  labelKey: `studio.music.profile.${StudioMusicProfileId}`;
  tempoRange: [number, number];
  energyRange: [number, number];
  instrumentStyle: string;
  transitionStyle: MusicTransitionType;
  defaultIntensity: "subtle" | "balanced" | "bold";
  cueBehaviors: Partial<
    Record<
      MusicCueType,
      { start: MusicStartBehavior; end: MusicEndBehavior; transition: MusicTransitionType }
    >
  >;
};

export const STUDIO_MUSIC_PROFILES: Record<StudioMusicProfileId, StudioMusicProfile> = {
  cinematic: {
    id: "cinematic",
    labelKey: "studio.music.profile.cinematic",
    tempoRange: [72, 108],
    energyRange: [0.35, 0.9],
    instrumentStyle: "orchestral_hybrid",
    transitionStyle: "crossfade",
    defaultIntensity: "balanced",
    cueBehaviors: {
      intro: { start: "fade_in", end: "tail", transition: "ambient_bridge" },
      climax: { start: "hard_start", end: "fade_out", transition: "riser" },
    },
  },
  inspirational: {
    id: "inspirational",
    labelKey: "studio.music.profile.inspirational",
    tempoRange: [90, 124],
    energyRange: [0.45, 0.95],
    instrumentStyle: "uplift_piano_strings",
    transitionStyle: "riser",
    defaultIntensity: "bold",
    cueBehaviors: {
      build: { start: "fade_in", end: "tail", transition: "riser" },
      climax: { start: "hard_start", end: "fade_out", transition: "riser" },
    },
  },
  corporate: {
    id: "corporate",
    labelKey: "studio.music.profile.corporate",
    tempoRange: [96, 118],
    energyRange: [0.3, 0.65],
    instrumentStyle: "clean_modern",
    transitionStyle: "crossfade",
    defaultIntensity: "subtle",
    cueBehaviors: {
      intro: { start: "ambient_pad", end: "fade_out", transition: "crossfade" },
      resolution: { start: "fade_in", end: "fade_out", transition: "crossfade" },
    },
  },
  emotional: {
    id: "emotional",
    labelKey: "studio.music.profile.emotional",
    tempoRange: [68, 96],
    energyRange: [0.25, 0.75],
    instrumentStyle: "piano_ambient",
    transitionStyle: "ambient_bridge",
    defaultIntensity: "balanced",
    cueBehaviors: {
      build: { start: "fade_in", end: "tail", transition: "ambient_bridge" },
    },
  },
  epic: {
    id: "epic",
    labelKey: "studio.music.profile.epic",
    tempoRange: [84, 140],
    energyRange: [0.55, 1],
    instrumentStyle: "dramatic_orchestral",
    transitionStyle: "riser",
    defaultIntensity: "bold",
    cueBehaviors: {
      climax: { start: "hard_start", end: "hard_end", transition: "riser" },
    },
  },
  documentary: {
    id: "documentary",
    labelKey: "studio.music.profile.documentary",
    tempoRange: [60, 92],
    energyRange: [0.2, 0.55],
    instrumentStyle: "ambient_minimal",
    transitionStyle: "ambient_bridge",
    defaultIntensity: "subtle",
    cueBehaviors: {
      intro: { start: "ambient_pad", end: "fade_out", transition: "ambient_bridge" },
    },
  },
  social_media: {
    id: "social_media",
    labelKey: "studio.music.profile.social_media",
    tempoRange: [100, 128],
    energyRange: [0.5, 0.95],
    instrumentStyle: "pop_electronic",
    transitionStyle: "hard_cut",
    defaultIntensity: "bold",
    cueBehaviors: {
      build: { start: "hard_start", end: "hard_end", transition: "hard_cut" },
    },
  },
  tech_startup: {
    id: "tech_startup",
    labelKey: "studio.music.profile.tech_startup",
    tempoRange: [104, 126],
    energyRange: [0.4, 0.8],
    instrumentStyle: "synth_modern",
    transitionStyle: "crossfade",
    defaultIntensity: "balanced",
    cueBehaviors: {
      build: { start: "fade_in", end: "tail", transition: "riser" },
    },
  },
  community: {
    id: "community",
    labelKey: "studio.music.profile.community",
    tempoRange: [88, 112],
    energyRange: [0.35, 0.7],
    instrumentStyle: "acoustic_warm",
    transitionStyle: "crossfade",
    defaultIntensity: "balanced",
    cueBehaviors: {
      resolution: { start: "fade_in", end: "fade_out", transition: "crossfade" },
    },
  },
  adventure: {
    id: "adventure",
    labelKey: "studio.music.profile.adventure",
    tempoRange: [96, 132],
    energyRange: [0.5, 0.95],
    instrumentStyle: "percussion_forward",
    transitionStyle: "riser",
    defaultIntensity: "bold",
    cueBehaviors: {
      build: { start: "fade_in", end: "tail", transition: "riser" },
      climax: { start: "hard_start", end: "fade_out", transition: "riser" },
    },
  },
};

const DIRECTOR_TO_MUSIC_PROFILE: Record<StudioDirectorProfile, StudioMusicProfileId> = {
  commercial: "corporate",
  documentary: "documentary",
  cinematic: "cinematic",
  social_media: "social_media",
  storytelling: "emotional",
  educational: "documentary",
};

export function isStudioMusicProfileId(value: string | null | undefined): value is StudioMusicProfileId {
  return STUDIO_MUSIC_PROFILE_IDS.includes(value as StudioMusicProfileId);
}

export function normalizeStudioMusicProfileId(
  value: string | null | undefined,
  fallback: StudioMusicProfileId = "cinematic"
): StudioMusicProfileId {
  const v = (value ?? "").trim().toLowerCase();
  return isStudioMusicProfileId(v) ? v : fallback;
}

export function resolveMusicProfileForDirector(
  directorProfile: StudioDirectorProfile,
  overrideStyle?: string | null
): StudioMusicProfile {
  const id = normalizeStudioMusicProfileId(
    overrideStyle?.trim() || DIRECTOR_TO_MUSIC_PROFILE[directorProfile],
    DIRECTOR_TO_MUSIC_PROFILE[directorProfile]
  );
  return STUDIO_MUSIC_PROFILES[id];
}

export function getStudioMusicProfile(id: StudioMusicProfileId): StudioMusicProfile {
  return STUDIO_MUSIC_PROFILES[id];
}
