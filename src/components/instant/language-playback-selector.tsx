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
  isAdmin?: boolean;
  className?: string;
};

export function LanguagePlaybackSelector({
  originalPlaybackUrl,
  languageExports,
  playbackState,
  onSelectedLanguageChange,
  isAdmin = false,
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

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <label className="block text-xs font-medium text-zinc-700">
        {t("instant.languageExport.playback")}
      </label>
      <select
        value={playbackState.selectedLanguageCode}
        onChange={(e) => onSelectedLanguageChange(e.target.value)}
        className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200 sm:max-w-xs"
        aria-label={t("instant.languageExport.playback")}
      >
        {options.map((option) => (
          <option key={option.languageCode} value={option.languageCode}>
            {option.label}
          </option>
        ))}
      </select>

      {playbackState.missingOutput ? (
        <p className="text-xs text-amber-900">{t("instant.languageExport.outputMissing")}</p>
      ) : null}
      {playbackState.fallbackToOriginal &&
      playbackState.selectedLanguageCode !== "original" ? (
        <p className="text-xs text-zinc-600">{t("instant.languageExport.playbackFallback")}</p>
      ) : null}

      {isAdmin ? (
        <div className="rounded border border-dashed border-zinc-300 bg-zinc-50/80 p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminPlaybackTitle")}</p>
          <p>selectedLanguage: {playbackState.selectedLanguageCode}</p>
          <p>activeLanguageVersion: {playbackState.activeLanguageVersion ?? "—"}</p>
          <p>activeExportId: {playbackState.activeExportId ?? "—"}</p>
          <p>originalPlaybackUrl: {playbackState.originalPlaybackUrl ? "set" : "—"}</p>
          <p>activePlaybackUrl: {playbackState.activePlaybackUrl ? "set" : "—"}</p>
          <p>status: {activeRow?.status ?? "original"}</p>
          <p>DB exports: {languageExports.length}</p>
          <p>selector options: {options.length}</p>
          <p className="mt-1 text-[9px] text-zinc-600">
            video tools: use /api/admin/runtime/video-tools
          </p>
        </div>
      ) : null}
    </div>
  );
}
