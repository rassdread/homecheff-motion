/**
 * Multilingual playback — options from persisted VideoLanguageExport rows.
 */

import {
  normalizeLanguageExportRows,
  pickCurrentLanguageExportPerLanguage,
} from "@/lib/project-video-versions";
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
  | "version"
  | "isDefault"
>;

export type LanguagePlaybackOption = {
  id: string;
  languageCode: string;
  label: string;
  outputVideoUrl: string | null;
};

export type ActivePlaybackState = {
  selectedLanguageCode: string;
  originalPlaybackUrl: string | null;
  activePlaybackUrl: string | null;
  activeExportId: string | null;
  activeLanguageVersion: string | null;
  fallbackToOriginal: boolean;
  missingOutput: boolean;
};

export const LANGUAGE_EXPORT_OUTPUT_MISSING = "LANGUAGE_EXPORT_OUTPUT_MISSING";

export function filterCompletedLanguageExportsForPlayback(
  exports: LanguageExportPlaybackRow[]
): LanguageExportPlaybackRow[] {
  return exports.filter(
    (row) => row.status === "completed" && Boolean(row.outputVideoUrl?.trim())
  );
}

/** One current completed export per language (prefers isDefault, else highest version). */
export function pickLatestCompletedExportPerLanguage(
  exports: LanguageExportPlaybackRow[]
): LanguageExportPlaybackRow[] {
  return pickCurrentLanguageExportPerLanguage(normalizeLanguageExportRows(exports));
}

export function buildLanguagePlaybackOptions(
  originalFinalUrl: string | null,
  languageExports: LanguageExportPlaybackRow[],
  locale: "en" | "nl" = "nl"
): LanguagePlaybackOption[] {
  const original: LanguagePlaybackOption = {
    id: "original",
    languageCode: "original",
    label: playbackOptionLabel("original", locale),
    outputVideoUrl: originalFinalUrl,
  };
  const exportOptions = pickLatestCompletedExportPerLanguage(languageExports).map((row) => ({
    id: row.id,
    languageCode: row.languageCode,
    label: row.languageLabel || playbackOptionLabel(row.languageCode, locale),
    outputVideoUrl: row.outputVideoUrl?.trim() ?? null,
  }));
  return [original, ...exportOptions];
}

export function resolveActivePlaybackLanguageFromQuery(
  langFromUrl: string | null,
  completedLanguageCodes: string[]
): string {
  if (!langFromUrl || langFromUrl === "original") {
    return "original";
  }
  if (completedLanguageCodes.includes(langFromUrl)) {
    return langFromUrl;
  }
  return "original";
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

  const row =
    pickLatestCompletedExportPerLanguage(languageExports).find(
      (e) => e.languageCode === selectedLanguageCode
    ) ?? languageExports.find((e) => e.languageCode === selectedLanguageCode);

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

export function resolveActivePlaybackState(params: {
  langFromUrl: string | null;
  originalFinalUrl: string | null;
  languageExports: LanguageExportPlaybackRow[];
}): ActivePlaybackState {
  const completedCodes = pickLatestCompletedExportPerLanguage(params.languageExports).map(
    (e) => e.languageCode
  );
  const selectedLanguageCode = resolveActivePlaybackLanguageFromQuery(
    params.langFromUrl,
    completedCodes
  );

  const resolved = resolveLanguagePlaybackUrl({
    selectedLanguageCode,
    originalFinalUrl: params.originalFinalUrl,
    languageExports: params.languageExports,
  });

  return {
    selectedLanguageCode,
    originalPlaybackUrl: params.originalFinalUrl,
    activePlaybackUrl: resolved.url,
    activeExportId: resolved.exportId,
    activeLanguageVersion: selectedLanguageCode === "original" ? null : selectedLanguageCode,
    fallbackToOriginal: resolved.fallbackToOriginal,
    missingOutput: resolved.missingOutput,
  };
}

export function playbackOptionLabel(
  languageCode: string,
  locale: "en" | "nl" = "nl"
): string {
  if (languageCode === "original") {
    return locale === "nl" ? "Origineel" : "Original";
  }
  if (
    languageCode === "nl" ||
    languageCode === "en" ||
    languageCode === "es" ||
    languageCode === "fr" ||
    languageCode === "ar"
  ) {
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

export function buildPlaybackDownloadLanguageParam(
  selectedLanguageCode: string
): { languageCode?: string; filenameSuffix: string } {
  if (selectedLanguageCode === "original") {
    return { filenameSuffix: "" };
  }
  return {
    languageCode: selectedLanguageCode,
    filenameSuffix: `-${selectedLanguageCode}`,
  };
}

export const LANGUAGE_EXPORT_POLL_INTERVAL_MS = 2500;
export const LANGUAGE_EXPORT_POLL_MAX_MS = 12 * 60 * 1000;
