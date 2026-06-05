/**
 * Concept version identity — target language and display name for draft renders.
 */

import { languageCodeToLabel } from "@/lib/draft-lineage";
import { suggestDefaultVersionName } from "@/lib/smart-version-naming";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";

export const VERSION_IDENTITY_LANGUAGE_CODES = [
  "nl",
  "en",
  "de",
  "es",
  "fr",
  "pt",
  "it",
  "ar",
] as const;

export type VersionIdentityLanguageCode = (typeof VERSION_IDENTITY_LANGUAGE_CODES)[number];

export function isVersionIdentityLanguageCode(code: string): code is VersionIdentityLanguageCode {
  return (VERSION_IDENTITY_LANGUAGE_CODES as readonly string[]).includes(code.toLowerCase());
}

export function resolveTargetLanguageCode(
  stored: string | undefined | null,
  fallback: string
): VersionIdentityLanguageCode {
  const candidate = (stored?.trim() || fallback || "nl").toLowerCase();
  return isVersionIdentityLanguageCode(candidate) ? candidate : "nl";
}

/** Result label shown in preview and bundle (EN Director Cut or NL V4). */
export function formatVersionIdentityResultLabel(
  languageCode: string,
  versionName: string
): string {
  const trimmed = versionName.trim();
  if (!trimmed) {
    return "";
  }
  const label = languageCodeToLabel(languageCode);
  if (trimmed.toUpperCase().startsWith(label)) {
    return trimmed;
  }
  return `${label} ${trimmed}`;
}

export function formatVersionIdentityWillCreateLabel(
  languageCode: string,
  versionName: string,
  locale: "en" | "nl" = "nl"
): string {
  const inner = formatVersionIdentityResultLabel(languageCode, versionName);
  const prefix = locale === "en" ? "This draft will create:" : "Dit concept wordt:";
  return inner ? `${prefix} ${inner}` : prefix;
}

export function suggestVersionNameForLanguage(params: {
  languageCode: string;
  catalog?: MotionVersionCatalog | null;
}): string {
  return suggestDefaultVersionName({
    languageCode: params.languageCode,
    catalog: params.catalog ?? null,
  });
}

export function formatVersionIdentityCurrentLabel(params: {
  languageLabel: string;
  versionDisplay: string;
}): string {
  const display = params.versionDisplay.trim();
  if (display.toUpperCase().startsWith(params.languageLabel.toUpperCase())) {
    return display;
  }
  return `${params.languageLabel} ${display}`;
}
