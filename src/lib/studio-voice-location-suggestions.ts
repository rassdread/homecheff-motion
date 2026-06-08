/**
 * Location → accent → recommended voice persona suggestions (advisory only, no auto-select).
 */

import { CANONICAL_ACCENT_DEFINITIONS } from "@/lib/studio-voice-accent-model";
import {
  buildVoicePersonaPresets,
  type VoicePersonaResolvedPreset,
} from "@/lib/studio-voice-persona-presets";
import {
  findVoiceLibraryEntry,
  mockVoiceLibraryCatalog,
  type VoiceLibraryCatalog,
} from "@/lib/studio-voice-library-catalog";

export type VoiceLocationRule = {
  id: string;
  locationMatchers: string[];
  accentCanonicalId: string;
  accentLabelKey: string;
  language: string;
  personaPresetIds: string[];
};

export const VOICE_LOCATION_RULES: VoiceLocationRule[] = [
  {
    id: "kingston",
    locationMatchers: ["kingston", "jamaica"],
    accentCanonicalId: "english.jamaican",
    accentLabelKey: "studio.voiceLibrary.accent.english.jamaican",
    language: "en",
    personaPresetIds: ["jamaican_street_chef", "local_storyteller"],
  },
  {
    id: "london",
    locationMatchers: ["london", "uk", "united kingdom", "england"],
    accentCanonicalId: "english.british",
    accentLabelKey: "studio.voiceLibrary.accent.english.british",
    language: "en",
    personaPresetIds: ["british_chef", "luxury_brand_voice", "fashion_narrator"],
  },
  {
    id: "paramaribo",
    locationMatchers: ["paramaribo", "suriname", "surinam"],
    accentCanonicalId: "dutch.surinaams",
    accentLabelKey: "studio.voiceLibrary.accent.dutch.surinaams",
    language: "nl",
    personaPresetIds: ["community_organizer", "dutch_grower"],
  },
  {
    id: "amsterdam",
    locationMatchers: ["amsterdam", "netherlands", "holland", "nederland"],
    accentCanonicalId: "dutch.nederlands",
    accentLabelKey: "studio.voiceLibrary.accent.dutch.nederlands",
    language: "nl",
    personaPresetIds: ["dutch_grower", "community_organizer"],
  },
  {
    id: "rotterdam",
    locationMatchers: ["rotterdam", "den haag", "utrecht"],
    accentCanonicalId: "dutch.nederlands",
    accentLabelKey: "studio.voiceLibrary.accent.dutch.nederlands",
    language: "nl",
    personaPresetIds: ["dutch_grower", "community_organizer"],
  },
  {
    id: "new_york",
    locationMatchers: ["new york", "nyc", "brooklyn", "manhattan"],
    accentCanonicalId: "english.american",
    accentLabelKey: "studio.voiceLibrary.accent.english.american",
    language: "en",
    personaPresetIds: ["american_food_host", "neighborhood_host", "creative_director"],
  },
  {
    id: "caribbean",
    locationMatchers: ["caribbean", "aruba", "curacao", "bonaire"],
    accentCanonicalId: "english.caribbean",
    accentLabelKey: "studio.voiceLibrary.accent.english.caribbean",
    language: "en",
    personaPresetIds: ["caribbean_farmer", "local_storyteller"],
  },
  {
    id: "paris",
    locationMatchers: ["paris", "france"],
    accentCanonicalId: "french.france",
    accentLabelKey: "studio.voiceLibrary.accent.french.france",
    language: "fr",
    personaPresetIds: ["fashion_narrator", "luxury_brand_voice"],
  },
];

export type VoiceDirectorSuggestion = {
  ruleId: string;
  matchedLocation: string;
  accentCanonicalId: string;
  accentLabelKey: string;
  language: string;
  personaPresets: VoicePersonaResolvedPreset[];
  recommendedVoices: Array<{
    voiceId: string;
    voiceName: string;
    previewUrl: string;
  }>;
};

function normalizeLocationText(value: string): string {
  return value.trim().toLowerCase();
}

function matchLocationRule(locationName: string, rule: VoiceLocationRule): boolean {
  const normalized = normalizeLocationText(locationName);
  return rule.locationMatchers.some(
    (matcher) => normalized.includes(matcher) || matcher.includes(normalized)
  );
}

export function suggestVoicesForLocation(
  locationName: string,
  catalog: VoiceLibraryCatalog = mockVoiceLibraryCatalog()
): VoiceDirectorSuggestion | null {
  const trimmed = locationName.trim();
  if (!trimmed) {
    return null;
  }

  const rule = VOICE_LOCATION_RULES.find((r) => matchLocationRule(trimmed, r));
  if (!rule) {
    return null;
  }

  const personaPresets = buildVoicePersonaPresets(catalog).filter(
    (p) => rule.personaPresetIds.includes(p.id) && p.available
  );

  const accentDef = CANONICAL_ACCENT_DEFINITIONS.find((d) => d.id === rule.accentCanonicalId);
  const recommendedVoices = personaPresets.map((preset) => {
    const entry = findVoiceLibraryEntry(catalog, preset.voiceId);
    return {
      voiceId: preset.voiceId,
      voiceName: entry?.name ?? preset.voiceName,
      previewUrl: entry?.previewUrl ?? preset.previewUrl,
    };
  });

  return {
    ruleId: rule.id,
    matchedLocation: trimmed,
    accentCanonicalId: rule.accentCanonicalId,
    accentLabelKey: accentDef?.labelKey ?? rule.accentLabelKey,
    language: rule.language,
    personaPresets,
    recommendedVoices,
  };
}

export function suggestVoicesForLocations(
  locationNames: string[],
  catalog?: VoiceLibraryCatalog
): VoiceDirectorSuggestion[] {
  const seen = new Set<string>();
  const suggestions: VoiceDirectorSuggestion[] = [];
  for (const name of locationNames) {
    const suggestion = suggestVoicesForLocation(name, catalog);
    if (suggestion && !seen.has(suggestion.ruleId)) {
      seen.add(suggestion.ruleId);
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

export type ProductionBriefVoicePersonaSuggestion = {
  id: string;
  messageKey: string;
  messageParams: Record<string, string>;
  personaPresetIds: string[];
};

const CONTENT_TYPE_PERSONA_MAP: Record<string, string[]> = {
  commercial: ["luxury_brand_voice", "american_food_host", "creative_director"],
  social_media: ["american_food_host", "neighborhood_host", "fashion_narrator"],
  storytelling: ["local_storyteller", "british_chef", "caribbean_farmer"],
  documentary: ["british_chef", "dutch_grower", "community_organizer"],
  educational: ["community_organizer", "dutch_grower", "creative_director"],
  cinematic: ["luxury_brand_voice", "fashion_narrator", "local_storyteller"],
};

export function buildProductionBriefVoiceSuggestions(params: {
  contentType: string;
  idea?: string;
  locationNames?: string[];
  catalog?: VoiceLibraryCatalog;
}): ProductionBriefVoicePersonaSuggestion[] {
  const catalog = params.catalog ?? mockVoiceLibraryCatalog();
  const suggestions: ProductionBriefVoicePersonaSuggestion[] = [];
  const personaIds = new Set<string>();
  const locationNames = [...(params.locationNames ?? [])];

  if (params.idea?.trim()) {
    const ideaLower = params.idea.trim().toLowerCase();
    for (const rule of VOICE_LOCATION_RULES) {
      if (rule.locationMatchers.some((matcher) => ideaLower.includes(matcher))) {
        locationNames.push(rule.locationMatchers[0] ?? rule.id);
      }
    }
  }

  for (const id of CONTENT_TYPE_PERSONA_MAP[params.contentType] ?? []) {
    personaIds.add(id);
  }

  for (const location of locationNames) {
    const locSuggestion = suggestVoicesForLocation(location, catalog);
    for (const preset of locSuggestion?.personaPresets ?? []) {
      personaIds.add(preset.id);
    }
  }

  const presets = buildVoicePersonaPresets(catalog).filter((p) => personaIds.has(p.id) && p.available);
  if (presets.length === 0) {
    return [];
  }

  suggestions.push({
    id: "brief-voice-personas",
    messageKey: "studio.productionBrief.recommendation.voicePersonas",
    messageParams: {
      count: String(presets.length),
    },
    personaPresetIds: presets.map((p) => p.id),
  });

  return suggestions;
}

export function buildDirectorVoiceSuggestions(params: {
  locationNames: string[];
  catalog?: VoiceLibraryCatalog;
}): VoiceDirectorSuggestion[] {
  return suggestVoicesForLocations(params.locationNames, params.catalog);
}
