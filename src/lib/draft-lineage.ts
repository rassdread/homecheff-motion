/**
 * Draft copy lineage — where a concept came from.
 */

import { formatMotionVersionLabel } from "@/lib/motion-version-display";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";

export type DraftLineage = {
  sourceProjectId: string;
  sourceProjectTitle: string;
  sourceLanguage: string;
  sourceLanguageLabel: string;
  sourceVersion: number;
  sourceVersionDisplay: string;
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
  copiedAt: Date | string | null;
  locale?: "en" | "nl";
}): DraftLineage | null {
  if (!params.sourceProjectId?.trim()) {
    return null;
  }
  const language = params.sourceLanguage?.trim() || "nl";
  const version = params.sourceVersion != null && params.sourceVersion > 0 ? params.sourceVersion : 1;
  const locale = params.locale ?? "nl";
  return {
    sourceProjectId: params.sourceProjectId,
    sourceProjectTitle: resolveProjectDisplayTitle(params.sourceProjectTitle, locale),
    sourceLanguage: language,
    sourceLanguageLabel: languageCodeToLabel(language),
    sourceVersion: version,
    sourceVersionDisplay: formatMotionVersionLabel(version, params.sourceVersionNote, locale),
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
