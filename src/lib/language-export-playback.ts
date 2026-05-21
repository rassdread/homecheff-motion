/**
 * Multilingual playback — options from persisted VideoLanguageExport rows.
 */

import { languageExportLabel, type LanguageExportCode } from "@/lib/video-language-export";

import type { VideoLanguageExportSummary } from "@/types/animation-api";

export type LanguageExportPlaybackRow = Pick<
  VideoLanguageExportSummary,
  | "id"
  | "languageCode"
  | "languageLabel"
  | "status"
  | "outputVideoUrl"
  | "errorMessage"
  | "createdAt"
  | "completedAt"
>;

export const LANGUAGE_EXPORT_OUTPUT_MISSING = "LANGUAGE_EXPORT_OUTPUT_MISSING";

export function filterCompletedLanguageExportsForPlayback(
  exports: LanguageExportPlaybackRow[]
): LanguageExportPlaybackRow[] {
  return exports.filter(
    (row) => row.status === "completed" && Boolean(row.outputVideoUrl?.trim())
  );
}

export function resolveLanguagePlaybackUrl(params: {
  selectedLanguageCode: string;
  originalFinalUrl: string | null;
  languageExports: LanguageExportPlaybackRow[];
}): {
  url: string | null;
  exportId: string | null;
  fallbackToOriginal: boolean;
  missingOutput: boolean;
} {
  const { selectedLanguageCode, originalFinalUrl, languageExports } = params;
  if (selectedLanguageCode === "original") {
    return {
      url: originalFinalUrl,
      exportId: null,
      fallbackToOriginal: false,
      missingOutput: false,
    };
  }

  const row = languageExports.find((e) => e.languageCode === selectedLanguageCode);
  if (!row) {
    return {
      url: originalFinalUrl,
      exportId: null,
      fallbackToOriginal: true,
      missingOutput: false,
    };
  }

  if (row.status === "failed") {
    return {
      url: originalFinalUrl,
      exportId: row.id,
      fallbackToOriginal: true,
      missingOutput: false,
    };
  }

  const url = row.outputVideoUrl?.trim() ?? null;
  if (row.status === "completed" && !url) {
    return {
      url: originalFinalUrl,
      exportId: row.id,
      fallbackToOriginal: true,
      missingOutput: true,
    };
  }

  if (url) {
    return {
      url,
      exportId: row.id,
      fallbackToOriginal: false,
      missingOutput: false,
    };
  }

  return {
    url: originalFinalUrl,
    exportId: row.id,
    fallbackToOriginal: true,
    missingOutput: false,
  };
}

export function playbackOptionLabel(
  languageCode: string,
  locale: "en" | "nl" = "nl"
): string {
  if (languageCode === "original") {
    return locale === "nl" ? "Origineel" : "Original";
  }
  if (languageCode === "nl" || languageCode === "en" || languageCode === "es" || languageCode === "fr" || languageCode === "ar") {
    return languageExportLabel(languageCode as LanguageExportCode, locale);
  }
  return languageCode.toUpperCase();
}

export function readPlaybackLangFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("lang");
}

export function isValidPlaybackLanguageParam(
  value: string | null,
  availableCodes: string[]
): boolean {
  if (!value || value === "original") {
    return value === "original";
  }
  return availableCodes.includes(value);
}

export const LANGUAGE_EXPORT_POLL_INTERVAL_MS = 2500;
export const LANGUAGE_EXPORT_POLL_MAX_MS = 12 * 60 * 1000;
