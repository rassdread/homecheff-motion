/**
 * Curated voice persona presets mapped to ElevenLabs library voices (no AI).
 */

import { canonicalAccentForVoice } from "@/lib/studio-voice-accent-model";
import {
  findVoiceLibraryEntry,
  type VoiceLibraryCatalog,
  type VoiceLibraryEntry,
} from "@/lib/studio-voice-library-catalog";

export type VoicePersonaPresetGroupId = "chef" | "garden" | "designer" | "community";

export type VoicePersonaPresetDefinition = {
  id: string;
  groupId: VoicePersonaPresetGroupId;
  labelKey: string;
  accentCanonicalId: string;
  language: string;
  gender?: "male" | "female";
  fallbackVoiceId: string;
  matchHints: {
    accentRaw?: string[];
    nameContains?: string[];
  };
};

export type VoicePersonaResolvedPreset = {
  id: string;
  groupId: VoicePersonaPresetGroupId;
  labelKey: string;
  accentCanonicalId: string;
  language: string;
  voiceId: string;
  voiceName: string;
  previewUrl: string;
  resolved: boolean;
};

export const VOICE_PERSONA_PRESET_DEFINITIONS: VoicePersonaPresetDefinition[] = [
  {
    id: "british_chef",
    groupId: "chef",
    labelKey: "studio.voicePersona.chef.britishChef",
    accentCanonicalId: "english.british",
    language: "en",
    gender: "male",
    fallbackVoiceId: "mock-british-chef",
    matchHints: { accentRaw: ["british"], nameContains: ["oliver", "daniel", "george"] },
  },
  {
    id: "jamaican_street_chef",
    groupId: "chef",
    labelKey: "studio.voicePersona.chef.jamaicanStreetChef",
    accentCanonicalId: "english.jamaican",
    language: "en",
    gender: "male",
    fallbackVoiceId: "mock-jamaican-chef",
    matchHints: { accentRaw: ["jamaican"], nameContains: ["marcus"] },
  },
  {
    id: "italian_restaurant_owner",
    groupId: "chef",
    labelKey: "studio.voicePersona.chef.italianRestaurantOwner",
    accentCanonicalId: "english.british",
    language: "en",
    gender: "male",
    fallbackVoiceId: "mock-italian",
    matchHints: { accentRaw: ["italian"], nameContains: ["giovanni", "marco"] },
  },
  {
    id: "american_food_host",
    groupId: "chef",
    labelKey: "studio.voicePersona.chef.americanFoodHost",
    accentCanonicalId: "english.american",
    language: "en",
    gender: "female",
    fallbackVoiceId: "EXAVITQu4vr4xnSDxMaL",
    matchHints: { accentRaw: ["american"], nameContains: ["bella", "rachel"] },
  },
  {
    id: "community_gardener",
    groupId: "garden",
    labelKey: "studio.voicePersona.garden.communityGardener",
    accentCanonicalId: "english.american",
    language: "en",
    gender: "female",
    fallbackVoiceId: "21m00Tcm4TlvDq8ikWAM",
    matchHints: { accentRaw: ["american"], nameContains: ["rachel"] },
  },
  {
    id: "dutch_grower",
    groupId: "garden",
    labelKey: "studio.voicePersona.garden.dutchGrower",
    accentCanonicalId: "dutch.nederlands",
    language: "nl",
    gender: "female",
    fallbackVoiceId: "mock-dutch-grower",
    matchHints: { accentRaw: ["dutch"], nameContains: ["sanne"] },
  },
  {
    id: "caribbean_farmer",
    groupId: "garden",
    labelKey: "studio.voicePersona.garden.caribbeanFarmer",
    accentCanonicalId: "english.caribbean",
    language: "en",
    gender: "female",
    fallbackVoiceId: "mock-caribbean",
    matchHints: { accentRaw: ["caribbean"], nameContains: ["keisha"] },
  },
  {
    id: "african_market_farmer",
    groupId: "garden",
    labelKey: "studio.voicePersona.garden.africanMarketFarmer",
    accentCanonicalId: "english.south_african",
    language: "en",
    gender: "male",
    fallbackVoiceId: "ErXwobaYiN019PkySvjV",
    matchHints: { accentRaw: ["south african", "african"], nameContains: ["arnold"] },
  },
  {
    id: "luxury_brand_voice",
    groupId: "designer",
    labelKey: "studio.voicePersona.designer.luxuryBrandVoice",
    accentCanonicalId: "english.british",
    language: "en",
    gender: "female",
    fallbackVoiceId: "mock-luxury",
    matchHints: { accentRaw: ["british"], nameContains: ["charlotte"] },
  },
  {
    id: "fashion_narrator",
    groupId: "designer",
    labelKey: "studio.voicePersona.designer.fashionNarrator",
    accentCanonicalId: "english.british",
    language: "en",
    gender: "female",
    fallbackVoiceId: "onwK4e9ZLuTAKqWW03F9",
    matchHints: { accentRaw: ["british", "french"], nameContains: ["charlotte", "camille"] },
  },
  {
    id: "creative_director",
    groupId: "designer",
    labelKey: "studio.voicePersona.designer.creativeDirector",
    accentCanonicalId: "english.american",
    language: "en",
    gender: "male",
    fallbackVoiceId: "pNInz6obpgDQGcFmaJgB",
    matchHints: { accentRaw: ["american"], nameContains: ["adam"] },
  },
  {
    id: "local_storyteller",
    groupId: "community",
    labelKey: "studio.voicePersona.community.localStoryteller",
    accentCanonicalId: "english.caribbean",
    language: "en",
    gender: "female",
    fallbackVoiceId: "mock-caribbean",
    matchHints: { accentRaw: ["caribbean", "jamaican"], nameContains: ["keisha", "marcus"] },
  },
  {
    id: "neighborhood_host",
    groupId: "community",
    labelKey: "studio.voicePersona.community.neighborhoodHost",
    accentCanonicalId: "english.american",
    language: "en",
    gender: "male",
    fallbackVoiceId: "ErXwobaYiN019PkySvjV",
    matchHints: { accentRaw: ["american"], nameContains: ["antoni", "arnold"] },
  },
  {
    id: "community_organizer",
    groupId: "community",
    labelKey: "studio.voicePersona.community.communityOrganizer",
    accentCanonicalId: "dutch.nederlands",
    language: "nl",
    gender: "female",
    fallbackVoiceId: "mock-dutch-grower",
    matchHints: { accentRaw: ["dutch", "surinamese"], nameContains: ["sanne", "asha"] },
  },
];

function scoreVoiceForPreset(
  voice: VoiceLibraryEntry,
  preset: VoicePersonaPresetDefinition
): number {
  let score = 0;
  const canonical = canonicalAccentForVoice(voice);
  if (canonical?.id === preset.accentCanonicalId) {
    score += 10;
  }
  const rawAccent = (voice.accent || voice.labels.accent || "").toLowerCase();
  for (const hint of preset.matchHints.accentRaw ?? []) {
    if (rawAccent.includes(hint.toLowerCase())) {
      score += 5;
    }
  }
  const name = voice.name.toLowerCase();
  for (const hint of preset.matchHints.nameContains ?? []) {
    if (name.includes(hint.toLowerCase())) {
      score += 3;
    }
  }
  const gender = (voice.gender || voice.labels.gender || "").toLowerCase();
  if (preset.gender && gender === preset.gender) {
    score += 2;
  }
  const language = (voice.language || voice.labels.language || "").toLowerCase();
  if (language && language === preset.language) {
    score += 2;
  }
  if (voice.previewUrl) {
    score += 1;
  }
  return score;
}

function resolvePresetVoice(
  catalog: VoiceLibraryCatalog,
  preset: VoicePersonaPresetDefinition,
  usedVoiceIds: Set<string>
): VoiceLibraryEntry | undefined {
  const ranked = catalog.voices
    .filter((voice) => !usedVoiceIds.has(voice.id))
    .map((voice) => ({ voice, score: scoreVoiceForPreset(voice, preset) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (best && best.score >= 5) {
    return best.voice;
  }

  const fallback = findVoiceLibraryEntry(catalog, preset.fallbackVoiceId);
  if (fallback && !usedVoiceIds.has(fallback.id)) {
    return fallback;
  }

  return ranked.find((entry) => entry.score > 0)?.voice ?? catalog.voices.find((v) => !usedVoiceIds.has(v.id));
}

export function buildVoicePersonaPresets(catalog: VoiceLibraryCatalog): VoicePersonaResolvedPreset[] {
  const usedVoiceIds = new Set<string>();
  const resolved: VoicePersonaResolvedPreset[] = [];

  for (const preset of VOICE_PERSONA_PRESET_DEFINITIONS) {
    const voice = resolvePresetVoice(catalog, preset, usedVoiceIds);
    if (!voice) {
      continue;
    }
    usedVoiceIds.add(voice.id);
    resolved.push({
      id: preset.id,
      groupId: preset.groupId,
      labelKey: preset.labelKey,
      accentCanonicalId: preset.accentCanonicalId,
      language: preset.language,
      voiceId: voice.id,
      voiceName: voice.name,
      previewUrl: voice.previewUrl,
      resolved: voice.id !== preset.fallbackVoiceId || catalog.source === "elevenlabs",
    });
  }

  return resolved;
}

export function findPersonaPresetById(
  catalog: VoiceLibraryCatalog,
  presetId: string
): VoicePersonaResolvedPreset | undefined {
  return buildVoicePersonaPresets(catalog).find((p) => p.id === presetId);
}

export const VOICE_PERSONA_GROUP_LABEL_KEYS: Record<VoicePersonaPresetGroupId, string> = {
  chef: "studio.voicePersona.group.chef",
  garden: "studio.voicePersona.group.garden",
  designer: "studio.voicePersona.group.designer",
  community: "studio.voicePersona.group.community",
};
