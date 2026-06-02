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
  children,
}: {
  title: string;
  badge?: string;
  status?: string;
  videoUrl?: string | null;
  summary?: string;
  downloadHref?: string;
  errorMessage?: string | null;
  children?: React.ReactNode;
}) {
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
      {videoUrl ?
        <video
          src={videoUrl}
          controls
          playsInline
          className="mt-3 w-full rounded-xl bg-black/5"
        />
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
}: Props) {
  const t = useActiveTranslator();
  const [createOpen, setCreateOpen] = useState(false);
  const [targetLang, setTargetLang] = useState<LanguageExportCode>("nl");
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>([]);
  const [editExportId, setEditExportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const originalSummary = useMemo(() => {
    const texts = parseSceneTextsJson(instantSceneTexts);
    return sceneTextsSummary(texts);
  }, [instantSceneTexts]);

  const refreshExports = useCallback(async () => {
    const res = await fetch(
      `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
      { credentials: "include" }
    );
    const json = (await res.json().catch(() => null)) as {
      exports?: VideoLanguageExportSummary[];
    } | null;
    if (json?.exports) {
      onLanguageExportsChange(json.exports);
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
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prepare", languageCode: lang }),
        }
      );
      const json = (await res.json()) as {
        ok?: boolean;
        sceneTexts?: unknown;
        message?: string | null;
      };
      if (!json.ok) {
        throw new Error((json as { message?: string }).message ?? t("instant.languageExport.prepareFailed"));
      }
      const parsed = parseSceneTextsJson(json.sceneTexts ?? instantSceneTexts);
      setSceneTexts(parsed.map(sceneToDraft));
      if (json.message) {
        setInfo(json.message);
      }
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
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "render",
            languageCode: lang,
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
          }),
        }
      );
      const json = (await res.json()) as { ok?: boolean; message?: string; exports?: VideoLanguageExportSummary[] };
      if (!json.ok) {
        throw new Error(json.message ?? t("instant.languageExport.renderFailed"));
      }
      if (json.exports) {
        onLanguageExportsChange(json.exports);
      } else {
        await refreshExports();
      }
      setCreateOpen(false);
      setEditExportId(null);
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
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rerender", exportId }),
        }
      );
      const json = (await res.json()) as { ok?: boolean; message?: string; exports?: VideoLanguageExportSummary[] };
      if (!json.ok) {
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

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("instant.videoVersions.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("instant.videoVersions.subtitle")}</p>
        <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
          {t("instant.videoVersions.noCreditsNote")}
        </p>
      </div>

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

      <VideoCard
        title={t("instant.videoVersions.cleanTitle")}
        badge={t("instant.videoVersions.cleanBadge")}
        videoUrl={cleanVideoUrl}
        downloadHref={
          cleanVideoUrl ?
            animationProjectDownloadUrl(projectId, { variant: "clean" })
          : undefined
        }
      >
        {cleanVideoUrl ?
          <a
            href={animationProjectDownloadUrl(projectId, { variant: "clean" })}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            {t("instant.videoVersions.download")}
          </a>
        : (
          <p className="text-xs text-zinc-500">{t("instant.videoVersions.cleanUnavailable")}</p>
        )}
      </VideoCard>

      <VideoCard
        title={t("instant.videoVersions.originalTitle")}
        badge={t("instant.videoVersions.overlayBadge")}
        videoUrl={finalVideoUrl}
        summary={originalSummary || undefined}
        downloadHref={finalVideoUrl ? animationProjectDownloadUrl(projectId) : undefined}
      >
        {finalVideoUrl ?
          <a
            href={animationProjectDownloadUrl(projectId)}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            {t("instant.videoVersions.download")}
          </a>
        : null}
      </VideoCard>

      {languageExports.map((row) => (
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
          {(row.status === "failed" || row.status === "needs_refresh") && (
            <button
              type="button"
              disabled={busy || hasActiveRender}
              onClick={() => void rerenderExport(row.id)}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900 disabled:opacity-50"
            >
              {t("instant.videoVersions.rerender")}
            </button>
          )}
        </VideoCard>
      ))}

      {usesStoryOverlay ?
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            {t("instant.videoVersions.chooseLanguage")}
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as LanguageExportCode)}
              className="rounded-lg border border-zinc-200 px-2 py-1.5"
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
            onClick={() => void initCreateFlow(targetLang)}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("instant.videoVersions.createLanguageVersion")}
          </button>
        </div>
      : (
        <LanguageExportPanel
          projectId={projectId}
          hasCompletedFinal={Boolean(finalVideoUrl)}
          languageExports={languageExports}
          onLanguageExportsChange={onLanguageExportsChange}
        />
      )}

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
                      const res = await fetch(
                        `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`,
                        {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
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
                          }),
                        }
                      );
                      const json = (await res.json()) as { ok?: boolean; message?: string };
                      if (!json.ok) {
                        throw new Error(json.message ?? t("instant.videoVersions.errorSave"));
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
              {t("instant.videoVersions.renderTextOnly")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setEditExportId(null);
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
