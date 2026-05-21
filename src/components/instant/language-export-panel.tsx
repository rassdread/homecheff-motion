"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  applyLanguageExportPrepareResponse,
  buildLanguageExportPrepareRequest,
  languageExportPrepareButtonKey,
  languageExportPrepareUrl,
  logLanguageExportUi,
  type LanguageExportPrepareDebug,
  type LanguageExportPreparePhase,
} from "@/lib/language-export-prepare";
import type { LanguageExportPrepareApiResponse } from "@/lib/language-export-prepare";
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
  isAdmin?: boolean;
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
  isAdmin = false,
}: Props) {
  const t = useActiveTranslator();
  const [targetLang, setTargetLang] = useState<LanguageExportCode>("nl");
  const [textLayers, setTextLayers] = useState<LanguageTextLayerRecord[]>([]);
  const [preparePhase, setPreparePhase] = useState<LanguageExportPreparePhase>("idle");
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [typographyQuality, setTypographyQuality] = useState("premium");
  const [prepareDebug, setPrepareDebug] = useState<LanguageExportPrepareDebug | null>(null);
  const [selectedPlaybackInternal, setSelectedPlaybackInternal] = useState<string>("original");
  const translatePhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (translatePhaseTimerRef.current) {
        clearTimeout(translatePhaseTimerRef.current);
      }
    };
  }, []);

  const prepareMessages = useMemo(
    () => ({
      prepareFailed: t("instant.languageExport.prepareFailed"),
      noLayers: t("instant.languageExport.noLayers"),
      translationFailed: t("instant.languageExport.translationFailed"),
    }),
    [t]
  );

  const prepareTexts = useCallback(async () => {
    if (!projectId.trim()) {
      setError(t("instant.languageExport.prepareFailed"));
      setPreparePhase("failed");
      return;
    }

    setPrepareLoading(true);
    setPreparePhase("loading_layers");
    setError("");
    setInfo("");

    logLanguageExportUi("action", {
      action: "prepare",
      projectId,
      targetLanguage: targetLang,
    });

    translatePhaseTimerRef.current = setTimeout(() => {
      setPreparePhase((phase) =>
        phase === "loading_layers" ? "translating" : phase
      );
    }, 200);

    logLanguageExportUi("requestStarted", {
      action: "prepare",
      projectId,
      targetLanguage: targetLang,
    });

    try {
      const res = await fetch(languageExportPrepareUrl(projectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildLanguageExportPrepareRequest(targetLang)),
      });
      const data = (await res.json().catch(() => ({}))) as LanguageExportPrepareApiResponse;
      const result = applyLanguageExportPrepareResponse({
        httpOk: res.ok,
        httpStatus: res.status,
        data,
        messages: prepareMessages,
        previousTypographyQuality: typographyQuality,
      });

      setPreparePhase(result.phase);
      setTextLayers(result.layers);
      setError(result.error);
      setInfo(result.info);
      setPrepareDebug(result.debug);
      if (result.typographyQuality) {
        setTypographyQuality(result.typographyQuality);
      }

      logLanguageExportUi("requestCompleted", {
        action: "prepare",
        projectId,
        targetLanguage: targetLang,
        httpStatus: res.status,
        ok: result.debug.lastApiOk,
        layerCount: result.debug.layerCount,
        translationProvider: result.debug.translationProvider,
        errorCode: result.debug.errorCode,
      });

      if (result.error) {
        logLanguageExportUi("error", {
          action: "prepare",
          projectId,
          targetLanguage: targetLang,
          message: result.error,
          code: result.debug.errorCode,
        });
      }
    } catch (err) {
      const message = t("instant.languageExport.prepareFailed");
      setPreparePhase("failed");
      setError(message);
      setPrepareDebug({
        lastHttpStatus: null,
        lastApiOk: false,
        exportId: null,
        layerCount: 0,
        translationProvider: null,
        errorCode: "NETWORK_ERROR",
        errorMessage: err instanceof Error ? err.message : message,
        layerSourceStats: null,
      });
      logLanguageExportUi("error", {
        action: "prepare",
        projectId,
        targetLanguage: targetLang,
        message: err instanceof Error ? err.message : message,
      });
    } finally {
      if (translatePhaseTimerRef.current) {
        clearTimeout(translatePhaseTimerRef.current);
        translatePhaseTimerRef.current = null;
      }
      setPrepareLoading(false);
    }
  }, [projectId, targetLang, t, prepareMessages, typographyQuality]);

  const renderVersion = useCallback(async () => {
    setRenderLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(languageExportPrepareUrl(projectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          languageCode: targetLang,
          textLayers,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? t("instant.languageExport.renderFailed"));
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

  const prepareButtonLabel = t(languageExportPrepareButtonKey(preparePhase, prepareLoading));

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
          onChange={(e) => {
            setTargetLang(e.target.value as LanguageExportCode);
            setPreparePhase("idle");
          }}
          disabled={prepareLoading}
          className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
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
          {prepareButtonLabel}
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

      {preparePhase !== "idle" ? (
        <p className="mt-2 text-[11px] text-violet-900/80">
          {preparePhase === "loading_layers"
            ? t("instant.languageExport.statusLoadingLayers")
            : preparePhase === "translating"
              ? t("instant.languageExport.statusTranslating")
              : preparePhase === "ready"
                ? t("instant.languageExport.statusReady")
                : preparePhase === "failed"
                  ? t("instant.languageExport.statusFailed")
                  : null}
        </p>
      ) : null}

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

      {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
      {info ? <p className="mt-2 text-xs text-amber-900">{info}</p> : null}

      {isAdmin && prepareDebug ? (
        <div className="mt-3 rounded border border-dashed border-violet-300 bg-white/70 p-2 font-mono text-[10px] text-violet-950">
          <p className="font-semibold">{t("instant.languageExport.adminDebugTitle")}</p>
          <p>HTTP: {prepareDebug.lastHttpStatus ?? "—"}</p>
          <p>API ok: {String(prepareDebug.lastApiOk)}</p>
          <p>exportId: {prepareDebug.exportId ?? "—"}</p>
          <p>layers: {prepareDebug.layerCount}</p>
          <p>provider: {prepareDebug.translationProvider ?? "—"}</p>
          <p>code: {prepareDebug.errorCode ?? "—"}</p>
          {prepareDebug.errorMessage ? <p>message: {prepareDebug.errorMessage}</p> : null}
          {prepareDebug.layerSourceStats ? (
            <>
              <p className="mt-1 font-semibold">{t("instant.languageExport.adminLayerSources")}</p>
              <p>source: {prepareDebug.layerSourceStats.recoverySource}</p>
              <p>locked: {prepareDebug.layerSourceStats.lockedCount}</p>
              <p>baked OCR: {prepareDebug.layerSourceStats.bakedOcrCount}</p>
              <p>detected meta: {prepareDebug.layerSourceStats.detectedMetadataCount}</p>
              <p>OCR recovered: {prepareDebug.layerSourceStats.ocrRecoveredCount}</p>
              <p>style preserved: {prepareDebug.layerSourceStats.stylePreservedCount}</p>
              <p>persisted: {prepareDebug.layerSourceStats.persistedCount}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {playbackUrl && selectedPlayback !== "original" ? (
        <p className="mt-2 text-[10px] text-violet-800/80 break-all">{playbackUrl}</p>
      ) : null}
    </div>
  );
}
