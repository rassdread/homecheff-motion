/**
 * Studio V28 — ElevenLabs-oriented voice presets (planning only).
 */

export const STUDIO_NARRATION_MODES = [
  "narrator",
  "founder",
  "documentary",
  "commercial",
  "cinematic",
  "educational",
] as const;

export type StudioNarrationMode = (typeof STUDIO_NARRATION_MODES)[number];

export const STUDIO_VOICE_PROFILE_IDS = [
  "warm_narrator",
  "documentary",
  "commercial",
  "inspirational_founder",
  "premium_brand",
  "educational",
] as const;

export type StudioVoiceProfileId = (typeof STUDIO_VOICE_PROFILE_IDS)[number];

export type StudioVoiceEmotionProfile = {
  warmth: number;
  authority: number;
  energy: number;
  intimacy: number;
};

export type StudioVoiceProfilePreset = {
  id: StudioVoiceProfileId;
  labelKey: string;
  elevenLabsVoiceRecommendation: string;
  stability: number;
  similarity: number;
  style: number;
  speakingPaceWpm: number;
  emotionProfile: StudioVoiceEmotionProfile;
  /** Suggested narration mode when this preset is chosen. */
  suggestedNarrationMode: StudioNarrationMode;
};

export const STUDIO_VOICE_PROFILE_PRESETS: Record<StudioVoiceProfileId, StudioVoiceProfilePreset> = {
  warm_narrator: {
    id: "warm_narrator",
    labelKey: "studio.voice.preset.warmNarrator",
    elevenLabsVoiceRecommendation: "eleven_multilingual_v2 — warm neutral narrator",
    stability: 0.55,
    similarity: 0.78,
    style: 0.35,
    speakingPaceWpm: 148,
    emotionProfile: { warmth: 0.85, authority: 0.5, energy: 0.45, intimacy: 0.7 },
    suggestedNarrationMode: "narrator",
  },
  documentary: {
    id: "documentary",
    labelKey: "studio.voice.preset.documentary",
    elevenLabsVoiceRecommendation: "eleven_multilingual_v2 — calm documentary male",
    stability: 0.72,
    similarity: 0.82,
    style: 0.2,
    speakingPaceWpm: 138,
    emotionProfile: { warmth: 0.45, authority: 0.8, energy: 0.35, intimacy: 0.4 },
    suggestedNarrationMode: "documentary",
  },
  commercial: {
    id: "commercial",
    labelKey: "studio.voice.preset.commercial",
    elevenLabsVoiceRecommendation: "eleven_turbo_v2 — upbeat commercial voice",
    stability: 0.48,
    similarity: 0.75,
    style: 0.55,
    speakingPaceWpm: 162,
    emotionProfile: { warmth: 0.6, authority: 0.55, energy: 0.8, intimacy: 0.35 },
    suggestedNarrationMode: "commercial",
  },
  inspirational_founder: {
    id: "inspirational_founder",
    labelKey: "studio.voice.preset.inspirationalFounder",
    elevenLabsVoiceRecommendation: "eleven_multilingual_v2 — passionate founder",
    stability: 0.5,
    similarity: 0.8,
    style: 0.45,
    speakingPaceWpm: 155,
    emotionProfile: { warmth: 0.75, authority: 0.65, energy: 0.7, intimacy: 0.65 },
    suggestedNarrationMode: "founder",
  },
  premium_brand: {
    id: "premium_brand",
    labelKey: "studio.voice.preset.premiumBrand",
    elevenLabsVoiceRecommendation: "eleven_multilingual_v2 — luxury brand narrator",
    stability: 0.65,
    similarity: 0.85,
    style: 0.4,
    speakingPaceWpm: 142,
    emotionProfile: { warmth: 0.55, authority: 0.75, energy: 0.5, intimacy: 0.5 },
    suggestedNarrationMode: "cinematic",
  },
  educational: {
    id: "educational",
    labelKey: "studio.voice.preset.educational",
    elevenLabsVoiceRecommendation: "eleven_turbo_v2 — clear educational narrator",
    stability: 0.7,
    similarity: 0.8,
    style: 0.25,
    speakingPaceWpm: 145,
    emotionProfile: { warmth: 0.5, authority: 0.7, energy: 0.45, intimacy: 0.45 },
    suggestedNarrationMode: "educational",
  },
};

const NARRATION_MODE_TO_PROFILE: Partial<Record<StudioNarrationMode, StudioVoiceProfileId>> = {
  narrator: "warm_narrator",
  founder: "inspirational_founder",
  documentary: "documentary",
  commercial: "commercial",
  cinematic: "premium_brand",
  educational: "educational",
};

export function isStudioNarrationMode(value: string): value is StudioNarrationMode {
  return (STUDIO_NARRATION_MODES as readonly string[]).includes(value);
}

export function isStudioVoiceProfileId(value: string): value is StudioVoiceProfileId {
  return (STUDIO_VOICE_PROFILE_IDS as readonly string[]).includes(value);
}

export function normalizeStudioNarrationMode(value: string | undefined | null): StudioNarrationMode {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioNarrationMode(trimmed) ? trimmed : "narrator";
}

export function normalizeStudioVoiceProfileId(value: string | undefined | null): StudioVoiceProfileId {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (isStudioVoiceProfileId(trimmed)) {
    return trimmed;
  }
  return "warm_narrator";
}

export function getVoiceProfilePreset(id: string): StudioVoiceProfilePreset {
  return STUDIO_VOICE_PROFILE_PRESETS[normalizeStudioVoiceProfileId(id)];
}

export function profileIdForNarrationMode(mode: StudioNarrationMode): StudioVoiceProfileId {
  return NARRATION_MODE_TO_PROFILE[mode] ?? "warm_narrator";
}

export function voiceStyleFromProfile(id: StudioVoiceProfileId): string {
  const preset = STUDIO_VOICE_PROFILE_PRESETS[id];
  if (preset.emotionProfile.energy >= 0.7) {
    return "energetic";
  }
  if (preset.emotionProfile.authority >= 0.75) {
    return "authoritative";
  }
  if (preset.emotionProfile.warmth >= 0.75) {
    return "warm";
  }
  return "balanced";
}
