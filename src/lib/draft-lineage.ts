/**
 * Draft copy lineage — where a concept came from.
 */

import { formatMotionVersionLabel } from "@/lib/motion-version-display";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";
import {
  formatLanguageVersionName,
  suggestDefaultVersionName,
} from "@/lib/smart-version-naming";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";

export type DraftLineage = {
  sourceProjectId: string;
  sourceProjectTitle: string;
  sourceLanguage: string;
  sourceLanguageLabel: string;
  sourceVersion: number;
  sourceVersionDisplay: string;
  /** Display version number after this draft is rendered into the bundle. */
  nextVersionNumber: number;
  nextVersionDisplay: string;
  bundleDisplayName: string | null;
  copiedAt: string | null;
};

export function languageCodeToLabel(code: string): string {
  const map: Record<string, string> = {
    nl: "NL",
    en: "EN",
    es: "ES",
    fr: "FR",
    de: "DE",
    pt: "PT",
    it: "IT",
    ar: "AR",
  };
  return map[code.toLowerCase()] ?? code.toUpperCase();
}

export function buildDraftLineage(params: {
  sourceProjectId: string;
  sourceProjectTitle: string | null;
  sourceLanguage: string | null;
  sourceVersion: number | null;
  sourceVersionNote?: string | null;
  bundleDisplayName?: string | null;
  bundleCatalog?: MotionVersionCatalog | null;
  copiedAt: Date | string | null;
  locale?: "en" | "nl";
}): DraftLineage | null {
  if (!params.sourceProjectId?.trim()) {
    return null;
  }
  const language = params.sourceLanguage?.trim() || "nl";
  const version = params.sourceVersion != null && params.sourceVersion > 0 ? params.sourceVersion : 1;
  const locale = params.locale ?? "nl";
  const nextVersion = version + 1;
  const nextVersionDisplay =
    params.bundleCatalog
      ? suggestDefaultVersionName({
          languageCode: language,
          catalog: params.bundleCatalog,
        })
      : formatLanguageVersionName(languageCodeToLabel(language), version + 1);
  const bundleDisplayName =
    params.bundleDisplayName?.trim() ||
    resolveProjectDisplayTitle(params.sourceProjectTitle, locale);
  return {
    sourceProjectId: params.sourceProjectId,
    sourceProjectTitle: resolveProjectDisplayTitle(params.sourceProjectTitle, locale),
    sourceLanguage: language,
    sourceLanguageLabel: languageCodeToLabel(language),
    sourceVersion: version,
    sourceVersionDisplay: formatMotionVersionLabel(version, params.sourceVersionNote, locale),
    nextVersionNumber: nextVersion,
    nextVersionDisplay,
    bundleDisplayName,
    copiedAt:
      params.copiedAt instanceof Date
        ? params.copiedAt.toISOString()
        : typeof params.copiedAt === "string"
          ? params.copiedAt
          : null,
  };
}

export function formatDraftLineageShort(lineage: DraftLineage, locale: "en" | "nl" = "nl"): string {
  const prefix = locale === "en" ? "Based on:" : "Gebaseerd op:";
  return `${prefix} ${lineage.sourceLanguageLabel} v${lineage.sourceVersion}`;
}

export function formatDraftLineageBanner(lineage: DraftLineage, locale: "en" | "nl" = "nl"): string {
  const prefix = locale === "en" ? "Draft created from:" : "Concept gemaakt van:";
  return `${prefix} ${lineage.sourceProjectTitle} → ${lineage.sourceVersionDisplay}`;
}

export function formatDraftWillCreateLabel(lineage: DraftLineage, locale: "en" | "nl" = "nl"): string {
  const prefix = locale === "en" ? "This draft will create:" : "Dit concept wordt:";
  return `${prefix} ${lineage.sourceLanguageLabel} ${lineage.nextVersionDisplay}`;
}
