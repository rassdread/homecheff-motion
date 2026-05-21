"use client";

import { useMemo } from "react";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  filterCompletedLanguageExportsForPlayback,
  playbackOptionLabel,
  resolveLanguagePlaybackUrl,
} from "@/lib/language-export-playback";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

type Props = {
  originalFinalUrl: string | null;
  languageExports: VideoLanguageExportSummary[];
  selectedLanguageCode: string;
  onSelectedLanguageChange: (languageCode: string) => void;
  isAdmin?: boolean;
  className?: string;
};

export function LanguagePlaybackSelector({
  originalFinalUrl,
  languageExports,
  selectedLanguageCode,
  onSelectedLanguageChange,
  isAdmin = false,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();

  const completedExports = useMemo(
    () => filterCompletedLanguageExportsForPlayback(languageExports),
    [languageExports]
  );

  const playbackResolved = useMemo(
    () =>
      resolveLanguagePlaybackUrl({
        selectedLanguageCode,
        originalFinalUrl,
        languageExports,
      }),
    [selectedLanguageCode, originalFinalUrl, languageExports]
  );

  const activeRow = useMemo(
    () =>
      selectedLanguageCode === "original"
        ? null
        : languageExports.find((e) => e.languageCode === selectedLanguageCode),
    [languageExports, selectedLanguageCode]
  );

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <label className="block text-xs font-medium text-zinc-700">
        {t("instant.languageExport.playback")}
      </label>
      <select
        value={selectedLanguageCode}
        onChange={(e) => onSelectedLanguageChange(e.target.value)}
        className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200 sm:max-w-xs"
        aria-label={t("instant.languageExport.playback")}
      >
        <option value="original">{playbackOptionLabel("original", locale)}</option>
        {completedExports.map((row) => (
          <option key={row.id} value={row.languageCode}>
            {row.languageLabel || playbackOptionLabel(row.languageCode, locale)}
          </option>
        ))}
      </select>

      {playbackResolved.missingOutput ? (
        <p className="text-xs text-amber-900">{t("instant.languageExport.outputMissing")}</p>
      ) : null}
      {playbackResolved.fallbackToOriginal && selectedLanguageCode !== "original" ? (
        <p className="text-xs text-zinc-600">{t("instant.languageExport.playbackFallback")}</p>
      ) : null}

      {isAdmin ? (
        <div className="rounded border border-dashed border-zinc-300 bg-zinc-50/80 p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminPlaybackTitle")}</p>
          <p>active export id: {playbackResolved.exportId ?? "—"}</p>
          <p>DB exports: {languageExports.length}</p>
          <p>completed w/ URL: {completedExports.length}</p>
          <p>status: {activeRow?.status ?? "original"}</p>
          <p>playback URL set: {String(Boolean(playbackResolved.url))}</p>
        </div>
      ) : null}
    </div>
  );
}
