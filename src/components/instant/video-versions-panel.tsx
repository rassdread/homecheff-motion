"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StoryboardEditor } from "@/components/instant/storyboard-editor";
import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import { LanguageExportPanel } from "@/components/instant/language-export-panel";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { LANGUAGE_EXPORT_POLL_INTERVAL_MS } from "@/lib/language-export-playback";
import { sceneTextsSummary } from "@/lib/story-language-export";
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
  onRerenderOriginalTexts?: () => void;
  textRerenderBusy?: boolean;
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
  const pace = toDraftDuration(scene.transitionDurationSeconds ?? scene.durationSeconds);
  return {
    ...emptySceneTextDraft(pace),
    template: scene.template ?? "auto",
    transitionDurationSeconds: pace,
    durationSeconds: pace,
    heroText: scene.heroText ?? "",
    title: scene.title ?? "",
    subtitle: scene.subtitle ?? "",
    accentWords: Array.isArray(scene.accentWords) ? scene.accentWords.join(", ") : "",
    lines: Array.isArray(scene.lines) ? scene.lines.map(String) : [],
    heroFinale: scene.heroFinale !== false,
    heroFinaleText: scene.heroFinaleText ?? "",
  };
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
  badge,
  status,
  videoUrl,
  summary,
  downloadHref,
  errorMessage,
  showVideoPlayer = true,
  children,
}: {
  title: string;
  badge?: string;
  status?: string;
  videoUrl?: string | null;
  summary?: string;
  downloadHref?: string;
  errorMessage?: string | null;
  showVideoPlayer?: boolean;
  children?: React.ReactNode;
}) {
  const showVideo = showVideoPlayer !== false;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          {badge ?
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {badge}
            </p>
          : null}
          {status ?
            <p className="mt-1 text-xs text-zinc-600">{status}</p>
          : null}
          {summary ?
            <p className="mt-1 text-xs text-zinc-500">{summary}</p>
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
  onRerenderOriginalTexts,
  textRerenderBusy = false,
}: Props) {
  const t = useActiveTranslator();
  const [createOpen, setCreateOpen] = useState(false);
  const [targetLang, setTargetLang] = useState<LanguageExportCode>("nl");
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>([]);
  const [editExportId, setEditExportId] = useState<string | null>(null);
  const [draftExportId, setDraftExportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const originalSummary = useMemo(() => {
    const texts = parseSceneTextsJson(instantSceneTexts);
    return sceneTextsSummary(texts);
  }, [instantSceneTexts]);

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
      setDraftExportId(json.exportId?.trim() || null);
      setEditExportId(null);
      setInfo(
        (json as { translationFailed?: boolean }).translationFailed && json.message ?
          json.message
        : t("instant.videoVersions.autoTranslateNote")
      );
      setCreateOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("instant.languageExport.prepareFailed"));
    } finally {
      setBusy(false);
    }
  };

  const renderLanguageVersion = async (lang: LanguageExportCode, texts: InstantSceneTextDraft[]) => {
    setBusy(true);
    setError("");
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
        sceneTexts: texts.map((scene, index) => ({
              template: scene.template,
              heroText: scene.heroText.trim() || undefined,
              title: scene.title.trim() || undefined,
              subtitle: scene.subtitle.trim() || undefined,
              accentWords: scene.accentWords
                .split(",")
                .map((w) => w.trim())
                .filter(Boolean),
              lines: scene.lines.map((l) => l.trim()).filter(Boolean),
              heroFinale: scene.template === "sequence" ? scene.heroFinale : undefined,
              heroFinaleText:
                scene.template === "sequence" && scene.heroFinaleText.trim() ?
                  scene.heroFinaleText.trim()
                : undefined,
              ...(index < texts.length - 1 ?
                {
                  transitionDurationSeconds: scene.transitionDurationSeconds,
                  durationSeconds: scene.durationSeconds,
                }
              : {}),
            })),
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("instant.languageExport.renderFailed"));
    } finally {
      setBusy(false);
    }
  };

  const rerenderExport = async (exportId: string) => {
    setBusy(true);
    setError("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("instant.videoVersions.errorRerender"));
    } finally {
      setBusy(false);
    }
  };

  if (!finalVideoUrl && !cleanVideoUrl) {
    return null;
  }

  const isDetailLayout = layout === "detail";
  const originalTitle =
    isDetailLayout ? t("projectDetail.versions.originalTitle") : t("instant.videoVersions.originalTitle");
  const cleanTitle =
    isDetailLayout ? t("projectDetail.versions.cleanTitle") : t("instant.videoVersions.cleanTitle");

  const originalCard = (
    <VideoCard
      title={originalTitle}
      badge={isDetailLayout ? undefined : t("instant.videoVersions.overlayBadge")}
      videoUrl={finalVideoUrl}
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
          {onRerenderOriginalTexts && usesStoryOverlay ?
            <button
              type="button"
              disabled={busy || hasActiveRender || textRerenderBusy}
              onClick={onRerenderOriginalTexts}
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
      badge={isDetailLayout ? undefined : t("instant.videoVersions.cleanBadge")}
      videoUrl={cleanVideoUrl}
      summary={isDetailLayout ? t("projectDetail.versions.cleanDesc") : undefined}
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

  const languageCards = languageExports.map((row) => (
        <VideoCard
          key={row.id}
          title={row.languageLabel}
          badge={t("instant.videoVersions.overlayBadge")}
          status={statusLabel(row.status, t)}
          videoUrl={row.status === "completed" ? row.outputVideoUrl : null}
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
                href={animationProjectDownloadUrl(projectId, { languageCode: row.languageCode })}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                {t("instant.videoVersions.download")}
              </a>
              {usesStoryOverlay ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditExportId(row.id);
                    setTargetLang(row.languageCode as LanguageExportCode);
                    const parsed = parseSceneTextsJson(row.sceneTextsJson ?? instantSceneTexts);
                    setSceneTexts(parsed.map(sceneToDraft));
                    setCreateOpen(true);
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800"
                >
                  {t("instant.videoVersions.editTexts")}
                </button>
              : null}
            </>
          : null}
          {row.status === "draft" && usesStoryOverlay ?
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditExportId(null);
                setDraftExportId(row.id);
                setTargetLang(row.languageCode as LanguageExportCode);
                const parsed = parseSceneTextsJson(row.sceneTextsJson ?? instantSceneTexts);
                setSceneTexts(parsed.map(sceneToDraft));
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
              {t("instant.textRerender.cta")}
            </button>
          )}
        </VideoCard>
      ));

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
            {createLanguageBlock}
          </div>
        </>
      : <>
          {cleanCard}
          {originalCard}
          {languageCards}
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
          <StoryboardEditor
            images={images}
            imageCount={Math.max(images.length, sceneTexts.length)}
            sceneTexts={sceneTexts}
            expandedIndex={0}
            onExpandedIndexChange={() => undefined}
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
                          sceneTexts: sceneTexts.map((scene, index) => ({
                            template: scene.template,
                            heroText: scene.heroText.trim() || undefined,
                            title: scene.title.trim() || undefined,
                            subtitle: scene.subtitle.trim() || undefined,
                            lines: scene.lines.filter((l) => l.trim()),
                            heroFinaleText: scene.heroFinaleText.trim() || undefined,
                            ...(index < sceneTexts.length - 1 ?
                              { transitionDurationSeconds: scene.transitionDurationSeconds }
                            : {}),
                          })),
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
              {t("instant.textRerender.cta")}
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
    </section>
  );
}
