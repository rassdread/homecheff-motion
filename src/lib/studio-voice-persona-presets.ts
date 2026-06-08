/**
 * Curated voice persona presets mapped to ElevenLabs library voices (no AI).
 */

import {
  evaluatePersonaAccentMatch,
  voiceMatchesPersonaPreset,
} from "@/lib/studio-voice-persona-accent-match";
import {
  findVoiceLibraryEntry,
  isMockOnlyVoiceId,
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
  available: boolean;
  matchingReason: string | null;
  matchedAccentId: string | null;
  matchedAccentLabelKey: string | null;
  personaScore: number;
  matchReasonKeys: string[];
  unavailableReasonKey?: string;
  unavailableSuggestionKey?: string;
};

/** @deprecated Strict accent gate replaces score threshold; kept for existing tests. */
export const MIN_PERSONA_MATCH_SCORE = 5;

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
    matchHints: { accentRaw: ["jamaican", "caribbean"], nameContains: ["marcus"] },
  },
  {
    id: "italian_restaurant_owner",
    groupId: "chef",
    labelKey: "studio.voicePersona.chef.italianRestaurantOwner",
    accentCanonicalId: "english.italian",
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
    fallbackVoiceId: "mock-south-african",
    matchHints: { accentRaw: ["south african"], nameContains: [] },
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
    fallbackVoiceId: "mock-luxury",
    matchHints: { accentRaw: ["british"], nameContains: ["charlotte"] },
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
    matchHints: { accentRaw: ["dutch", "nederlands"], nameContains: ["sanne"] },
  },
];

export function scoreVoiceForPreset(
  voice: VoiceLibraryEntry,
  preset: VoicePersonaPresetDefinition
): number {
  const accentMatch = evaluatePersonaAccentMatch(voice, preset);
  if (!accentMatch.matches) {
    return 0;
  }

  let score = accentMatch.matchingReason?.startsWith("canonical:") ? 10 : 8;

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
  if (voice.previewUrl) {
    score += 1;
  }
  return score;
}

function resolvePresetVoice(
  catalog: VoiceLibraryCatalog,
  preset: VoicePersonaPresetDefinition,
  usedVoiceIds: Set<string>
): { voice: VoiceLibraryEntry; score: number; accentMatch: ReturnType<typeof evaluatePersonaAccentMatch> } | null {
  const eligible = catalog.voices.filter(
    (voice) => !usedVoiceIds.has(voice.id) && voiceMatchesPersonaPreset(voice, preset)
  );

  const ranked = eligible
    .map((voice) => ({
      voice,
      score: scoreVoiceForPreset(voice, preset),
      accentMatch: evaluatePersonaAccentMatch(voice, preset),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (best && best.score > 0) {
    return best;
  }

  if (catalog.source === "mock") {
    const fallback = findVoiceLibraryEntry(catalog, preset.fallbackVoiceId);
    if (fallback && !usedVoiceIds.has(fallback.id) && voiceMatchesPersonaPreset(fallback, preset)) {
      return {
        voice: fallback,
        score: scoreVoiceForPreset(fallback, preset),
        accentMatch: evaluatePersonaAccentMatch(fallback, preset),
      };
    }
  }

  return null;
}

function buildMatchReasonKeys(
  preset: VoicePersonaPresetDefinition,
  voice: VoiceLibraryEntry,
  accentMatch: ReturnType<typeof evaluatePersonaAccentMatch>
): string[] {
  const keys: string[] = [];
  if (accentMatch.matchedAccentLabelKey) {
    keys.push("studio.voicePersona.matchReason.accent");
  }
  const gender = (voice.gender || voice.labels.gender || "").toLowerCase();
  if (preset.gender && gender === preset.gender) {
    keys.push("studio.voicePersona.matchReason.gender");
  }
  const name = voice.name.toLowerCase();
  if (preset.matchHints.nameContains?.some((h) => name.includes(h.toLowerCase()))) {
    keys.push("studio.voicePersona.matchReason.nameHint");
  }
  if (voice.description?.trim()) {
    keys.push("studio.voicePersona.matchReason.metadata");
  }
  return keys;
}

function unavailablePreset(preset: VoicePersonaPresetDefinition): VoicePersonaResolvedPreset {
  return {
    id: preset.id,
    groupId: preset.groupId,
    labelKey: preset.labelKey,
    accentCanonicalId: preset.accentCanonicalId,
    language: preset.language,
    voiceId: "",
    voiceName: "",
    previewUrl: "",
    resolved: false,
    available: false,
    matchingReason: null,
    matchedAccentId: null,
    matchedAccentLabelKey: null,
    personaScore: 0,
    matchReasonKeys: [],
    unavailableReasonKey: "studio.voicePersona.unavailable.noMatch",
    unavailableSuggestionKey: "studio.voicePersona.unavailable.browseOrClone",
  };
}

export function buildVoicePersonaPresets(catalog: VoiceLibraryCatalog): VoicePersonaResolvedPreset[] {
  const usedVoiceIds = new Set<string>();
  const resolved: VoicePersonaResolvedPreset[] = [];

  for (const preset of VOICE_PERSONA_PRESET_DEFINITIONS) {
    const match = resolvePresetVoice(catalog, preset, usedVoiceIds);
    if (!match) {
      resolved.push(unavailablePreset(preset));
      continue;
    }

    const { voice, score, accentMatch } = match;
    usedVoiceIds.add(voice.id);
    const usedMockFallback =
      catalog.source === "elevenlabs" &&
      isMockOnlyVoiceId(preset.fallbackVoiceId) &&
      voice.id === preset.fallbackVoiceId;

    if (usedMockFallback || !accentMatch.matches) {
      resolved.push(unavailablePreset(preset));
      continue;
    }

    resolved.push({
      id: preset.id,
      groupId: preset.groupId,
      labelKey: preset.labelKey,
      accentCanonicalId: preset.accentCanonicalId,
      language: preset.language,
      voiceId: voice.id,
      voiceName: voice.name,
      previewUrl: voice.previewUrl,
      resolved: score >= MIN_PERSONA_MATCH_SCORE,
      available: true,
      matchingReason: accentMatch.matchingReason,
      matchedAccentId: accentMatch.matchedAccentId,
      matchedAccentLabelKey: accentMatch.matchedAccentLabelKey,
      personaScore: score,
      matchReasonKeys: buildMatchReasonKeys(preset, voice, accentMatch),
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
