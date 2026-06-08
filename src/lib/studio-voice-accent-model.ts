/**
 * Canonical accent classification from ElevenLabs voice library metadata.
 * Only accents present in the catalog are surfaced in filters.
 */

import type { VoiceLibraryCatalog, VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

export type VoiceAccentFamilyId =
  | "english"
  | "dutch"
  | "spanish"
  | "french"
  | "german"
  | "other";

export type CanonicalAccentDefinition = {
  id: string;
  familyId: VoiceAccentFamilyId;
  labelKey: string;
  /** Raw ElevenLabs accent label fragments (lowercase). */
  matchers: string[];
};

/** Longer / more specific matchers are checked first via sortedAccentDefinitions(). */
export const CANONICAL_ACCENT_DEFINITIONS: CanonicalAccentDefinition[] = [
  { id: "spanish.latin_american", familyId: "spanish", labelKey: "studio.voiceLibrary.accent.spanish.latin_american", matchers: ["latin american", "latino", "mexican", "colombian", "argentinian"] },
  { id: "french.canadian", familyId: "french", labelKey: "studio.voiceLibrary.accent.french.canadian", matchers: ["canadian french", "quebec", "québécois"] },
  { id: "english.south_african", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.south_african", matchers: ["south african"] },
  { id: "english.british", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.british", matchers: ["british", "uk english", "english (uk)", "received pronunciation"] },
  { id: "english.australian", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.australian", matchers: ["australian", "aussie"] },
  { id: "english.american", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.american", matchers: ["american", "us english", "usa"] },
  { id: "english.irish", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.irish", matchers: ["irish"] },
  { id: "english.scottish", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.scottish", matchers: ["scottish"] },
  { id: "english.canadian", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.canadian", matchers: ["canadian english"] },
  { id: "english.jamaican", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.jamaican", matchers: ["jamaican"] },
  { id: "english.caribbean", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.caribbean", matchers: ["caribbean", "west indian"] },
  { id: "english.nigerian", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.nigerian", matchers: ["nigerian", "nigeria"] },
  { id: "english.indian", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.indian", matchers: ["indian", "india english"] },
  { id: "english.new_zealand", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.new_zealand", matchers: ["new zealand", "kiwi", "nz english"] },
  { id: "english.italian", familyId: "english", labelKey: "studio.voiceLibrary.accent.english.italian", matchers: ["italian"] },
  { id: "portuguese.brazilian", familyId: "other", labelKey: "studio.voiceLibrary.accent.portuguese.brazilian", matchers: ["brazilian", "português brasil", "portuguese brazil"] },
  { id: "portuguese.european", familyId: "other", labelKey: "studio.voiceLibrary.accent.portuguese.european", matchers: ["portuguese", "european portuguese", "lisbon"] },
  { id: "german.standard", familyId: "german", labelKey: "studio.voiceLibrary.accent.german.standard", matchers: ["german", "deutsch", "standard german"] },
  { id: "russian.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.russian.standard", matchers: ["russian", "русский"] },
  { id: "italian.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.italian.standard", matchers: ["italiano", "italian accent"] },
  { id: "arabic.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.arabic.standard", matchers: ["arabic", "gulf", "egyptian arabic"] },
  { id: "chinese.mandarin", familyId: "other", labelKey: "studio.voiceLibrary.accent.chinese.mandarin", matchers: ["mandarin", "chinese", "putonghua"] },
  { id: "japanese.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.japanese.standard", matchers: ["japanese", "tokyo"] },
  { id: "korean.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.korean.standard", matchers: ["korean", "seoul"] },
  { id: "hindi.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.hindi.standard", matchers: ["hindi", "hindustani"] },
  { id: "polish.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.polish.standard", matchers: ["polish", "polski"] },
  { id: "swedish.standard", familyId: "other", labelKey: "studio.voiceLibrary.accent.swedish.standard", matchers: ["swedish", "svenska"] },
  { id: "dutch.surinaams", familyId: "dutch", labelKey: "studio.voiceLibrary.accent.dutch.surinaams", matchers: ["surinamese", "surinaams", "suriname"] },
  { id: "dutch.vlaams", familyId: "dutch", labelKey: "studio.voiceLibrary.accent.dutch.vlaams", matchers: ["flemish", "vlaams", "belgian dutch"] },
  { id: "dutch.nederlands", familyId: "dutch", labelKey: "studio.voiceLibrary.accent.dutch.nederlands", matchers: ["dutch", "nederlands", "netherlands"] },
  { id: "spanish.spain", familyId: "spanish", labelKey: "studio.voiceLibrary.accent.spanish.spain", matchers: ["spanish", "castilian", "spain"] },
  { id: "french.france", familyId: "french", labelKey: "studio.voiceLibrary.accent.french.france", matchers: ["french", "france"] },
];

function sortedAccentDefinitions(): CanonicalAccentDefinition[] {
  return [...CANONICAL_ACCENT_DEFINITIONS].sort((a, b) => {
    const maxA = Math.max(...a.matchers.map((m) => m.length), 0);
    const maxB = Math.max(...b.matchers.map((m) => m.length), 0);
    return maxB - maxA;
  });
}

export type VoiceAccentFilterOption = {
  id: string;
  familyId: VoiceAccentFamilyId;
  labelKey: string;
  voiceCount: number;
};

export type VoiceLibraryFilterOptions = {
  accents: VoiceAccentFilterOption[];
  genders: Array<{ value: string; labelKey: string; voiceCount: number }>;
  languages: Array<{ value: string; voiceCount: number }>;
  ages: Array<{ value: string; labelKey: string; voiceCount: number }>;
  categories: Array<{ value: string; labelKey: string; voiceCount: number }>;
};

function normalizeRawAccent(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Map a raw ElevenLabs accent label to a canonical accent id, if known. */
export function classifyVoiceAccent(rawAccent: string): CanonicalAccentDefinition | null {
  const normalized = normalizeRawAccent(rawAccent);
  if (!normalized) {
    return null;
  }
  for (const def of sortedAccentDefinitions()) {
    if (def.matchers.some((m) => normalized.includes(m))) {
      return def;
    }
  }
  return null;
}

export function canonicalAccentForVoice(voice: VoiceLibraryEntry): CanonicalAccentDefinition | null {
  return classifyVoiceAccent(voice.accent || voice.labels.accent || "");
}

export function buildAccentFilters(catalog: VoiceLibraryCatalog): VoiceAccentFilterOption[] {
  const counts = new Map<string, number>();
  for (const voice of catalog.voices) {
    const canonical = canonicalAccentForVoice(voice);
    if (!canonical) {
      continue;
    }
    counts.set(canonical.id, (counts.get(canonical.id) ?? 0) + 1);
  }

  return CANONICAL_ACCENT_DEFINITIONS.filter((def) => counts.has(def.id)).map((def) => ({
    id: def.id,
    familyId: def.familyId,
    labelKey: def.labelKey,
    voiceCount: counts.get(def.id) ?? 0,
  }));
}

function countByField(
  voices: VoiceLibraryEntry[],
  pick: (voice: VoiceLibraryEntry) => string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const voice of voices) {
    const value = pick(voice).trim().toLowerCase();
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

const GENDER_LABEL_KEYS: Record<string, string> = {
  male: "studio.voiceLibrary.filter.gender.male",
  female: "studio.voiceLibrary.filter.gender.female",
  neutral: "studio.voiceLibrary.filter.gender.neutral",
};

const AGE_LABEL_KEYS: Record<string, string> = {
  young: "studio.voiceLibrary.filter.age.young",
  "middle aged": "studio.voiceLibrary.filter.age.middleAged",
  middle_aged: "studio.voiceLibrary.filter.age.middleAged",
  old: "studio.voiceLibrary.filter.age.old",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  professional: "studio.voiceLibrary.category.professional",
  high_quality: "studio.voiceLibrary.category.highQuality",
  shared: "studio.voiceLibrary.category.shared",
  cloned: "studio.voiceLibrary.category.cloned",
  premade: "studio.voiceLibrary.category.premade",
  default: "studio.voiceLibrary.category.premade",
};

export function buildVoiceLibraryFilterOptions(catalog: VoiceLibraryCatalog): VoiceLibraryFilterOptions {
  const genderCounts = countByField(catalog.voices, (v) => v.gender || v.labels.gender || "");
  const languageCounts = countByField(catalog.voices, (v) => v.language || v.labels.language || "");
  const ageCounts = countByField(catalog.voices, (v) => v.age || v.labels.age || "");
  const categoryCounts = countByField(catalog.voices, (v) => v.category || "");

  return {
    accents: buildAccentFilters(catalog),
    genders: [...genderCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, voiceCount]) => ({
        value,
        labelKey: GENDER_LABEL_KEYS[value] ?? "studio.voiceLibrary.filter.gender.other",
        voiceCount,
      })),
    languages: [...languageCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, voiceCount]) => ({ value, voiceCount })),
    ages: [...ageCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, voiceCount]) => ({
        value,
        labelKey: AGE_LABEL_KEYS[value] ?? "studio.voiceLibrary.filter.age.other",
        voiceCount,
      })),
    categories: [...categoryCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, voiceCount]) => ({
        value,
        labelKey: CATEGORY_LABEL_KEYS[value] ?? "studio.voiceLibrary.category.other",
        voiceCount,
      })),
  };
}

export type VoiceLibraryFilters = {
  accentId?: string;
  gender?: string;
  language?: string;
  age?: string;
  category?: string;
  query?: string;
};

export function filterVoiceLibrary(
  catalog: VoiceLibraryCatalog,
  filters: VoiceLibraryFilters
): VoiceLibraryEntry[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return catalog.voices.filter((voice) => {
    if (filters.accentId) {
      const canonical = canonicalAccentForVoice(voice);
      if (!canonical || canonical.id !== filters.accentId) {
        return false;
      }
    }
    if (filters.gender) {
      const gender = (voice.gender || voice.labels.gender || "").trim().toLowerCase();
      if (gender !== filters.gender.trim().toLowerCase()) {
        return false;
      }
    }
    if (filters.language) {
      const language = (voice.language || voice.labels.language || "").trim().toLowerCase();
      if (language !== filters.language.trim().toLowerCase()) {
        return false;
      }
    }
    if (filters.age) {
      const age = (voice.age || voice.labels.age || "").trim().toLowerCase();
      if (age !== filters.age.trim().toLowerCase()) {
        return false;
      }
    }
    if (filters.category) {
      const category = (voice.category || "").trim().toLowerCase();
      if (category !== filters.category.trim().toLowerCase()) {
        return false;
      }
    }
    if (query) {
      const haystack = [
        voice.name,
        voice.accent,
        voice.language,
        voice.description,
        voice.category,
        ...Object.values(voice.labels),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}
