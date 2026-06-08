/**
 * Voice library discovery stats and accent coverage reporting.
 */

import {
  CANONICAL_ACCENT_DEFINITIONS,
  canonicalAccentForVoice,
  type VoiceLibraryFilterOptions,
} from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import {
  VOICE_PERSONA_PRESET_DEFINITIONS,
  type VoicePersonaResolvedPreset,
} from "@/lib/studio-voice-persona-presets";

/** Featured accents for “Discover by accent” chips (shown even at count 0). */
export const VOICE_DISCOVERY_ACCENT_IDS = [
  "english.british",
  "english.jamaican",
  "english.australian",
  "english.irish",
  "english.scottish",
  "english.south_african",
  "dutch.nederlands",
  "dutch.vlaams",
  "dutch.surinaams",
  "english.caribbean",
] as const;

export type VoiceAccentCoverageRow = {
  accentId: string;
  labelKey: string;
  voiceCount: number;
  personaPresetIds: string[];
  personaAvailableCount: number;
};

export type VoiceLibraryStats = {
  catalogSource: VoiceLibraryCatalog["source"];
  totalVoices: number;
  accentCount: number;
  languageCount: number;
  personaCount: number;
  personaAvailableCount: number;
  totalFetched?: number;
  accountFetched?: number;
  sharedFetched?: number;
  paginationLimited?: boolean;
  dedupeCount?: number;
};

export function buildVoiceAccentCoverageReport(params: {
  catalog: VoiceLibraryCatalog;
  personaPresets: VoicePersonaResolvedPreset[];
  accentIds?: readonly string[];
}): VoiceAccentCoverageRow[] {
  const voiceCounts = new Map<string, number>();
  for (const voice of params.catalog.voices) {
    const canonical = canonicalAccentForVoice(voice);
    if (!canonical) {
      continue;
    }
    voiceCounts.set(canonical.id, (voiceCounts.get(canonical.id) ?? 0) + 1);
  }

  const presetByAccent = new Map<string, VoicePersonaResolvedPreset[]>();
  for (const preset of params.personaPresets) {
    const list = presetByAccent.get(preset.accentCanonicalId) ?? [];
    list.push(preset);
    presetByAccent.set(preset.accentCanonicalId, list);
  }

  const definitionById = new Map(CANONICAL_ACCENT_DEFINITIONS.map((d) => [d.id, d]));
  const ids =
    params.accentIds ??
    VOICE_DISCOVERY_ACCENT_IDS;

  return ids.map((accentId) => {
    const def = definitionById.get(accentId);
    const presetsForAccent = presetByAccent.get(accentId) ?? [];
    const definitionPresets = VOICE_PERSONA_PRESET_DEFINITIONS.filter(
      (p) => p.accentCanonicalId === accentId
    ).map((p) => p.id);

    return {
      accentId,
      labelKey: def?.labelKey ?? accentId,
      voiceCount: voiceCounts.get(accentId) ?? 0,
      personaPresetIds: definitionPresets,
      personaAvailableCount: presetsForAccent.filter((p) => p.available).length,
    };
  });
}

export function buildVoiceLibraryStats(params: {
  catalog: VoiceLibraryCatalog;
  filterOptions: VoiceLibraryFilterOptions;
  personaPresets: VoicePersonaResolvedPreset[];
}): VoiceLibraryStats {
  const ingestion = params.catalog.ingestion;
  return {
    catalogSource: params.catalog.source,
    totalVoices: params.catalog.voices.length,
    accentCount: params.filterOptions.accents.length,
    languageCount: params.filterOptions.languages.length,
    personaCount: params.personaPresets.length,
    personaAvailableCount: params.personaPresets.filter((p) => p.available).length,
    totalFetched: ingestion?.totalFetched,
    accountFetched: ingestion?.accountFetched,
    sharedFetched: ingestion?.sharedFetched,
    paginationLimited: ingestion?.paginationLimited,
    dedupeCount: ingestion?.dedupeCount,
  };
}

export function voiceCategoryBadgeLabelKey(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized === "professional") {
    return "studio.voiceLibrary.category.professional";
  }
  if (normalized === "high_quality" || normalized === "high quality") {
    return "studio.voiceLibrary.category.highQuality";
  }
  if (normalized === "shared") {
    return "studio.voiceLibrary.category.shared";
  }
  if (normalized === "cloned" || normalized === "clone") {
    return "studio.voiceLibrary.category.cloned";
  }
  if (normalized === "premade" || normalized === "default") {
    return "studio.voiceLibrary.category.premade";
  }
  if (!normalized) {
    return "studio.voiceLibrary.category.unknown";
  }
  return "studio.voiceLibrary.category.other";
}
