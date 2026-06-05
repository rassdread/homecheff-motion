/**
 * Smart version naming — bundle-aware defaults and duplicate handling.
 * Stored in `versionNote` on render versions and language exports.
 */

import { languageCodeToLabel } from "@/lib/draft-lineage";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";

export const MAX_VERSION_NAME_LENGTH = 80;

const LANGUAGE_VERSION_PATTERN = /^(NL|EN|DE|ES|FR|PT|IT|AR)\s+V(\d+)$/i;

export function normalizeVersionName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isLanguageVersionName(name: string): boolean {
  return LANGUAGE_VERSION_PATTERN.test(normalizeVersionName(name));
}

export function parseLanguageVersionName(name: string): { languageLabel: string; version: number } | null {
  const match = LANGUAGE_VERSION_PATTERN.exec(normalizeVersionName(name));
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    languageLabel: match[1].toUpperCase(),
    version: Number.parseInt(match[2], 10),
  };
}

/** Collect display names already used in a bundle catalog. */
export function collectVersionNamesFromCatalog(catalog: MotionVersionCatalog | null | undefined): string[] {
  if (!catalog) {
    return [];
  }
  const names = new Set<string>();
  for (const slots of Object.values(catalog.slotsByLanguage)) {
    for (const slot of slots) {
      const note = slot.versionNote?.trim();
      if (note) {
        names.add(note);
      } else {
        names.add(formatLanguageVersionName(slot.languageLabel, slot.catalogVersionNumber));
      }
    }
  }
  return [...names];
}

export function formatLanguageVersionName(languageLabel: string, versionNumber: number): string {
  const label = languageLabel.trim().toUpperCase() || "NL";
  return `${label} V${Math.max(1, versionNumber)}`;
}

/**
 * Suggest the next default name for a language in a bundle.
 * Same language → increment (NL V3 → NL V4). New language → V1.
 */
export function suggestDefaultVersionName(params: {
  languageCode: string;
  catalog?: MotionVersionCatalog | null;
}): string {
  const langLabel = languageCodeToLabel(params.languageCode);
  const catalog = params.catalog;
  let maxVersion = 0;

  if (catalog) {
    const slots = catalog.slotsByLanguage[params.languageCode.toLowerCase()] ?? [];
    for (const slot of slots) {
      maxVersion = Math.max(maxVersion, slot.catalogVersionNumber);
      const parsed = slot.versionNote ? parseLanguageVersionName(slot.versionNote) : null;
      if (parsed && parsed.languageLabel === langLabel) {
        maxVersion = Math.max(maxVersion, parsed.version);
      }
    }
    for (const name of collectVersionNamesFromCatalog(catalog)) {
      const parsed = parseLanguageVersionName(name);
      if (parsed?.languageLabel === langLabel) {
        maxVersion = Math.max(maxVersion, parsed.version);
      }
    }
  }

  return formatLanguageVersionName(langLabel, maxVersion + 1);
}

export function versionNameExists(name: string, existingNames: string[]): boolean {
  const norm = normalizeVersionName(name).toLowerCase();
  if (!norm) {
    return false;
  }
  return existingNames.some((existing) => normalizeVersionName(existing).toLowerCase() === norm);
}

/** Suggest an alternate when the name collides (Director Cut → Director Cut V2). */
export function suggestAlternateVersionName(name: string, existingNames: string[]): string {
  const trimmed = normalizeVersionName(name);
  if (!trimmed) {
    return trimmed;
  }
  const withoutSuffix = trimmed
    .replace(/\s+V\d+$/i, "")
    .replace(/\s+\(\d+\)$/, "")
    .trim();
  const base = withoutSuffix || trimmed;

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base} V${i}`;
    if (!versionNameExists(candidate, existingNames)) {
      return candidate;
    }
  }
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base} (${i})`;
    if (!versionNameExists(candidate, existingNames)) {
      return candidate;
    }
  }
  return trimmed;
}

export type VersionNameValidation = {
  duplicate: boolean;
  suggestion: string | null;
  normalized: string;
};

export function validateVersionNameInput(
  name: string,
  existingNames: string[]
): VersionNameValidation {
  const normalized = normalizeVersionName(name).slice(0, MAX_VERSION_NAME_LENGTH);
  if (!normalized) {
    return { duplicate: false, suggestion: null, normalized };
  }
  const duplicate = versionNameExists(normalized, existingNames);
  return {
    duplicate,
    suggestion: duplicate ? suggestAlternateVersionName(normalized, existingNames) : null,
    normalized,
  };
}

/** Resolve a name for persistence — never overwrite; auto-suffix on collision. */
export function resolveVersionNameForPersist(name: string, existingNames: string[]): string {
  const normalized = normalizeVersionName(name).slice(0, MAX_VERSION_NAME_LENGTH);
  if (!normalized) {
    return "";
  }
  if (!versionNameExists(normalized, existingNames)) {
    return normalized;
  }
  return suggestAlternateVersionName(normalized, existingNames);
}
