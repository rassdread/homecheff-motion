/**
 * S.7B — Canonical audio ownership scopes (runtime contracts).
 * Prefer adapters over new tables when Prisma already expresses ownership.
 */

export const STUDIO_AUDIO_OWNERSHIP_SCOPES = [
  "CHARACTER_VOICE",
  "NARRATION",
  "SCENE_SFX",
  "SCENE_AMBIENCE",
  "PROJECT_MUSIC",
  "SUBTITLES",
  "TRANSLATION",
  "AUDIO_MIX",
] as const;

export type StudioAudioOwnershipScope = (typeof STUDIO_AUDIO_OWNERSHIP_SCOPES)[number];

export type StudioAudioOwnershipDescriptor = {
  scope: StudioAudioOwnershipScope;
  /** Prisma / library SoT */
  sourceOfTruth: string;
  notes: string;
};

export const STUDIO_AUDIO_OWNERSHIP: Record<
  StudioAudioOwnershipScope,
  StudioAudioOwnershipDescriptor
> = {
  CHARACTER_VOICE: {
    scope: "CHARACTER_VOICE",
    sourceOfTruth: "StudioCharacter.voice* + StudioCharacterVoiceHistory",
    notes: "Character owns persistent voice identity; voiceLock soft-enforced via resolver.",
  },
  NARRATION: {
    scope: "NARRATION",
    sourceOfTruth: "StudioStoryboard.voice* + StudioStoryboardVoice",
    notes: "Narrator / unassigned speech / project default TTS.",
  },
  SCENE_SFX: {
    scope: "SCENE_SFX",
    sourceOfTruth: "StudioScene sound* overrides + Sound Director cues (planning)",
    notes: "Planning cues only today — render uses one project/library bed, not timed hits.",
  },
  SCENE_AMBIENCE: {
    scope: "SCENE_AMBIENCE",
    sourceOfTruth: "SFX subtype / Sound Director ambient cues",
    notes: "Ambience is an SFX semantic subtype — no separate engine.",
  },
  PROJECT_MUSIC: {
    scope: "PROJECT_MUSIC",
    sourceOfTruth: "StudioStoryboard.music* + audioAssetMetadataJson.musicAssetId + user library",
    notes: "One project music bed — not independent per-scene stems.",
  },
  SUBTITLES: {
    scope: "SUBTITLES",
    sourceOfTruth: "StudioStoryboardSubtitleTrack",
    notes: "Per storyboard + language; fixed ASS burn-in style.",
  },
  TRANSLATION: {
    scope: "TRANSLATION",
    sourceOfTruth: "VideoLanguageExport + overlay pipeline",
    notes: "Overlay/text export — NOT dubbing.",
  },
  AUDIO_MIX: {
    scope: "AUDIO_MIX",
    sourceOfTruth: "Audio Production Director plan + FFmpeg mix resolve",
    notes: "Voice ± 1 music bed ± 1 SFX bed; static ducking.",
  },
};

export const STUDIO_AUDIO_NOT_IMPLEMENTED = {
  DUBBING: "NOT_IMPLEMENTED" as const,
  AI_LIPSYNC: "NOT_IMPLEMENTED" as const,
};

export type StudioAudioCachePolicy = {
  /** Legitimate cache hit: no new provider call / no new user charge. */
  cacheHit: "CACHE_HIT_NO_CHARGE";
};

export const STUDIO_AUDIO_CACHE_POLICY: StudioAudioCachePolicy = {
  cacheHit: "CACHE_HIT_NO_CHARGE",
};

export type StudioAudioBypassClass =
  | "TEST_ONLY"
  | "ADMIN_ONLY"
  | "INTERNAL_PIPELINE"
  | "PRODUCTION_USER";

/** Classify known bypasses — PRODUCTION_USER must never get free provider generation. */
export function classifyAudioBillingBypass(input: {
  isAdmin?: boolean;
  isTestEnv?: boolean;
  productionChainBypass?: boolean;
}): StudioAudioBypassClass {
  if (input.isTestEnv) return "TEST_ONLY";
  if (input.productionChainBypass) return "INTERNAL_PIPELINE";
  if (input.isAdmin) return "ADMIN_ONLY";
  return "PRODUCTION_USER";
}

export function isAudioBypassAllowedForNormalUser(
  classification: StudioAudioBypassClass
): boolean {
  return classification === "PRODUCTION_USER" ? false : true;
}
