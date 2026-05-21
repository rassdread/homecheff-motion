"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  LANGUAGE_EXPORT_CODES,
  type LanguageExportCode,
} from "@/lib/video-language-export";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

export type VideoLanguageExportDto = {
  id: string;
  languageCode: string;
  languageLabel: string;
  status: string;
  outputVideoUrl: string | null;
  sourceFinalVideoUrl: string;
  textLayerJson: unknown;
  translationProvider: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type Props = {
  projectId: string;
  hasCompletedFinal: boolean;
  originalFinalUrl: string | null;
  languageExports: VideoLanguageExportDto[];
  onRefresh: () => void | Promise<void>;
  selectedPlayback?: string;
  onSelectedPlaybackChange?: (languageCode: string, playbackUrl: string | null) => void;
};

const TARGET_CODES = LANGUAGE_EXPORT_CODES.filter((c) => c !== "original") as LanguageExportCode[];

export function LanguageExportPanel({
  projectId,
  hasCompletedFinal,
  originalFinalUrl,
  languageExports,
  onRefresh,
  selectedPlayback: selectedPlaybackProp,
  onSelectedPlaybackChange,
}: Props) {
  const t = useActiveTranslator();
  const [targetLang, setTargetLang] = useState<LanguageExportCode>("nl");
  const [textLayers, setTextLayers] = useState<LanguageTextLayerRecord[]>([]);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [typographyQuality, setTypographyQuality] = useState("premium");
  const [selectedPlaybackInternal, setSelectedPlaybackInternal] = useState<string>("original");
  const selectedPlayback = selectedPlaybackProp ?? selectedPlaybackInternal;
  const setSelectedPlayback = (value: string) => {
    if (selectedPlaybackProp === undefined) {
      setSelectedPlaybackInternal(value);
    }
    onSelectedPlaybackChange?.(
      value,
      value === "original"
        ? originalFinalUrl
        : (languageExports.find(
            (e) =>
              e.languageCode === value && e.status === "completed" && e.outputVideoUrl?.trim()
          )?.outputVideoUrl?.trim() ?? originalFinalUrl)
    );
  };

  const completedExports = useMemo(
    () => languageExports.filter((e) => e.status === "completed" && e.outputVideoUrl),
    [languageExports]
  );

  const playbackUrl = useMemo(() => {
    if (selectedPlayback === "original") {
      return originalFinalUrl;
    }
    const row = completedExports.find((e) => e.languageCode === selectedPlayback);
    return row?.outputVideoUrl ?? originalFinalUrl;
  }, [selectedPlayback, completedExports, originalFinalUrl]);

  useEffect(() => {
    onSelectedPlaybackChange?.(selectedPlayback, playbackUrl);
  }, [selectedPlayback, playbackUrl, onSelectedPlaybackChange]);

  const prepareTexts = useCallback(async () => {
    setPrepareLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "prepare",
            languageCode: targetLang,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        textLayers?: LanguageTextLayerRecord[];
        typographyRenderQuality?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? t("instant.languageExport.prepareFailed"));
        return;
      }
      setTextLayers(data.textLayers ?? []);
      if (data.typographyRenderQuality) {
        setTypographyQuality(data.typographyRenderQuality);
      }
    } catch {
      setError(t("instant.languageExport.prepareFailed"));
    } finally {
      setPrepareLoading(false);
    }
  }, [projectId, targetLang, t]);

  const renderVersion = useCallback(async () => {
    setRenderLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            languageCode: targetLang,
            textLayers,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("instant.languageExport.renderFailed"));
        return;
      }
      setInfo(t("instant.languageExport.renderStarted"));
      await onRefresh();
    } catch {
      setError(t("instant.languageExport.renderFailed"));
    } finally {
      setRenderLoading(false);
    }
  }, [projectId, targetLang, textLayers, onRefresh, t]);

  useEffect(() => {
    const pending = languageExports.some(
      (e) => e.status === "queued" || e.status === "rendering"
    );
    if (!pending) {
      return;
    }
    const timer = window.setInterval(() => {
      void onRefresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [languageExports, onRefresh]);

  if (!hasCompletedFinal) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-violet-200/90 bg-violet-50/60 px-4 py-3">
      <p className="text-sm font-semibold text-violet-950">
        {t("instant.languageExport.createVersion")}
      </p>
      <p className="text-xs font-medium text-violet-900/90">{t("instant.languageExport.title")}</p>
      <p className="mt-1 text-xs text-violet-900/85">{t("instant.languageExport.hint")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-violet-950">
          {t("instant.languageExport.targetLanguage")}
        </label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value as LanguageExportCode)}
          className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs"
        >
          {TARGET_CODES.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={prepareLoading}
          onClick={() => void prepareTexts()}
          className="rounded-md border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {prepareLoading ? t("instant.languageExport.preparing") : t("instant.languageExport.loadTexts")}
        </button>
        <button
          type="button"
          disabled={renderLoading || textLayers.length === 0}
          onClick={() => void renderVersion()}
          className="rounded-md bg-violet-800 px-3 py-1 text-xs font-medium text-white hover:bg-violet-900 disabled:opacity-50"
        >
          {renderLoading ? t("instant.languageExport.rendering") : t("instant.languageExport.renderButton")}
        </button>
      </div>

      {textLayers.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-violet-900/85">
            {t("instant.languageExport.typographyPreviewHint")} ({typographyQuality})
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto text-xs">
            {textLayers.map((layer) => (
              <div key={layer.id} className="rounded-lg border border-violet-100 bg-white/80 p-2">
                {layer.previewDataUrl ? (
                  <img
                    src={layer.previewDataUrl}
                    alt=""
                    className="mb-2 w-full rounded border border-violet-50 bg-zinc-900/90 object-contain"
                  />
                ) : null}
                <p className="font-mono text-[10px] text-violet-800/80">{layer.sourceText}</p>
                <textarea
                  value={layer.translatedText}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTextLayers((prev) =>
                      prev.map((row) =>
                        row.id === layer.id ? { ...row, translatedText: next } : row
                      )
                    );
                  }}
                  rows={2}
                  className="mt-1 w-full rounded border border-violet-100 px-2 py-1 text-xs"
                />
                {layer.fit?.overflowWarning ? (
                  <p className="mt-1 text-[10px] text-amber-800">
                    {t("instant.languageExport.overflowWarning")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {completedExports.length > 0 || originalFinalUrl ? (
        <div className="mt-3">
          <label className="text-xs font-medium text-violet-950">
            {t("instant.languageExport.playback")}
          </label>
          <select
            value={selectedPlayback}
            onChange={(e) => setSelectedPlayback(e.target.value)}
            className="mt-1 block w-full rounded-md border border-violet-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="original">{t("instant.languageExport.original")}</option>
            {completedExports.map((row) => (
              <option key={row.id} value={row.languageCode}>
                {row.languageLabel} ({row.languageCode})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {languageExports.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px] text-violet-900">
          {languageExports.map((row) => (
            <li key={row.id}>
              {row.languageLabel}: {row.status}
              {row.status === "needs_refresh" ? " ⚠" : ""}
              {row.errorMessage ? ` — ${row.errorMessage}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      {info ? <p className="mt-2 text-xs text-violet-800">{info}</p> : null}

      {playbackUrl && selectedPlayback !== "original" ? (
        <p className="mt-2 text-[10px] text-violet-800/80 break-all">{playbackUrl}</p>
      ) : null}
    </div>
  );
}
