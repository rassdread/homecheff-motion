"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StoryboardEditorLegacy } from "@/components/instant/storyboard-editor";
import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import { LanguageExportPanel } from "@/components/instant/language-export-panel";
import { TextLanguageRenderProgressPanel } from "@/components/instant/text-language-render-progress-panel";
import type { LanguageExportPreparePhase } from "@/lib/language-export-prepare";
import type { LanguageExportRenderPhase } from "@/lib/language-export-render";
import {
  isLanguageExportProgressActive,
  resolveLanguageExportProgress,
} from "@/lib/text-language-render-progress";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { LANGUAGE_EXPORT_POLL_INTERVAL_MS } from "@/lib/language-export-playback";
import {
  normalizeLanguageExportRows,
  pickCurrentLanguageExportPerLanguage,
} from "@/lib/project-video-versions";
import {
  formatLanguageVersionTitle,
  formatTextVersionTitle,
} from "@/lib/language-version-display";
import { parseTextVersionNotesJson, findTextVersionNote } from "@/lib/text-version-notes";
import {
  VersionLifecycleBadge,
  VersionNoteDisplay,
} from "@/components/videos/version-lifecycle-badge";
import { sceneTextsSummary } from "@/lib/story-language-export";
import { sceneTextToDraft } from "@/lib/instant-scene-text-editor";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { TextRerenderEditorModal } from "@/components/instant/text-rerender-editor-modal";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";
import {
  LANGUAGE_EXPORT_CODES,
  type LanguageExportCode,
} from "@/lib/video-language-export";
import {
  STORY_SCENE_DURATION_OPTIONS,
  type StorySceneDurationSeconds,
} from "@/lib/story-overlay-templates";
import { VideoPreview } from "@/components/ui/video-preview";
import {
  getProjectLanguageExports,
  instantExportUserErrorMessage,
  postLanguageExportAction,
  type InstantExportClientErrorKind,
} from "@/lib/instant-export-client";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

type StoryboardImage = { id: string; previewUrl: string };

type Props = {
  projectId: string;
  cleanVideoUrl: string | null;
  finalVideoUrl: string | null;
  usesStoryOverlay: boolean;
  instantSceneTexts?: unknown;
  images?: StoryboardImage[];
  languageExports: VideoLanguageExportSummary[];
  onLanguageExportsChange: (exports: VideoLanguageExportSummary[]) => void;
  /** When the hero player already shows the original final, skip a second full preview. */
  hideOriginalVideoPlayer?: boolean;
  /** Grouped layout for project detail page (original → clean → languages). */
  layout?: "default" | "detail";
  /** Called when user chooses to create a language version from outside the panel. */
  onRequestCreateLanguage?: () => void;
  onTextsRerendered?: () => void;
  textRerenderBusy?: boolean;
  rebuildCount?: number;
  previousFinalVideoUrl?: string | null;
  textVersionNotesJson?: unknown;
  /** Hero/export points at an older final while a newer attempt failed or is pending. */
  finalIsArchivedFallback?: boolean;
  /** Bare concat from latest clips; final overlay/upload did not complete. */
  cleanIsLatestBareOnly?: boolean;
  bundleCatalog?: MotionVersionCatalog | null;
};

const TARGET_CODES = LANGUAGE_EXPORT_CODES.filter((c) => c !== "original") as LanguageExportCode[];

function toDraftDuration(value: number | undefined, fallback: StorySceneDurationSeconds = 5): StorySceneDurationSeconds {
  if (value === 3 || value === 5 || value === 7) {
    return value;
  }
  return STORY_SCENE_DURATION_OPTIONS.includes(fallback as (typeof STORY_SCENE_DURATION_OPTIONS)[number])
    ? fallback
    : 5;
}

function sceneToDraft(scene: ReturnType<typeof parseSceneTextsJson>[number]): InstantSceneTextDraft {
  return sceneTextToDraft(scene);
}

function statusLabel(status: string, t: ReturnType<typeof useActiveTranslator>): string {
  if (status === "completed") {
    return t("instant.videoVersions.statusReady");
  }
  if (status === "rendering" || status === "queued") {
    return t("instant.videoVersions.statusRendering");
  }
  if (status === "failed") {
    return t("instant.videoVersions.statusFailed");
  }
  if (status === "needs_refresh") {
    return t("instant.videoVersions.statusNeedsRefresh");
  }
  if (status === "draft") {
    return t("instant.videoVersions.statusDraft");
  }
  return status;
}

function VideoCard({
  title,
  lifecycleBadge,
  status,
  videoUrl,
  summary,
  versionNote,
  downloadHref,
  errorMessage,
  showVideoPlayer = true,
  children,
}: {
  title: string;
  lifecycleBadge?: "current" | "archived" | null;
  status?: string;
  videoUrl?: string | null;
  summary?: string;
  versionNote?: string | null;
  downloadHref?: string;
  errorMessage?: string | null;
  showVideoPlayer?: boolean;
  children?: React.ReactNode;
}) {
  const showVideo = showVideoPlayer !== false;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            {lifecycleBadge ?
              <VersionLifecycleBadge lifecycle={lifecycleBadge} />
            : null}
          </div>
          {status ?
            <p className="mt-1 text-xs text-zinc-600">{status}</p>
          : null}
          {summary ?
            <p className="mt-1 text-xs text-zinc-500">{summary}</p>
          : null}
          {versionNote ?
            <VersionNoteDisplay note={versionNote} className="mt-2" />
          : null}
          {errorMessage ?
            <p className="mt-2 text-xs text-red-700">{errorMessage}</p>
          : null}
        </div>
      </div>
      {videoUrl && showVideo ?
        <VideoPreview variant="version" src={videoUrl} controls playsInline preload="none" />
      : null}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function VideoVersionsPanel({
  projectId,
  cleanVideoUrl,
  finalVideoUrl,
  usesStoryOverlay,
  instantSceneTexts,
  images = [],
  languageExports,
  onLanguageExportsChange,
  hideOriginalVideoPlayer = false,
  layout = "default",
  onRequestCreateLanguage,
  onTextsRerendered,
  textRerenderBusy = false,
  rebuildCount = 0,
  previousFinalVideoUrl = null,
  textVersionNotesJson,
  finalIsArchivedFallback = false,
  cleanIsLatestBareOnly = false,
  bundleCatalog = null,
}: Props) {
  const t = useActiveTranslator();
  const [createOpen, setCreateOpen] = useState(false);
  const [textRerenderOpen, setTextRerenderOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLanguageFilter, setHistoryLanguageFilter] = useState<string>("all");
  const [targetLang, setTargetLang] = useState<LanguageExportCode>("nl");
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>([]);
  const [storyboardExpandedIndex, setStoryboardExpandedIndex] = useState<number | null>(0);
  const [editExportId, setEditExportId] = useState<string | null>(null);
  const [draftExportId, setDraftExportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [langPreparePhase, setLangPreparePhase] = useState<LanguageExportPreparePhase>("idle");
  const [langRenderPhase, setLangRenderPhase] = useState<LanguageExportRenderPhase>("idle");
  const [langRenderStartedAtMs, setLangRenderStartedAtMs] = useState<number | null>(() =>
    languageExports.some((row) => row.status === "queued" || row.status === "rendering")
      ? Date.now()
      : null
  );
  const langTranslateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [langProgressTick, setLangProgressTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const originalSummary = useMemo(() => {
    const texts = parseSceneTextsJson(instantSceneTexts);
    return sceneTextsSummary(texts);
  }, [instantSceneTexts]);

  const editorImages = useMemo((): StoryboardImage[] => {
    const count = Math.max(images.length, sceneTexts.length, 1);
    return Array.from({ length: count }, (_, index) =>
      images[index] ?? { id: `lang-frame-${index}`, previewUrl: "" }
    );
  }, [images, sceneTexts.length]);

  const mapExportError = useCallback(
    (kind: InstantExportClientErrorKind | null, fallback: string, detail?: string) =>
      instantExportUserErrorMessage({
        kind: kind === "abort" ? "abort" : "network",
        abortedMessage: t("instant.languageExport.requestAborted"),
        networkMessage: fallback,
        httpMessage: detail,
      }),
    [t]
  );

  const refreshExports = useCallback(async () => {
    const result = await getProjectLanguageExports(projectId);
    if (result.exports.length > 0 || !result.networkError) {
      onLanguageExportsChange(result.exports);
    }
  }, [projectId, onLanguageExportsChange]);

  const hasActiveRender = languageExports.some(
    (row) => row.status === "queued" || row.status === "rendering"
  );

  const effectiveLangRenderPhase = useMemo((): LanguageExportRenderPhase => {
    if (langRenderPhase === "failed") {
      return "failed";
    }
    if (hasActiveRender) {
      return langRenderPhase === "starting" ? "starting" : "rendering";
    }
    if (langRenderPhase === "rendering" || langRenderPhase === "starting") {
      return languageExports.some((row) => row.status === "failed") ? "failed" : "completed";
    }
    return langRenderPhase;
  }, [hasActiveRender, langRenderPhase, languageExports]);

  const storyLanguageExportProgressActive =
    usesStoryOverlay &&
    (busy ||
      hasActiveRender ||
      isLanguageExportProgressActive({
        preparePhase: langPreparePhase,
        renderPhase: effectiveLangRenderPhase,
      }) ||
      effectiveLangRenderPhase === "completed");

  useEffect(() => {
    if (!storyLanguageExportProgressActive) {
      return;
    }
    const timer = window.setInterval(() => {
      setLangProgressTick((value) => value + 1);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [storyLanguageExportProgressActive]);

  const storyLanguageExportProgress = useMemo(
    () =>
      resolveLanguageExportProgress({
        preparePhase: langPreparePhase,
        renderPhase: effectiveLangRenderPhase,
        usesStoryOverlay: true,
        renderStartedAtMs: langRenderStartedAtMs,
        nowMs:
          langRenderStartedAtMs != null
            ? langRenderStartedAtMs + langProgressTick * 2000
            : undefined,
        errorMessage: error || null,
      }),
    [
      effectiveLangRenderPhase,
      error,
      langPreparePhase,
      langProgressTick,
      langRenderStartedAtMs,
    ]
  );

  useEffect(() => {
    return () => {
      if (langTranslateTimerRef.current) {
        clearTimeout(langTranslateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasActiveRender) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(() => {
      void refreshExports();
    }, LANGUAGE_EXPORT_POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [hasActiveRender, refreshExports]);

  const initCreateFlow = async (lang: LanguageExportCode) => {
    setError("");
    setInfo("");
    setBusy(true);
    setLangPreparePhase("loading_layers");
    langTranslateTimerRef.current = setTimeout(() => {
      setLangPreparePhase((phase) => (phase === "loading_layers" ? "translating" : phase));
    }, 200);
    try {
      const result = await postLanguageExportAction<{
        ok?: boolean;
        sceneTexts?: unknown;
        exportId?: string | null;
        message?: string | null;
        translationFailed?: boolean;
        error?: string;
      }>(projectId, { action: "prepare", languageCode: lang });
      if (result.networkError) {
        throw new Error(
          mapExportError(
            result.errorKind,
            t("instant.languageExport.prepareFailed"),
            result.data.error ?? result.data.message ?? undefined
          )
        );
      }
      const json = result.data;
      if (!result.ok || !json.ok) {
        throw new Error(json.message ?? t("instant.languageExport.prepareFailed"));
      }
      const parsed = parseSceneTextsJson(json.sceneTexts ?? instantSceneTexts);
      setSceneTexts(parsed.map(sceneToDraft));
      setStoryboardExpandedIndex(0);
      setDraftExportId(json.exportId?.trim() || null);
      setEditExportId(null);
      setInfo(
        (json as { translationFailed?: boolean }).translationFailed && json.message ?
          json.message
        : t("instant.videoVersions.autoTranslateNote")
      );
      setCreateOpen(true);
      setLangPreparePhase("ready");
    } catch (e) {
      setLangPreparePhase("failed");
      setError(e instanceof Error ? e.message : t("instant.languageExport.prepareFailed"));
    } finally {
      if (langTranslateTimerRef.current) {
        clearTimeout(langTranslateTimerRef.current);
        langTranslateTimerRef.current = null;
      }
      setBusy(false);
    }
  };

  const renderLanguageVersion = async (lang: LanguageExportCode, texts: InstantSceneTextDraft[]) => {
    setBusy(true);
    setError("");
    setLangRenderPhase("starting");
    setLangRenderStartedAtMs(Date.now());
    try {
      const result = await postLanguageExportAction<{
        ok?: boolean;
        message?: string;
        exports?: VideoLanguageExportSummary[];
        error?: string;
      }>(projectId, {
        action: "render",
        languageCode: lang,
        exportId: draftExportId ?? undefined,
        sceneTexts: texts.map((scene, index) => instantSceneTextFromDraft(scene, index, texts.length)),
      });
      if (result.networkError) {
        throw new Error(
          mapExportError(result.errorKind, t("instant.languageExport.renderFailed"), result.data.error)
        );
      }
      const json = result.data;
      if (!result.ok || !json.ok) {
        throw new Error(json.message ?? t("instant.languageExport.renderFailed"));
      }
      if (json.exports) {
        onLanguageExportsChange(json.exports);
      } else {
        await refreshExports();
      }
      setCreateOpen(false);
      setEditExportId(null);
      setDraftExportId(null);
      setInfo(t("instant.videoVersions.renderStarted"));
      setLangRenderPhase("rendering");
    } catch (e) {
      setLangRenderPhase("failed");
      setError(e instanceof Error ? e.message : t("instant.languageExport.renderFailed"));
    } finally {
      setBusy(false);
    }
  };

  const rerenderExport = async (exportId: string) => {
    setBusy(true);
    setError("");
    setLangRenderPhase("starting");
    setLangRenderStartedAtMs(Date.now());
    try {
      const result = await postLanguageExportAction<{
        ok?: boolean;
        message?: string;
        exports?: VideoLanguageExportSummary[];
        error?: string;
      }>(projectId, { action: "rerender", exportId });
      if (result.networkError) {
        throw new Error(
          mapExportError(result.errorKind, t("instant.videoVersions.errorRerender"), result.data.error)
        );
      }
      const json = result.data;
      if (!result.ok || !json.ok) {
        throw new Error(json.message ?? t("instant.videoVersions.errorRerender"));
      }
      if (json.exports) {
        onLanguageExportsChange(json.exports);
      }
      setLangRenderPhase("rendering");
    } catch (e) {
      setLangRenderPhase("failed");
      setError(e instanceof Error ? e.message : t("instant.videoVersions.errorRerender"));
    } finally {
      setBusy(false);
    }
  };

  const textVersionNotes = useMemo(
    () => parseTextVersionNotesJson(textVersionNotesJson),
    [textVersionNotesJson]
  );

  const { primaryLanguageExports, historyLanguageExports } = useMemo(() => {
    const normalized = normalizeLanguageExportRows(languageExports);
    const currentByLang = new Map(
      pickCurrentLanguageExportPerLanguage(normalized).map((row) => [row.languageCode, row.id])
    );
    const primary: VideoLanguageExportSummary[] = [];
    const history: VideoLanguageExportSummary[] = [];
    for (const row of languageExports) {
      if (row.status !== "completed") {
        primary.push(row);
        continue;
      }
      if (currentByLang.get(row.languageCode) === row.id) {
        primary.push(row);
      } else if (row.outputVideoUrl?.trim()) {
        history.push(row);
      }
    }
    return { primaryLanguageExports: primary, historyLanguageExports: history };
  }, [languageExports]);

  const historyLanguageCodes = useMemo(
    () =>
      [...new Set(historyLanguageExports.map((row) => row.languageCode))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [historyLanguageExports]
  );

  const filteredHistoryLanguageExports = useMemo(() => {
    if (historyLanguageFilter === "all") {
      return historyLanguageExports;
    }
    return historyLanguageExports.filter((row) => row.languageCode === historyLanguageFilter);
  }, [historyLanguageExports, historyLanguageFilter]);

  if (!finalVideoUrl && !cleanVideoUrl) {
    return null;
  }

  const isDetailLayout = layout === "detail";
  const originalTitle =
    isDetailLayout ? t("projectDetail.versions.originalTitle") : t("instant.videoVersions.originalTitle");
  const cleanTitle =
    isDetailLayout ? t("projectDetail.versions.cleanTitle") : t("instant.videoVersions.cleanTitle");

  const currentTextVersionNote =
    rebuildCount > 0 ? findTextVersionNote(textVersionNotes, rebuildCount) : null;

  const archivedTextVersion =
    previousFinalVideoUrl?.trim() && rebuildCount > 0
      ? {
          version: Math.max(1, rebuildCount - 1),
          url: previousFinalVideoUrl.trim(),
          note: findTextVersionNote(textVersionNotes, Math.max(1, rebuildCount - 1)),
        }
      : null;

  const originalCard = (
    <VideoCard
      title={
        rebuildCount > 0
          ? formatTextVersionTitle(rebuildCount)
          : originalTitle
      }
      lifecycleBadge={finalIsArchivedFallback ? "archived" : "current"}
      videoUrl={finalVideoUrl}
      versionNote={currentTextVersionNote}
      showVideoPlayer={!hideOriginalVideoPlayer}
      summary={
        isDetailLayout ? t("projectDetail.versions.originalDesc") : originalSummary || undefined
      }
      downloadHref={finalVideoUrl ? animationProjectDownloadUrl(projectId) : undefined}
    >
      {finalVideoUrl ?
        <>
          <a
            href={animationProjectDownloadUrl(projectId)}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white sm:w-auto"
          >
            {t("instant.videoVersions.download")}
          </a>
          {usesStoryOverlay ?
            <button
              type="button"
              disabled={busy || hasActiveRender || textRerenderBusy}
              onClick={() => setTextRerenderOpen(true)}
              className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-900 disabled:opacity-50 sm:w-auto"
            >
              {textRerenderBusy ? t("instant.textRerender.busy") : t("instant.textRerender.cta")}
            </button>
          : null}
        </>
      : null}
    </VideoCard>
  );

  const cleanCard = (
    <VideoCard
      title={cleanTitle}
      lifecycleBadge={cleanVideoUrl ? "current" : null}
      videoUrl={cleanVideoUrl}
      summary={
        cleanIsLatestBareOnly
          ? t("projectDetail.versions.cleanLatestBareOnly")
          : isDetailLayout
            ? t("projectDetail.versions.cleanDesc")
            : undefined
      }
      downloadHref={
        cleanVideoUrl ? animationProjectDownloadUrl(projectId, { variant: "clean" }) : undefined
      }
    >
      {cleanVideoUrl ?
        <a
          href={animationProjectDownloadUrl(projectId, { variant: "clean" })}
          className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white sm:w-auto"
        >
          {t("instant.videoVersions.download")}
        </a>
      : (
        <p className="text-xs text-zinc-500">{t("instant.videoVersions.cleanUnavailable")}</p>
      )}
    </VideoCard>
  );

  const renderLanguageCard = (row: VideoLanguageExportSummary, archived = false) => (
        <VideoCard
          key={row.id}
          title={formatLanguageVersionTitle(
            row.languageCode,
            row.languageLabel,
            row.version ?? 1
          )}
          lifecycleBadge={archived ? "archived" : row.status === "completed" ? "current" : null}
          status={statusLabel(row.status, t)}
          videoUrl={row.status === "completed" ? row.outputVideoUrl : null}
          versionNote={row.versionNote}
          summary={
            row.overlayRenderMode === "story_overlay" && row.sceneTextsJson ?
              sceneTextsSummary(parseSceneTextsJson(row.sceneTextsJson))
            : undefined
          }
          errorMessage={row.status === "failed" ? row.errorMessage : null}
        >
          {row.status === "completed" && row.outputVideoUrl ?
            <>
              <a
                href={animationProjectDownloadUrl(projectId, {
                  languageCode: row.languageCode,
                  languageExportId: row.id,
                })}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                {t("instant.videoVersions.download")}
              </a>
              {!archived && usesStoryOverlay ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditExportId(row.id);
                    setTargetLang(row.languageCode as LanguageExportCode);
                    const parsed = parseSceneTextsJson(row.sceneTextsJson ?? instantSceneTexts);
                    setSceneTexts(parsed.map(sceneToDraft));
                    setStoryboardExpandedIndex(0);
                    setCreateOpen(true);
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800"
                >
                  {t("instant.videoVersions.editTexts")}
                </button>
              : null}
            </>
          : null}
          {row.status === "draft" && usesStoryOverlay && !archived ?
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditExportId(null);
                setDraftExportId(row.id);
                setTargetLang(row.languageCode as LanguageExportCode);
                const parsed = parseSceneTextsJson(row.sceneTextsJson ?? instantSceneTexts);
                setSceneTexts(parsed.map(sceneToDraft));
                setStoryboardExpandedIndex(0);
                setCreateOpen(true);
              }}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800"
            >
              {t("instant.videoVersions.reviewDraft")}
            </button>
          : null}
          {(row.status === "failed" || row.status === "needs_refresh") && (
            <button
              type="button"
              disabled={busy || hasActiveRender}
              onClick={() => void rerenderExport(row.id)}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900 disabled:opacity-50"
            >
              {t("instant.textRerender.render")}
            </button>
          )}
        </VideoCard>
      );

  const languageCards = primaryLanguageExports.map((row) => renderLanguageCard(row, false));

  const createLanguageBlock = usesStoryOverlay ?
    <div className="space-y-2" id="version-languages-create">
      <p className="text-sm text-zinc-600">{t("instant.videoVersions.createLanguageHint")}</p>
      <p className="text-xs text-zinc-500">{t("instant.videoVersions.autoTranslateNote")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex w-full flex-col gap-1 text-sm text-zinc-700 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          {t("instant.videoVersions.chooseLanguage")}
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as LanguageExportCode)}
            className="w-full rounded-lg border border-zinc-200 px-2 py-2 sm:w-auto"
          >
            {TARGET_CODES.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || hasActiveRender || !cleanVideoUrl}
          onClick={() => {
            onRequestCreateLanguage?.();
            void initCreateFlow(targetLang);
          }}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          {t("instant.videoVersions.createLanguageVersion")}
        </button>
      </div>
    </div>
  : (
    <LanguageExportPanel
      projectId={projectId}
      hasCompletedFinal={Boolean(finalVideoUrl)}
      languageExports={languageExports}
      onLanguageExportsChange={onLanguageExportsChange}
      bundleCatalog={bundleCatalog}
    />
  );

  return (
    <section
      className={isDetailLayout ? "mt-8 space-y-6" : "mt-6 space-y-4"}
      aria-labelledby={isDetailLayout ? "project-detail-versions-title" : undefined}
    >
      {isDetailLayout ?
        <div>
          <h2 id="project-detail-versions-title" className="text-lg font-semibold text-zinc-900">
            {t("projectDetail.versions.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("instant.videoVersions.noCreditsNote")}</p>
        </div>
      : <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("instant.videoVersions.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("instant.videoVersions.subtitle")}</p>
          <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
            {t("instant.videoVersions.noCreditsNote")}
          </p>
        </div>
      }

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      : null}
      {info ?
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {info}
        </p>
      : null}

      {isDetailLayout ?
        <>
          <div id="version-original" className="scroll-mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-800">{originalTitle}</h3>
            {originalCard}
          </div>
          <div id="version-clean" className="scroll-mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-800">{cleanTitle}</h3>
            {cleanCard}
          </div>
          <div id="version-languages" className="scroll-mt-6 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">
                {t("projectDetail.versions.languagesTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-600">
                {t("projectDetail.versions.languagesDesc")}
              </p>
            </div>
            {languageCards}
            {historyLanguageExports.length > 0 || archivedTextVersion ?
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((value) => !value)}
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-zinc-800"
                >
                  <span>{t("projectDetail.versions.historyTitle")}</span>
                  <span className="text-xs text-zinc-500">
                    {historyLanguageExports.length + (archivedTextVersion ? 1 : 0)}
                  </span>
                </button>
                {historyOpen ?
                  <div className="mt-3 space-y-3">
                    {historyLanguageCodes.length > 1 ?
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        {t("projectDetail.versions.historyFilterLabel")}
                        <select
                          value={historyLanguageFilter}
                          onChange={(e) => setHistoryLanguageFilter(e.target.value)}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        >
                          <option value="all">{t("projectDetail.versions.historyFilterAll")}</option>
                          {historyLanguageCodes.map((code) => {
                            const label =
                              historyLanguageExports.find((row) => row.languageCode === code)
                                ?.languageLabel ?? code.toUpperCase();
                            return (
                              <option key={code} value={code}>
                                {formatLanguageVersionTitle(code, label, 1).replace(/ v1$/, "")}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    : null}
                    {archivedTextVersion ?
                      <VideoCard
                        title={formatTextVersionTitle(archivedTextVersion.version)}
                        lifecycleBadge="archived"
                        videoUrl={archivedTextVersion.url}
                        versionNote={archivedTextVersion.note}
                      >
                        <a
                          href={animationProjectDownloadUrl(projectId, { variant: "previous_final" })}
                          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
                        >
                          {t("instant.videoVersions.download")}
                        </a>
                      </VideoCard>
                    : null}
                    {filteredHistoryLanguageExports.map((row) => renderLanguageCard(row, true))}
                  </div>
                : null}
              </div>
            : null}
            {storyLanguageExportProgress.phase !== "idle" ? (
              <TextLanguageRenderProgressPanel progress={storyLanguageExportProgress} />
            ) : null}
            {createLanguageBlock}
          </div>
        </>
      : <>
          {cleanCard}
          {originalCard}
          {languageCards}
          {storyLanguageExportProgress.phase !== "idle" ? (
            <TextLanguageRenderProgressPanel progress={storyLanguageExportProgress} />
          ) : null}
          {createLanguageBlock}
        </>
      }

      {createOpen && usesStoryOverlay ?
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">
            {editExportId ?
              t("instant.videoVersions.editTexts")
            : t("instant.videoVersions.createLanguageVersion")}
          </p>
          <StoryboardEditorLegacy
            images={editorImages}
            imageCount={Math.max(editorImages.length, sceneTexts.length)}
            sceneTexts={sceneTexts}
            expandedIndex={storyboardExpandedIndex}
            onExpandedIndexChange={setStoryboardExpandedIndex}
            onSceneChange={(index, patch) =>
              setSceneTexts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
            }
            onMoveScene={() => undefined}
            onDuplicateTextFromPrevious={() => undefined}
            onClearText={() => undefined}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || hasActiveRender}
              onClick={() =>
                editExportId ?
                  void (async () => {
                    setBusy(true);
                    try {
                      setInfo(t("instant.textRerender.busy"));
                      const result = await postLanguageExportAction<{
                        ok?: boolean;
                        message?: string;
                        error?: string;
                      }>(
                        projectId,
                        {
                          action: "update",
                          exportId: editExportId,
                          sceneTexts: sceneTexts.map((scene, index) =>
                            instantSceneTextFromDraft(scene, index, sceneTexts.length)
                          ),
                        }
                      );
                      if (result.networkError) {
                        throw new Error(
                          mapExportError(
                            result.errorKind,
                            t("instant.videoVersions.errorSave"),
                            result.data.error
                          )
                        );
                      }
                      if (!result.ok || !result.data.ok) {
                        throw new Error(result.data.message ?? t("instant.videoVersions.errorSave"));
                      }
                      await rerenderExport(editExportId);
                      setCreateOpen(false);
                      setEditExportId(null);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : t("instant.videoVersions.errorSave"));
                    } finally {
                      setBusy(false);
                    }
                  })()
                : void renderLanguageVersion(targetLang, sceneTexts)
              }
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("instant.textRerender.render")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setEditExportId(null);
                setDraftExportId(null);
              }}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-700"
            >
              {t("instant.videoVersions.cancel")}
            </button>
          </div>
        </div>
      : null}

      <p className="text-xs text-zinc-500">
        <Link href={`/videos/${encodeURIComponent(projectId)}`} className="underline">
          {t("instant.videoVersions.openProjectPage")}
        </Link>
      </p>

      <TextRerenderEditorModal
        open={textRerenderOpen}
        onClose={() => setTextRerenderOpen(false)}
        projectId={projectId}
        instantSceneTexts={instantSceneTexts}
        images={images}
        imageCount={Math.max(images.length, parseSceneTextsJson(instantSceneTexts).length, 1)}
        bundleCatalog={bundleCatalog}
        onSuccess={() => {
          setInfo(t("instant.progress.rebuildFinalSuccess"));
          onTextsRerendered?.();
        }}
        onError={(message) => setError(message)}
      />
    </section>
  );
}
