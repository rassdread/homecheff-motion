"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  LANGUAGE_EXPORT_POLL_INTERVAL_MS,
  LANGUAGE_EXPORT_POLL_MAX_MS,
} from "@/lib/language-export-playback";
import type { VideoLanguageExportSummary } from "@/types/animation-api";
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
  applyLanguageExportPollRow,
  applyLanguageExportRenderStartResponse,
  buildLanguageExportRenderRequest,
  clearLanguageExportPending,
  fetchProjectLanguageExports,
  loadLanguageExportDraft,
  loadLanguageExportPending,
  logLanguageExportRenderUi,
  saveLanguageExportDraft,
  saveLanguageExportPending,
  type LanguageExportRenderDebug,
  type LanguageExportRenderPhase,
} from "@/lib/language-export-render";
import {
  isLanguageExportProgressActive,
  resolveLanguageExportProgress,
} from "@/lib/text-language-render-progress";
import { TextLanguageRenderProgressPanel } from "@/components/instant/text-language-render-progress-panel";
import {
  LANGUAGE_EXPORT_CODES,
  type LanguageExportCode,
} from "@/lib/video-language-export";
import {
  instantExportUserErrorMessage,
  postLanguageExportAction,
} from "@/lib/instant-export-client";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

type Props = {
  projectId: string;
  hasCompletedFinal: boolean;
  languageExports: VideoLanguageExportSummary[];
  onLanguageExportsChange: (exports: VideoLanguageExportSummary[]) => void;
  onRenderCompleted?: (languageCode: string, exportId: string) => void;
  showAdminDebug?: boolean;
};

const TARGET_CODES = LANGUAGE_EXPORT_CODES.filter((c) => c !== "original") as LanguageExportCode[];

export function LanguageExportPanel({
  projectId,
  hasCompletedFinal,
  languageExports,
  onLanguageExportsChange,
  onRenderCompleted,
  showAdminDebug = false,
}: Props) {
  const t = useActiveTranslator();
  const [targetLang, setTargetLang] = useState<LanguageExportCode>(() => {
    const draft = loadLanguageExportDraft(projectId);
    return (draft?.targetLang as LanguageExportCode) || "nl";
  });
  const [textLayers, setTextLayers] = useState<LanguageTextLayerRecord[]>(() => {
    const draft = loadLanguageExportDraft(projectId);
    return draft?.textLayers?.length ? draft.textLayers : [];
  });
  const [preparePhase, setPreparePhase] = useState<LanguageExportPreparePhase>(() => {
    const draft = loadLanguageExportDraft(projectId);
    return draft?.textLayers?.length ? "ready" : "idle";
  });
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [renderPhase, setRenderPhase] = useState<LanguageExportRenderPhase>(() =>
    loadLanguageExportPending(projectId)?.exportId ? "rendering" : "idle"
  );
  const [activeExportId, setActiveExportId] = useState<string | null>(
    () => loadLanguageExportPending(projectId)?.exportId ?? null
  );
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [typographyQuality, setTypographyQuality] = useState("premium");
  const [prepareDebug, setPrepareDebug] = useState<LanguageExportPrepareDebug | null>(null);
  const [renderDebug, setRenderDebug] = useState<LanguageExportRenderDebug | null>(null);
  const [videoTools, setVideoTools] = useState<{
    ffmpeg: boolean;
    ffprobe: boolean;
    ffmpegPath: string;
    ffprobePath: string;
  } | null>(null);
  const translatePhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderStartedAtMs, setRenderStartedAtMs] = useState<number | null>(null);
  const [progressTick, setProgressTick] = useState(0);

  const renderMessages = useMemo(
    () => ({
      renderFailed: t("instant.languageExport.renderFailed"),
      renderProgress: t("instant.languageExport.renderProgress"),
      renderComplete: t("instant.languageExport.renderComplete"),
      outputMissing: t("instant.languageExport.outputMissing"),
    }),
    [t]
  );

  const prepareMessages = useMemo(
    () => ({
      prepareFailed: t("instant.languageExport.prepareFailed"),
      noLayers: t("instant.languageExport.noLayers"),
      translationFailed: t("instant.languageExport.translationFailed"),
    }),
    [t]
  );

  useEffect(() => {
    return () => {
      if (translatePhaseTimerRef.current) {
        clearTimeout(translatePhaseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showAdminDebug) {
      return;
    }
    void fetch("/api/admin/runtime/video-tools", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === "object" && "ffmpegPath" in data) {
          setVideoTools(data as typeof videoTools);
        }
      })
      .catch(() => undefined);
  }, [showAdminDebug]);

  const refreshExports = useCallback(async () => {
    const exports = await fetchProjectLanguageExports(projectId);
    onLanguageExportsChange(exports);
    return exports;
  }, [projectId, onLanguageExportsChange]);

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
      const response = await postLanguageExportAction<LanguageExportPrepareApiResponse>(
        projectId,
        buildLanguageExportPrepareRequest(targetLang)
      );
      if (response.networkError) {
        const message = instantExportUserErrorMessage({
          kind: response.errorKind ?? "network",
          abortedMessage: t("instant.languageExport.requestAborted"),
          networkMessage: prepareMessages.prepareFailed,
          httpMessage: response.data.error,
          adminDetail: response.data.error,
          isAdmin: showAdminDebug,
        });
        setPreparePhase("failed");
        setError(message);
        return;
      }
      const data = response.data;
      const result = applyLanguageExportPrepareResponse({
        httpOk: response.ok,
        httpStatus: response.status,
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

      if (result.layers.length > 0) {
        saveLanguageExportDraft(projectId, {
          targetLang,
          textLayers: result.layers,
          savedAt: new Date().toISOString(),
        });
      }

      logLanguageExportUi("requestCompleted", {
        action: "prepare",
        projectId,
        targetLanguage: targetLang,
        httpStatus: response.status,
        ok: result.debug.lastApiOk,
        layerCount: result.debug.layerCount,
      });
    } catch (err) {
      const message = instantExportUserErrorMessage({
        kind: "network",
        abortedMessage: t("instant.languageExport.requestAborted"),
        networkMessage: prepareMessages.prepareFailed,
        adminDetail: err instanceof Error ? err.message : String(err),
        isAdmin: showAdminDebug,
      });
      setPreparePhase("failed");
      setError(message);
      logLanguageExportUi("error", {
        action: "prepare",
        projectId,
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

  const pollExportUntilDone = useCallback(
    async (exportId: string) => {
      const started = Date.now();
      setRenderStartedAtMs(started);

      while (Date.now() - started < LANGUAGE_EXPORT_POLL_MAX_MS) {
        await new Promise((resolve) => setTimeout(resolve, LANGUAGE_EXPORT_POLL_INTERVAL_MS));
        const exports = await refreshExports();
        const row = exports.find((e) => e.id === exportId);
        const polledAt = Date.now();
        setRenderDebug((prev) => ({
          lastHttpStatus: prev?.lastHttpStatus ?? 200,
          lastApiOk: true,
          exportId,
          status: row?.status ?? prev?.status ?? null,
          outputVideoUrlPresent: Boolean(row?.outputVideoUrl?.trim()),
          errorCode: prev?.errorCode ?? null,
          errorMessage: prev?.errorMessage ?? null,
          lastPollAtMs: polledAt,
        }));

        logLanguageExportRenderUi("poll", {
          projectId,
          exportId,
          status: row?.status,
          outputVideoUrl: row?.outputVideoUrl ?? null,
        });

        const pollResult = applyLanguageExportPollRow(row, renderMessages);
        if (!pollResult) {
          continue;
        }

        if (pollResult.phase === "completed") {
          setRenderPhase("completed");
          setInfo(pollResult.info);
          setError("");
          clearLanguageExportPending(projectId);
          if (pollResult.languageCode) {
            onRenderCompleted?.(pollResult.languageCode, exportId);
          }
          return;
        }

        if (pollResult.phase === "failed") {
          setRenderPhase("failed");
          setError(pollResult.error);
          setInfo("");
          clearLanguageExportPending(projectId);
          return;
        }

        setInfo(pollResult.info);
      }

      setRenderPhase("failed");
      setError(t("instant.languageExport.renderTimeout"));
      clearLanguageExportPending(projectId);
    },
    [projectId, refreshExports, renderMessages, onRenderCompleted, t]
  );

  const renderVersion = useCallback(async () => {
    if (textLayers.length === 0) {
      return;
    }

      setRenderPhase("starting");
      setError("");
      setInfo("");
      setRenderStartedAtMs(Date.now());

    logLanguageExportRenderUi("requestStarted", {
      projectId,
      languageCode: targetLang,
      exportId: activeExportId,
    });

    try {
      const response = await postLanguageExportAction<
        Parameters<typeof applyLanguageExportRenderStartResponse>[0]["data"]
      >(
        projectId,
        buildLanguageExportRenderRequest({
          languageCode: targetLang,
          layers: textLayers,
          exportId: activeExportId,
        })
      );
      if (response.networkError) {
        setRenderPhase("failed");
        setError(
          instantExportUserErrorMessage({
            kind: response.errorKind ?? "network",
            abortedMessage: t("instant.languageExport.requestAborted"),
            networkMessage: renderMessages.renderFailed,
            httpMessage: response.data.error,
            adminDetail: response.data.error,
            isAdmin: showAdminDebug,
          })
        );
        return;
      }

      const result = applyLanguageExportRenderStartResponse({
        httpOk: response.ok,
        httpStatus: response.status,
        data: response.data,
        messages: renderMessages,
      });

      setRenderDebug(result.debug);
      setActiveExportId(result.exportId);

      logLanguageExportRenderUi("requestCompleted", {
        projectId,
        languageCode: targetLang,
        exportId: result.exportId,
        httpStatus: response.status,
        apiOk: result.debug.lastApiOk,
        status: result.status,
        outputVideoUrl: result.outputVideoUrl,
        errorCode: result.debug.errorCode,
      });

      if (result.phase === "failed") {
        setRenderPhase("failed");
        setError(result.error);
        setInfo("");
        return;
      }

      if (result.exportId) {
        saveLanguageExportPending(projectId, {
          exportId: result.exportId,
          languageCode: targetLang,
          savedAt: new Date().toISOString(),
        });
      }

      const exports = await refreshExports();

      if (result.phase === "completed" && result.languageCode && result.exportId) {
        setRenderPhase("completed");
        setInfo(result.info);
        clearLanguageExportPending(projectId);
        onRenderCompleted?.(result.languageCode, result.exportId);
        return;
      }

      const exportId = result.exportId;
      if (!exportId) {
        setRenderPhase("failed");
        setError(renderMessages.renderFailed);
        return;
      }

      const existing = exports.find((e) => e.id === exportId);
      if (existing?.status === "completed" && existing.outputVideoUrl?.trim()) {
        setRenderPhase("completed");
        setInfo(renderMessages.renderComplete);
        clearLanguageExportPending(projectId);
        onRenderCompleted?.(existing.languageCode, exportId);
        return;
      }

      setRenderPhase("rendering");
      setInfo(renderMessages.renderProgress);
      await pollExportUntilDone(exportId);
    } catch (err) {
      setRenderPhase("failed");
      setError(
        instantExportUserErrorMessage({
          kind: "network",
          abortedMessage: t("instant.languageExport.requestAborted"),
          networkMessage: renderMessages.renderFailed,
          adminDetail: err instanceof Error ? err.message : String(err),
          isAdmin: showAdminDebug,
        })
      );
      logLanguageExportRenderUi("error", {
        projectId,
        languageCode: targetLang,
        message: err instanceof Error ? err.message : renderMessages.renderFailed,
      });
    }
  }, [
    projectId,
    targetLang,
    textLayers,
    activeExportId,
    renderMessages,
    refreshExports,
    pollExportUntilDone,
    onRenderCompleted,
  ]);

  const renderLoading = renderPhase === "starting" || renderPhase === "rendering";
  const languageExportProgressActive =
    prepareLoading ||
    renderLoading ||
    isLanguageExportProgressActive({ preparePhase, renderPhase });

  useEffect(() => {
    if (!languageExportProgressActive) {
      return;
    }
    const timer = window.setInterval(() => {
      setProgressTick((value) => value + 1);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [languageExportProgressActive]);

  const languageExportProgress = useMemo(
    () =>
      resolveLanguageExportProgress({
        preparePhase,
        renderPhase,
        usesStoryOverlay: false,
        renderStartedAtMs,
        nowMs:
          renderStartedAtMs != null ? renderStartedAtMs + progressTick * 2000 : undefined,
        errorMessage: error || null,
      }),
    [error, preparePhase, progressTick, renderPhase, renderStartedAtMs]
  );

  useEffect(() => {
    const pending = languageExports.some(
      (e) => e.status === "queued" || e.status === "rendering"
    );
    if (!pending || renderLoading) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshExports();
    }, LANGUAGE_EXPORT_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [languageExports, refreshExports, renderLoading]);

  const resumePollOnceRef = useRef(false);
  useEffect(() => {
    const pending = loadLanguageExportPending(projectId);
    if (!pending?.exportId || resumePollOnceRef.current) {
      return;
    }
    resumePollOnceRef.current = true;
    void pollExportUntilDone(pending.exportId);
  }, [projectId, pollExportUntilDone]);

  const prepareButtonLabel = t(languageExportPrepareButtonKey(preparePhase, prepareLoading));

  if (!hasCompletedFinal) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-zinc-700">
          {t("instant.languageExport.targetLanguage")}
        </label>
        <select
          value={targetLang}
          onChange={(e) => {
            setTargetLang(e.target.value as LanguageExportCode);
            setPreparePhase("idle");
          }}
          disabled={prepareLoading || renderLoading}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
        >
          {TARGET_CODES.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={prepareLoading || renderLoading}
          onClick={() => void prepareTexts()}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
        >
          {prepareButtonLabel}
        </button>
        <button
          type="button"
          disabled={renderLoading || prepareLoading || textLayers.length === 0}
          onClick={() => void renderVersion()}
          className="rounded-md bg-zinc-800 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
        >
          {renderLoading
            ? t("instant.languageExport.rendering")
            : t("instant.languageExport.renderButton")}
        </button>
      </div>

      {languageExportProgress.phase !== "idle" ? (
        <TextLanguageRenderProgressPanel progress={languageExportProgress} />
      ) : null}

      {textLayers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            {t("instant.languageExport.typographyPreviewHint")} ({typographyQuality})
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto text-xs">
            {textLayers.map((layer) => (
              <div key={layer.id} className="rounded-lg border border-zinc-200 bg-white p-2">
                {layer.previewDataUrl ? (
                  <img
                    src={layer.previewDataUrl}
                    alt=""
                    className="mb-2 w-full rounded border border-zinc-100 bg-zinc-900/90 object-contain"
                  />
                ) : null}
                <p className="font-mono text-[10px] text-zinc-500">{layer.sourceText}</p>
                <textarea
                  value={layer.translatedText}
                  disabled={renderLoading}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTextLayers((prev) => {
                      const updated = prev.map((row) =>
                        row.id === layer.id ? { ...row, translatedText: next } : row
                      );
                      saveLanguageExportDraft(projectId, {
                        targetLang,
                        textLayers: updated,
                        savedAt: new Date().toISOString(),
                      });
                      return updated;
                    });
                  }}
                  rows={2}
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-xs disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showAdminDebug && languageExports.length > 0 ? (
        <ul className="space-y-1 text-[11px] text-zinc-600">
          {languageExports.map((row) => (
            <li key={row.id}>
              {row.languageLabel ?? row.languageCode}: {row.status}
              {row.errorMessage ? ` — ${row.errorMessage}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
      {info && !error ? <p className="text-xs text-amber-900">{info}</p> : null}

      {showAdminDebug && prepareDebug ? (
        <div className="rounded border border-dashed border-zinc-300 bg-white p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminDebugTitle")}</p>
          <p>prepare HTTP: {prepareDebug.lastHttpStatus ?? "—"}</p>
          <p>layers: {prepareDebug.layerCount}</p>
        </div>
      ) : null}

      {showAdminDebug && videoTools ? (
        <div className="rounded border border-dashed border-zinc-300 bg-white p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminVideoToolsTitle")}</p>
          <p>ffmpeg: {String(videoTools.ffmpeg)} ({videoTools.ffmpegPath})</p>
          <p>ffprobe: {String(videoTools.ffprobe)} ({videoTools.ffprobePath})</p>
        </div>
      ) : null}

      {showAdminDebug && renderDebug ? (
        <div className="rounded border border-dashed border-zinc-300 bg-white p-2 font-mono text-[10px] text-zinc-800">
          <p className="font-semibold">{t("instant.languageExport.adminRenderDebugTitle")}</p>
          <p>render HTTP: {renderDebug.lastHttpStatus ?? "—"}</p>
          <p>exportId: {renderDebug.exportId ?? "—"}</p>
          <p>status: {renderDebug.status ?? "—"}</p>
          <p>outputVideoUrl: {String(renderDebug.outputVideoUrlPresent)}</p>
          <p>code: {renderDebug.errorCode ?? "—"}</p>
          <p>last poll: {renderDebug.lastPollAtMs ? new Date(renderDebug.lastPollAtMs).toISOString() : "—"}</p>
        </div>
      ) : null}
    </div>
  );
}
