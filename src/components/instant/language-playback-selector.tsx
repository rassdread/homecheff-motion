"use client";

import { useMemo } from "react";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  buildLanguagePlaybackOptions,
  type ActivePlaybackState,
} from "@/lib/language-export-playback";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

type Props = {
  originalPlaybackUrl: string | null;
  languageExports: VideoLanguageExportSummary[];
  playbackState: ActivePlaybackState;
  onSelectedLanguageChange: (languageCode: string) => void;
  showAdminDebug?: boolean;
  className?: string;
};

export function LanguagePlaybackSelector({
  originalPlaybackUrl,
  languageExports,
  playbackState,
  onSelectedLanguageChange,
  showAdminDebug = false,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();

  const options = useMemo(
    () => buildLanguagePlaybackOptions(originalPlaybackUrl, languageExports, locale),
    [originalPlaybackUrl, languageExports, locale]
  );

  const activeRow = useMemo(
    () =>
      playbackState.selectedLanguageCode === "original"
        ? null
        : languageExports.find((e) => e.languageCode === playbackState.selectedLanguageCode),
    [languageExports, playbackState.selectedLanguageCode]
  );

  if (options.length <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <label className="text-xs text-zinc-600" htmlFor="language-playback-select">
        {t("instant.languageExport.playback")}
      </label>
      <select
        id="language-playback-select"
        value={playbackState.selectedLanguageCode}
        onChange={(e) => onSelectedLanguageChange(e.target.value)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
        aria-label={t("instant.languageExport.playback")}
      >
        {options.map((option) => (
          <option key={option.languageCode} value={option.languageCode}>
            {option.label}
          </option>
        ))}
      </select>

      {playbackState.missingOutput ? (
        <span className="text-xs text-amber-900">{t("instant.languageExport.outputMissing")}</span>
      ) : null}
      {playbackState.fallbackToOriginal &&
      playbackState.selectedLanguageCode !== "original" ? (
        <span className="text-xs text-zinc-500">{t("instant.languageExport.playbackFallback")}</span>
      ) : null}

      {showAdminDebug ? (
        <div className="w-full rounded border border-dashed border-zinc-300 bg-zinc-50/80 p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminPlaybackTitle")}</p>
          <p>selectedLanguage: {playbackState.selectedLanguageCode}</p>
          <p>activeLanguageVersion: {playbackState.activeLanguageVersion ?? "—"}</p>
          <p>activeExportId: {playbackState.activeExportId ?? "—"}</p>
          <p>originalPlaybackUrl: {playbackState.originalPlaybackUrl ? "set" : "—"}</p>
          <p>activePlaybackUrl: {playbackState.activePlaybackUrl ? "set" : "—"}</p>
          <p>status: {activeRow?.status ?? "original"}</p>
        </div>
      ) : null}
    </div>
  );
}
