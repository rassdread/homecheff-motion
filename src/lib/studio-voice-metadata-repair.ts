/**
 * Central voice metadata repair — single layer for accent, language, and locale enrichment.
 * Uses only ElevenLabs provider fields (labels, verified_languages, locale, description, name).
 * No invented metadata; each repair records source + confidence for audit.
 */

import {
  CANONICAL_ACCENT_DEFINITIONS,
  canonicalAccentForVoice,
  classifyVoiceAccent,
  parseAccentFromDescription,
} from "@/lib/studio-voice-accent-model";
import {
  normalizeLanguageCode,
  type ElevenLabsVerifiedLanguage,
  type ElevenLabsVoiceRow,
  type VoiceLibraryCatalog,
  type VoiceLibraryEntry,
} from "@/lib/studio-voice-library-catalog";
import { inferAccentFromLocale } from "@/lib/studio-voice-locale-accent";
import {
  resolveVoiceAccessTier,
  resolveVoiceGeography,
} from "@/lib/studio-voice-geography-model";
import {
  buildVoicePersonaPresets,
  VOICE_PERSONA_PRESET_DEFINITIONS,
} from "@/lib/studio-voice-persona-presets";
import { buildAccentFilters } from "@/lib/studio-voice-accent-model";

/** Repair confidence tiers (audit only — not shown to end users). */
export const METADATA_REPAIR_CONFIDENCE = {
  provider_metadata: 100,
  locale_match: 95,
  verified_language_match: 90,
  description_match: 80,
  name_match: 70,
  weak_inference: 50,
} as const;

export type MetadataRepairSource = keyof typeof METADATA_REPAIR_CONFIDENCE;

export type MetadataRepairCandidate = {
  field: "accent" | "language" | "locale";
  value: string;
  source: MetadataRepairSource;
  confidence: number;
};

export { inferAccentFromLocale, LOCALE_ACCENT_RULES } from "@/lib/studio-voice-locale-accent";

function pickLabel(labels: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = labels[key]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function pickVerifiedLanguageFromRow(row: ElevenLabsVoiceRow): ElevenLabsVerifiedLanguage | null {
  const entries = row.verified_languages ?? [];
  if (entries.length === 0) {
    return null;
  }
  const labels = row.labels ?? {};
  const labelLang = normalizeLanguageCode(pickLabel(labels, "language", "Language", "locale"));
  const withAccent = entries.filter((entry) => entry.accent?.trim());

  if (labelLang) {
    const matched = withAccent.find((entry) => {
      const lang = normalizeLanguageCode(entry.language ?? entry.locale ?? "");
      return lang === labelLang;
    });
    if (matched) {
      return matched;
    }
  }

  return withAccent[0] ?? entries[0] ?? null;
}

function isWeakAccent(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  return !normalized || normalized === "standard";
}

function accentClassifiable(raw: string): boolean {
  return Boolean(classifyVoiceAccent(raw));
}

function bestCandidate(
  candidates: MetadataRepairCandidate[],
  field: MetadataRepairCandidate["field"]
): MetadataRepairCandidate | null {
  const forField = candidates.filter((c) => c.field === field && c.value.trim());
  if (forField.length === 0) {
    return null;
  }
  return forField.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

function collectLocaleCandidates(
  locale: string,
  source: MetadataRepairSource
): MetadataRepairCandidate[] {
  const accent = inferAccentFromLocale(locale);
  const language = normalizeLanguageCode(locale);
  const out: MetadataRepairCandidate[] = [];
  if (accent) {
    out.push({
      field: "accent",
      value: accent,
      source,
      confidence: METADATA_REPAIR_CONFIDENCE.locale_match,
    });
  }
  if (language) {
    out.push({
      field: "language",
      value: language,
      source,
      confidence: METADATA_REPAIR_CONFIDENCE.locale_match,
    });
  }
  out.push({
    field: "locale",
    value: locale.trim(),
    source,
    confidence: METADATA_REPAIR_CONFIDENCE.locale_match,
  });
  return out;
}

/** Gather repair candidates from all provider metadata sources. */
export function collectVoiceMetadataRepairCandidates(params: {
  voice: VoiceLibraryEntry;
  row?: ElevenLabsVoiceRow | null;
}): MetadataRepairCandidate[] {
  const { voice, row } = params;
  const labels = { ...voice.labels, ...(row?.labels ?? {}) };
  const candidates: MetadataRepairCandidate[] = [];

  const providerAccent = pickLabel(labels, "accent", "Accent") || voice.accent.trim();
  if (providerAccent && !isWeakAccent(providerAccent)) {
    candidates.push({
      field: "accent",
      value: providerAccent,
      source: "provider_metadata",
      confidence: METADATA_REPAIR_CONFIDENCE.provider_metadata,
    });
  }

  const providerLanguage =
    normalizeLanguageCode(pickLabel(labels, "language", "Language", "locale")) ||
    normalizeLanguageCode(voice.language);
  if (providerLanguage) {
    candidates.push({
      field: "language",
      value: providerLanguage,
      source: "provider_metadata",
      confidence: METADATA_REPAIR_CONFIDENCE.provider_metadata,
    });
  }

  const verified = row ? pickVerifiedLanguageFromRow(row) : null;
  if (verified?.accent?.trim()) {
    candidates.push({
      field: "accent",
      value: verified.accent.trim(),
      source: "verified_language_match",
      confidence: METADATA_REPAIR_CONFIDENCE.verified_language_match,
    });
  }
  if (verified?.language?.trim()) {
    candidates.push({
      field: "language",
      value: normalizeLanguageCode(verified.language),
      source: "verified_language_match",
      confidence: METADATA_REPAIR_CONFIDENCE.verified_language_match,
    });
  }
  if (verified?.locale?.trim()) {
    candidates.push(...collectLocaleCandidates(verified.locale, "verified_language_match"));
  }

  for (const localeKey of ["verified_locale", "locale", "Locale"] as const) {
    const locale = labels[localeKey]?.trim();
    if (locale) {
      candidates.push(...collectLocaleCandidates(locale, "locale_match"));
    }
  }

  const description = (row?.description?.trim() || voice.description || "").trim();
  if (description) {
    const fromDescription = parseAccentFromDescription(description);
    if (fromDescription) {
      candidates.push({
        field: "accent",
        value: fromDescription,
        source: "description_match",
        confidence: METADATA_REPAIR_CONFIDENCE.description_match,
      });
    }
  }

  const name = (row?.name?.trim() || voice.name || "").trim();
  if (name) {
    const fromName = parseAccentFromDescription(name);
    if (fromName) {
      candidates.push({
        field: "accent",
        value: fromName,
        source: "name_match",
        confidence: METADATA_REPAIR_CONFIDENCE.name_match,
      });
    }
  }

  const useCase = pickLabel(labels, "use_case", "useCase").toLowerCase();
  const category = (row?.category || voice.category || "").trim().toLowerCase();
  if (isWeakAccent(providerAccent) && providerLanguage === "nl" && !accentClassifiable(providerAccent)) {
    candidates.push({
      field: "accent",
      value: "dutch",
      source: "weak_inference",
      confidence: METADATA_REPAIR_CONFIDENCE.weak_inference,
    });
  }
  if (
    isWeakAccent(providerAccent) &&
    providerLanguage === "en" &&
    (useCase.includes("narration") || category === "professional")
  ) {
    // No default English accent — weak inference only when description/name already failed.
  }

  return candidates;
}

function shouldApplyRepair(params: {
  currentValue: string;
  currentConfidence: number;
  candidate: MetadataRepairCandidate;
  requireClassification?: boolean;
}): boolean {
  const current = params.currentValue.trim();
  const next = params.candidate.value.trim();
  if (!next) {
    return false;
  }
  if (!current || isWeakAccent(current)) {
    return !params.requireClassification || accentClassifiable(next);
  }
  if (params.candidate.confidence > params.currentConfidence) {
    if (params.requireClassification && !accentClassifiable(next)) {
      return false;
    }
    if (isWeakAccent(current)) {
      return true;
    }
    if (!accentClassifiable(current) && accentClassifiable(next)) {
      return true;
    }
  }
  return false;
}

function readRepairConfidence(labels: Record<string, string>, field: string): number {
  const raw = labels[`_repair_${field}_confidence`]?.trim();
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Apply central metadata repair to a mapped voice entry (ingest-time). */
export function applyVoiceMetadataRepair(
  voice: VoiceLibraryEntry,
  row?: ElevenLabsVoiceRow | null
): VoiceLibraryEntry {
  const candidates = collectVoiceMetadataRepairCandidates({ voice, row });
  const labels = { ...voice.labels };
  let accent = voice.accent.trim();
  let language = voice.language.trim();
  let repaired = false;

  const accentConfidence = readRepairConfidence(labels, "accent");
  const languageConfidence = readRepairConfidence(labels, "language");

  const accentCandidate = bestCandidate(candidates, "accent");
  if (
    accentCandidate &&
    shouldApplyRepair({
      currentValue: accent,
      currentConfidence: accentConfidence,
      candidate: accentCandidate,
      requireClassification: true,
    })
  ) {
    if (!labels._repair_original_accent) {
      labels._repair_original_accent = accent;
    }
    accent = accentCandidate.value;
    labels.accent = accent;
    labels._repair_accent_source = accentCandidate.source;
    labels._repair_accent_confidence = String(accentCandidate.confidence);
    repaired = true;
  }

  const languageCandidate = bestCandidate(candidates, "language");
  if (
    languageCandidate &&
    shouldApplyRepair({
      currentValue: language,
      currentConfidence: languageConfidence,
      candidate: languageCandidate,
    })
  ) {
    if (!labels._repair_original_language) {
      labels._repair_original_language = language;
    }
    language = languageCandidate.value;
    labels.language = language;
    labels._repair_language_source = languageCandidate.source;
    labels._repair_language_confidence = String(languageCandidate.confidence);
    repaired = true;
  }

  const localeCandidate = bestCandidate(candidates, "locale");
  if (localeCandidate?.value) {
    const existingLocale =
      labels.verified_locale?.trim() || labels.locale?.trim() || labels.Locale?.trim() || "";
    if (!existingLocale) {
      labels.verified_locale = localeCandidate.value;
      labels._repair_locale_source = localeCandidate.source;
      repaired = true;
    }
  }

  if (repaired) {
    labels._repair_applied = "true";
  }

  return {
    ...voice,
    accent,
    language,
    labels,
  };
}

export function voiceHadMetadataRepair(voice: VoiceLibraryEntry): boolean {
  return voice.labels._repair_applied === "true";
}

export function revertVoiceMetadataRepair(voice: VoiceLibraryEntry): VoiceLibraryEntry {
  const labels = { ...voice.labels };
  const accent = labels._repair_original_accent ?? voice.accent;
  const language = labels._repair_original_language ?? voice.language;
  for (const key of Object.keys(labels)) {
    if (key.startsWith("_repair_")) {
      delete labels[key];
    }
  }
  if (accent) {
    labels.accent = accent;
  }
  if (language) {
    labels.language = language;
  }
  return { ...voice, accent: accent.trim(), language: language.trim(), labels };
}

export type VoiceMetadataCoverageSnapshot = {
  totalVoices: number;
  withAccent: number;
  withCanonicalAccent: number;
  withLanguage: number;
  withCountry: number;
  withRegion: number;
  withLocale: number;
  withPreview: number;
  missingAccent: number;
  missingLanguage: number;
  missingLocation: number;
  repairedVoices: number;
  repairBySource: Record<MetadataRepairSource, number>;
};

export function buildVoiceMetadataCoverageSnapshot(
  catalog: VoiceLibraryCatalog
): VoiceMetadataCoverageSnapshot {
  const repairBySource: Record<MetadataRepairSource, number> = {
    provider_metadata: 0,
    locale_match: 0,
    verified_language_match: 0,
    description_match: 0,
    name_match: 0,
    weak_inference: 0,
  };

  let withAccent = 0;
  let withCanonicalAccent = 0;
  let withLanguage = 0;
  let withCountry = 0;
  let withRegion = 0;
  let withLocale = 0;
  let withPreview = 0;
  let repairedVoices = 0;

  for (const voice of catalog.voices) {
    const rawAccent = (voice.accent || voice.labels.accent || "").trim();
    if (rawAccent && !isWeakAccent(rawAccent)) {
      withAccent += 1;
    }
    if (canonicalAccentForVoice(voice)) {
      withCanonicalAccent += 1;
    }
    if ((voice.language || voice.labels.language || "").trim()) {
      withLanguage += 1;
    }
    const geo = resolveVoiceGeography(voice);
    if (geo.countryId) {
      withCountry += 1;
    }
    if (geo.regionId) {
      withRegion += 1;
    }
    if (geo.locale) {
      withLocale += 1;
    }
    if (voice.previewUrl?.trim()) {
      withPreview += 1;
    }
    if (voiceHadMetadataRepair(voice)) {
      repairedVoices += 1;
      const source = voice.labels._repair_accent_source as MetadataRepairSource | undefined;
      if (source && source in repairBySource) {
        repairBySource[source] += 1;
      }
    }
  }

  const total = catalog.voices.length;
  return {
    totalVoices: total,
    withAccent,
    withCanonicalAccent,
    withLanguage,
    withCountry,
    withRegion,
    withLocale,
    withPreview,
    missingAccent: total - withCanonicalAccent,
    missingLanguage: total - withLanguage,
    missingLocation: total - withCountry,
    repairedVoices,
    repairBySource,
  };
}

export type AccentRegistryRow = {
  accentId: string;
  labelKey: string;
  voiceCount: number;
  repairedVoiceCount: number;
  avgConfidence: number | null;
};

export function buildAccentRegistryAudit(catalog: VoiceLibraryCatalog): AccentRegistryRow[] {
  const counts = new Map<string, number>();
  const repaired = new Map<string, number>();
  const confidenceSum = new Map<string, number>();

  for (const voice of catalog.voices) {
    const canonical = canonicalAccentForVoice(voice);
    if (!canonical) {
      continue;
    }
    counts.set(canonical.id, (counts.get(canonical.id) ?? 0) + 1);
    if (voiceHadMetadataRepair(voice)) {
      repaired.set(canonical.id, (repaired.get(canonical.id) ?? 0) + 1);
      const conf = readRepairConfidence(voice.labels, "accent");
      if (conf > 0) {
        confidenceSum.set(canonical.id, (confidenceSum.get(canonical.id) ?? 0) + conf);
      }
    }
  }

  return CANONICAL_ACCENT_DEFINITIONS.map((def) => {
    const voiceCount = counts.get(def.id) ?? 0;
    const repairedVoiceCount = repaired.get(def.id) ?? 0;
    const sum = confidenceSum.get(def.id);
    return {
      accentId: def.id,
      labelKey: def.labelKey,
      voiceCount,
      repairedVoiceCount,
      avgConfidence: sum && repairedVoiceCount > 0 ? Math.round(sum / repairedVoiceCount) : null,
    };
  }).filter((row) => row.voiceCount > 0 || row.repairedVoiceCount > 0);
}

export type PersonaRecoveryRow = {
  presetId: string;
  labelKey: string;
  availableBefore: boolean;
  availableAfter: boolean;
  gained: boolean;
};

export function buildPersonaRecoveryAudit(catalog: VoiceLibraryCatalog): {
  beforeAvailable: number;
  afterAvailable: number;
  gained: number;
  rows: PersonaRecoveryRow[];
} {
  const afterPresets = buildVoicePersonaPresets(catalog);
  const beforeCatalog: VoiceLibraryCatalog = {
    ...catalog,
    voices: catalog.voices.map(revertVoiceMetadataRepair),
  };
  const beforePresets = buildVoicePersonaPresets(beforeCatalog);

  const afterById = new Map(afterPresets.map((p) => [p.id, p]));
  const beforeById = new Map(beforePresets.map((p) => [p.id, p]));

  const rows: PersonaRecoveryRow[] = VOICE_PERSONA_PRESET_DEFINITIONS.map((def) => {
    const before = beforeById.get(def.id);
    const after = afterById.get(def.id);
    const availableBefore = before?.available ?? false;
    const availableAfter = after?.available ?? false;
    return {
      presetId: def.id,
      labelKey: def.labelKey,
      availableBefore,
      availableAfter,
      gained: !availableBefore && availableAfter,
    };
  });

  return {
    beforeAvailable: beforePresets.filter((p) => p.available).length,
    afterAvailable: afterPresets.filter((p) => p.available).length,
    gained: rows.filter((r) => r.gained).length,
    rows,
  };
}

export type PremiumTierCoverage = {
  tier: string;
  voiceCount: number;
  accentCount: number;
  languageCount: number;
};

export function buildPremiumMarketplaceCoverage(catalog: VoiceLibraryCatalog): PremiumTierCoverage[] {
  const byTier = new Map<string, VoiceLibraryEntry[]>();
  for (const voice of catalog.voices) {
    const tier = resolveVoiceAccessTier({
      category: voice.category,
      catalogSource: voice.labels.catalog_source,
    });
    const list = byTier.get(tier) ?? [];
    list.push(voice);
    byTier.set(tier, list);
  }

  return [...byTier.entries()].map(([tier, voices]) => {
    const accents = new Set<string>();
    const languages = new Set<string>();
    for (const voice of voices) {
      const canonical = canonicalAccentForVoice(voice);
      if (canonical) {
        accents.add(canonical.id);
      }
      const lang = (voice.language || voice.labels.language || "").trim();
      if (lang) {
        languages.add(lang);
      }
    }
    return {
      tier,
      voiceCount: voices.length,
      accentCount: accents.size,
      languageCount: languages.size,
    };
  });
}

export type VoiceMetadataRepairReport = {
  catalogSource: VoiceLibraryCatalog["source"];
  coverage: VoiceMetadataCoverageSnapshot;
  accentRegistry: AccentRegistryRow[];
  personaRecovery: ReturnType<typeof buildPersonaRecoveryAudit>;
  premiumCoverage: PremiumTierCoverage[];
  languageCount: number;
  accentFilterCount: number;
  countryCount: number;
  regionCount: number;
};

export function buildVoiceMetadataRepairReport(
  catalog: VoiceLibraryCatalog
): VoiceMetadataRepairReport {
  const coverage = buildVoiceMetadataCoverageSnapshot(catalog);
  const filterOptions = buildAccentFilters(catalog);
  const countries = new Set<string>();
  const regions = new Set<string>();
  const languages = new Set<string>();

  for (const voice of catalog.voices) {
    const geo = resolveVoiceGeography(voice);
    if (geo.countryId) {
      countries.add(geo.countryId);
    }
    if (geo.regionId) {
      regions.add(geo.regionId);
    }
    const lang = (voice.language || voice.labels.language || "").trim();
    if (lang) {
      languages.add(lang);
    }
  }

  return {
    catalogSource: catalog.source,
    coverage,
    accentRegistry: buildAccentRegistryAudit(catalog),
    personaRecovery: buildPersonaRecoveryAudit(catalog),
    premiumCoverage: buildPremiumMarketplaceCoverage(catalog),
    languageCount: languages.size,
    accentFilterCount: filterOptions.length,
    countryCount: countries.size,
    regionCount: regions.size,
  };
}
