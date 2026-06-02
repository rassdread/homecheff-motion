"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDurationSeconds, getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { InstantFinalProgressPanel } from "@/components/instant/instant-final-progress-panel";
import { VideoVersionsPanel } from "@/components/instant/video-versions-panel";
import { LanguagePlaybackSelector } from "@/components/instant/language-playback-selector";
import {
  buildPlaybackDownloadLanguageParam,
  filterCompletedLanguageExportsForPlayback,
  resolveActivePlaybackState,
} from "@/lib/language-export-playback";
import {
  isPublicDebugUiEnabled,
  shouldShowLanguageExportAdminDebug,
} from "@/lib/debug-ui";
import type { VideoLanguageExportSummary } from "@/types/animation-api";
import { PlaybackDebugPanel } from "@/components/instant/playback-debug-panel";
import { invalidateCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import { buildPlaybackCacheKey, pickPlaybackUrl } from "@/lib/playback-url-resolution";
import { resolveProjectDisplayStatus } from "@/lib/project-display-status";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { getActiveLocale, t } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useInstantPremiumStatusPolling } from "@/hooks/use-instant-premium-status-polling";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";
import { EXPORT_CANCELLED_BY_USER_MESSAGE } from "@/lib/animation-export-messages";
import { exportRecordIsCancellable } from "@/lib/animation-export-cancellable";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { projectUsesStoryOverlay } from "@/lib/story-language-export";
import { hcExportRetryLog } from "@/lib/hc-export-retry-debug";
import { postProjectExportRetry } from "@/lib/post-project-export-retry";

function presetTitleKey(presetId: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    basic: "animate.preset.basic.title",
    standard: "animate.preset.standard.title",
    pro: "animate.preset.pro.title",
    smooth: "animate.preset.smooth.title",
  };
  return map[presetId] ?? "animate.preset.standard.title";
}

function intentLabelKey(intent: string | null | undefined): TranslationKey | null {
  if (!intent) {
    return null;
  }
  const allowed = ["morph", "cinematic", "product", "dynamic"] as const;
  if (!(allowed as readonly string[]).includes(intent)) {
    return null;
  }
  return `animate.intent.${intent}` as TranslationKey;
}

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
    case "completed":
      return "videos.status.completed";
    case "generating":
      return "videos.status.generating";
    case "rendering":
      return "videos.status.rendering";
    case "failed":
      return "videos.status.failed";
    default:
      return "videos.status.queued";
  }
}

export default function VideoDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoExportCancel, setShowVideoExportCancel] = useState(false);
  const [exportCancelBusy, setExportCancelBusy] = useState(false);
  const [exportCancelFeedback, setExportCancelFeedback] = useState<string | null>(null);
  const [deleteProjectBusy, setDeleteProjectBusy] = useState(false);
  const [deleteProjectError, setDeleteProjectError] = useState<string | null>(null);
  const [finalVideoPlaybackError, setFinalVideoPlaybackError] = useState(false);
  const [retryExportBusy, setRetryExportBusy] = useState(false);
  const [retryExportError, setRetryExportError] = useState<string | null>(null);
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoverInfo, setRecoverInfo] = useState<string | null>(null);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildInfo, setRebuildInfo] = useState<string | null>(null);
  const [languageAdminDebugOpen, setLanguageAdminDebugOpen] = useState(false);
  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const json: unknown = await res.json().catch(() => null);
      if (res.status === 401) {
        setError(t("errors.authRequired"));
        setDetail(null);
        return;
      }
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        setError(msg);
        setDetail(null);
        return;
      }
      setDetail(json as AnimationProjectDetailResponse);
    } catch {
      setError(t("videos.error"));
      setDetail(null);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [id]);

  const updateLanguageExports = useCallback((exports: VideoLanguageExportSummary[]) => {
    setDetail((prev) => (prev ? { ...prev, languageExports: exports } : prev));
  }, []);

  const setPlaybackLanguage = useCallback(
    (languageCode: string) => {
      if (!id) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (languageCode === "original") {
        params.delete("lang");
      } else {
        params.set("lang", languageCode);
      }
      const qs = params.toString();
      router.replace(`/videos/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [id, router, searchParams]
  );

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void load();
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session.resolved, session.user, load]);

  useEffect(() => {
    const ex = detail?.exports?.[0];
    if (!detail || detail.status !== "rendering" || !exportRecordIsCancellable(ex)) {
      const resetId = window.setTimeout(() => setShowVideoExportCancel(false), 0);
      return () => window.clearTimeout(resetId);
    }
    const timer = window.setTimeout(() => setShowVideoExportCancel(true), 30_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [detail]);

  const finalVideoUrl = useMemo(() => {
    if (!detail?.exports?.length) {
      return null;
    }
    const withUrl = detail.exports.find((e) => e.outputVideoUrl?.trim());
    const url = withUrl?.outputVideoUrl?.trim() ?? null;
    if (!url) {
      return null;
    }
    if (detail.status === "completed" || withUrl?.status === "completed") {
      return url;
    }
    return null;
  }, [detail]);

  useEffect(() => {
    const timer = window.setTimeout(() => setFinalVideoPlaybackError(false), 0);
    return () => window.clearTimeout(timer);
  }, [finalVideoUrl]);

  const latestExport = detail?.exports?.[0] ?? null;
  const instantLikeProject = Boolean(
    detail &&
      (detail.projectType === "instant_premium" ||
        detail.stylePreset === "food_promo" ||
        detail.stylePreset === "clean_business" ||
        detail.stylePreset === "social_boost" ||
        detail.instantOutputDurationSeconds != null ||
        detail.instantSelectedChips != null ||
        (detail.instantUserIntent?.trim().length ?? 0) > 0)
  );

  const allFragmentsDone = useMemo(() => {
    if (!detail?.transitions.length) {
      return false;
    }
    return detail.transitions.every(
      (tr) => tr.status === "completed" && Boolean(tr.outputVideoUrl?.trim())
    );
  }, [detail]);

  const mergeExportStuckWithoutFinal = Boolean(
    latestExport &&
      !latestExport.outputVideoUrl?.trim() &&
      latestExport.status.toLowerCase() !== "completed"
  );

  const canRetryMergeExport = Boolean(
    detail &&
      !instantLikeProject &&
      allFragmentsDone &&
      ((detail.status === "failed" && latestExport?.status === "failed") ||
        (detail.status === "completed" && !finalVideoUrl) ||
        (detail.status === "rendering" &&
          (!latestExport || mergeExportStuckWithoutFinal)))
  );
  const canRecoverInstant = Boolean(
    detail && instantLikeProject && allFragmentsDone && !finalVideoUrl
  );
  const canRebuildInstant = Boolean(detail && instantLikeProject && allFragmentsDone);

  const showInstantProgress = Boolean(
    id &&
      detail &&
      instantLikeProject &&
      (detail.status === "rendering" ||
        detail.status === "generating" ||
        rebuildBusy ||
        recoverBusy ||
        (allFragmentsDone &&
          (!finalVideoUrl || latestExport?.status === "rendering")))
  );

  const {
    snapshot: instantSnapshot,
    setSnapshot: setInstantSnapshot,
    lastPolledAtMs: instantLastPolledAtMs,
    lastProgressChangeAtMs: instantLastProgressChangeAtMs,
    touchProgressClock,
  } = useInstantPremiumStatusPolling(id, showInstantProgress);

  const isAdmin = session.resolved && session.user?.role === "admin";

  const originalPlaybackUrl = useMemo(() => {
    const picked = pickPlaybackUrl({
      detailExportUrl: finalVideoUrl,
      statusSnapshotUrl: instantSnapshot?.finalVideoUrl,
      previousFinalVideoUrl: detail?.instantPreviousFinalVideoUrl,
    });
    return picked.url;
  }, [
    finalVideoUrl,
    instantSnapshot?.finalVideoUrl,
    detail?.instantPreviousFinalVideoUrl,
  ]);

  const languageExports = useMemo(
    () => detail?.languageExports ?? [],
    [detail?.languageExports]
  );

  const langFromUrl = searchParams.get("lang");

  const playbackState = useMemo(
    () =>
      resolveActivePlaybackState({
        langFromUrl,
        originalFinalUrl: originalPlaybackUrl,
        languageExports,
      }),
    [langFromUrl, originalPlaybackUrl, languageExports]
  );

  const activeFinalVideoUrl =
    playbackState.activePlaybackUrl ?? originalPlaybackUrl;

  const playbackCacheKey = buildPlaybackCacheKey(
    activeFinalVideoUrl ?? originalPlaybackUrl
  );

  const playbackDownload = useMemo(
    () => buildPlaybackDownloadLanguageParam(playbackState.selectedLanguageCode),
    [playbackState.selectedLanguageCode]
  );

  const hasCompletedLanguageVersions = useMemo(
    () => filterCompletedLanguageExportsForPlayback(languageExports).length > 0,
    [languageExports]
  );

  const showLanguageAdminDebug = shouldShowLanguageExportAdminDebug(
    isAdmin,
    languageAdminDebugOpen
  );

  const showPlaybackDebugPanel = isPublicDebugUiEnabled() || (isAdmin && languageAdminDebugOpen);

  const hasCompletedInstantFinal = Boolean(
    originalPlaybackUrl &&
      (detail?.status === "completed" ||
        detail?.exports?.some((e) => e.status === "completed" && e.outputVideoUrl?.trim()))
  );

  const mergeStuckRetryOnly = Boolean(
    canRetryMergeExport && detail?.status === "rendering" && latestExport?.status !== "failed"
  );

  const retryExportMerge = useCallback(async () => {
    if (!id) {
      return;
    }
    hcExportRetryLog("client", "export_retry.button_clicked", { projectId: id });
    setRetryExportBusy(true);
    setRetryExportError(null);
    try {
      const { response, body } = await postProjectExportRetry(id);
      if (!response.ok && !body.project) {
        setRetryExportError(body.error ?? t("errors.exportStartFailed"));
        return;
      }
      if (body.error && !body.project) {
        setRetryExportError(body.error);
        return;
      }
      if (body.error) {
        setRetryExportError(body.error);
      }
      await load();
    } catch (e) {
      hcExportRetryLog("client", "export_retry.throw", {
        projectId: id,
        message: e instanceof Error ? e.message : String(e),
      });
      setRetryExportError(t("errors.exportStartFailed"));
    } finally {
      setRetryExportBusy(false);
    }
  }, [id, load]);

  const recoverFinalVideo = useCallback(async () => {
    if (!id) return;
    touchProgressClock();
    setRecoverBusy(true);
    setRecoverError(null);
    setRecoverInfo(null);
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(id)}/repair-final-video`,
        { method: "POST", credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        repair?: {
          clipsReady?: boolean;
          mergeCompleted?: boolean;
          finalVideoUrlPresent?: boolean;
          message?: string;
        };
      };
      if (!res.ok) {
        setRecoverError(body.error ?? body.repair?.message ?? t("instant.recover.failed"));
        return;
      }
      if (body.repair?.clipsReady === false) {
        setRecoverError(body.repair?.message ?? t("instant.recover.failed"));
        return;
      }
      if (body.repair?.mergeCompleted && body.repair?.finalVideoUrlPresent) {
        setRecoverInfo(t("videos.status.completed"));
      } else {
        setRecoverInfo(t("instant.recover.restoring"));
      }
      await load();
    } finally {
      setRecoverBusy(false);
    }
  }, [id, load, touchProgressClock]);

  const rebuildFinalVideo = useCallback(async () => {
    if (!id) {
      return;
    }
    touchProgressClock();
    setRebuildBusy(true);
    setRebuildError(null);
    setRebuildInfo(null);
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(id)}/rebuild-final-video`,
        { method: "POST", credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        rebuild?: {
          ok?: boolean;
          clipsReady?: boolean;
          message?: string;
          suggestRepair?: boolean;
          finalVideoUrlPresent?: boolean;
        };
        status?: InstantPremiumStatusResponse;
      };
      if (!res.ok) {
        setRebuildError(body.error ?? body.rebuild?.message ?? t("instant.progress.rebuildFinalFailed"));
        return;
      }
      if (body.rebuild?.clipsReady === false || body.code === "REBUILD_SEGMENTS_MISSING") {
        setRebuildError(
          body.rebuild?.message ??
            (body.rebuild?.suggestRepair
              ? t("instant.progress.rebuildSegmentsMissing")
              : t("instant.progress.rebuildFinalFailed"))
        );
        return;
      }
      if (body.code === "STALE_PLAYBACK_URL") {
        setRebuildError(body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildFinalFailed"));
        return;
      }
      if (body.code === "REBUILD_FAILED_TIMEOUT") {
        setRebuildError(
          body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildFailedTimeout")
        );
        return;
      }
      if (body.code === "STALE_REBUILD_OUTPUT") {
        setRebuildError(body.rebuild?.message ?? body.error ?? t("instant.progress.rebuildStaleOutput"));
        return;
      }
      if (body.rebuild?.ok) {
        setRebuildInfo(t("instant.progress.rebuildFinalSuccess"));
      } else if (body.rebuild?.finalVideoUrlPresent) {
        setRebuildError(
          body.rebuild?.message ?? t("instant.progress.rebuildFinalFailedKeepsPrevious")
        );
      } else {
        setRebuildError(body.rebuild?.message ?? t("instant.progress.rebuildFinalFailed"));
      }
      invalidateCachedInstantProgressSnapshot(id);
      await load();
      if (body.status) {
        setInstantSnapshot(body.status);
      }
    } finally {
      setRebuildBusy(false);
    }
  }, [id, load, setInstantSnapshot, touchProgressClock]);

  useEffect(() => {
    if (!instantSnapshot?.finalVideoUrl) {
      return;
    }
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [instantSnapshot?.finalVideoUrl, load]);

  const [fragmentsSectionOpen, setFragmentsSectionOpen] = useState(false);
  const fragmentsAutoOpenedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!detail) {
      return;
    }
    const hasClip = detail.transitions.some((tr) => Boolean(tr.outputVideoUrl?.trim()));
    const key = `${detail.id}:${hasClip}`;
    if (!hasClip || fragmentsAutoOpenedKeyRef.current === key) {
      return;
    }
    fragmentsAutoOpenedKeyRef.current = key;
    setFragmentsSectionOpen(true);
  }, [detail]);

  const durationLabel = useMemo(() => {
    if (!detail) {
      return "—";
    }
    const rawPreset = detail.presetId ?? "";
    const presetId: AnimationPresetId = validateAnimationPresetId(rawPreset) ? rawPreset : "standard";
    const preset = getAnimationPreset(presetId);
    const per =
      detail.advancedSettingsEnabled &&
      detail.viduDurationSeconds != null &&
      detail.viduDurationSeconds > 0
        ? detail.viduDurationSeconds
        : preset.durationSeconds;
    const sec = getTotalVideoDurationSeconds(detail.images.length, per);
    const locale = getActiveLocale() === "nl" ? "nl" : "en";
    return formatDurationSeconds(sec, locale);
  }, [detail]);

  if (!session.resolved) {
    return (
      <main className="mx-auto min-h-[40vh] w-full max-w-3xl px-6 py-10 sm:px-10">
        <div className="h-8 max-w-md animate-pulse rounded-lg bg-zinc-100" aria-hidden />
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <p className="text-sm text-zinc-600">{t("errors.authRequired")}</p>
        <Link href="/login" prefetch={false} className="mt-4 inline-block text-sm font-medium text-emerald-800 underline">
          {t("nav.login")}
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        <p className="text-sm text-zinc-500">{t("videos.processing")}</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        <p className="text-sm text-red-700">
          {t("videos.error")}: {error ?? "—"}
        </p>
        <Link href="/videos" prefetch={false} className="mt-6 inline-block text-sm font-medium text-zinc-800 underline">
          {t("videos.title")}
        </Link>
      </main>
    );
  }

  const intentKey = intentLabelKey(detail.intent);
  const thumb = detail.images[0]?.previewUrl?.trim() || null;
  const userCancelledExport =
    latestExport?.status === "failed" &&
    latestExport?.errorMessage?.trim() === EXPORT_CANCELLED_BY_USER_MESSAGE;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/videos" prefetch={false} className="text-sm font-medium text-emerald-800 hover:underline">
          {t("videos.title")}
        </Link>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">
          {t(
            statusLabelKey(
              resolveProjectDisplayStatus({
                projectStatus: detail.status,
                exportStatus: latestExport?.status,
                outputVideoUrl: originalPlaybackUrl ?? finalVideoUrl,
              })
            )
          )}
        </span>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">{t("videos.finalVideo")}</h1>

      {showInstantProgress ? (
        <InstantFinalProgressPanel
          className="mt-4"
          snapshot={instantSnapshot}
          lastPolledAtMs={instantLastPolledAtMs}
          lastProgressChangeAtMs={instantLastProgressChangeAtMs}
          connectionState="polling"
          repairBusy={recoverBusy}
          rebuildBusy={rebuildBusy}
          isAdmin={isAdmin}
          onRepair={canRecoverInstant ? () => void recoverFinalVideo() : undefined}
          onRebuild={canRebuildInstant ? () => void rebuildFinalVideo() : undefined}
        />
      ) : null}

      {detail.ownerEmail ? (
        <p className="mt-2 text-sm text-zinc-600">
          {t("videos.owner")}: <span className="font-medium text-zinc-800">{detail.ownerEmail}</span>
        </p>
      ) : null}

      {originalPlaybackUrl ? (
        <div className="mt-4 space-y-3">
          <video
            key={playbackCacheKey}
            className="w-full max-h-[70vh] rounded-xl bg-black"
            controls
            playsInline
            preload="none"
            poster={thumb ?? undefined}
            onError={() => setFinalVideoPlaybackError(true)}
            onLoadedData={() => setFinalVideoPlaybackError(false)}
          >
            <source
              src={activeFinalVideoUrl ?? originalPlaybackUrl ?? undefined}
              type="video/mp4"
            />
          </video>
          {finalVideoPlaybackError ? (
            <p className="text-sm text-red-700">{t("videos.playbackError")}</p>
          ) : null}
          {hasCompletedLanguageVersions ? (
            <LanguagePlaybackSelector
              originalPlaybackUrl={originalPlaybackUrl}
              languageExports={languageExports}
              playbackState={playbackState}
              onSelectedLanguageChange={setPlaybackLanguage}
              showAdminDebug={showLanguageAdminDebug}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <a
              href={animationProjectDownloadUrl(id, {
                languageCode: playbackDownload.languageCode,
              })}
              download={`homecheff-motion-${id}${playbackDownload.filenameSuffix}.mp4`}
              className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
            >
              {t("videos.download")}
            </a>
            <a
              href={activeFinalVideoUrl ?? originalPlaybackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t("videos.open")}
            </a>
            {canRebuildInstant ? (
              <button
                type="button"
                disabled={rebuildBusy}
                onClick={() => void rebuildFinalVideo()}
                className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-60"
              >
                {rebuildBusy ? t("instant.progress.rebuildingFinal") : t("instant.progress.rebuildFinalVideo")}
              </button>
            ) : null}
          </div>
          {instantLikeProject && hasCompletedInstantFinal ? (
            <VideoVersionsPanel
              projectId={id}
              cleanVideoUrl={detail?.instantCleanFinalVideoUrl?.trim() || null}
              finalVideoUrl={activeFinalVideoUrl ?? originalPlaybackUrl}
              usesStoryOverlay={
                detail ?
                  projectUsesStoryOverlay({
                    instantMode: detail.instantMode ?? "transition",
                    instantSceneTexts: detail.instantSceneTexts,
                  })
                : false
              }
              instantSceneTexts={detail?.instantSceneTexts}
              images={(detail?.images ?? []).map((img) => ({
                id: img.id,
                previewUrl: img.previewUrl ?? "",
              }))}
              languageExports={languageExports}
              onLanguageExportsChange={updateLanguageExports}
            />
          ) : null}
          {rebuildInfo ? <p className="text-sm text-emerald-800">{rebuildInfo}</p> : null}
          {rebuildError ? <p className="text-sm text-red-700">{rebuildError}</p> : null}
          {showPlaybackDebugPanel ? (
            <PlaybackDebugPanel projectId={id} detailPlayback={detail?.playback} />
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {!showInstantProgress ? (
            <p className="text-sm text-zinc-600">{t("videos.processing")}</p>
          ) : null}
          {detail.status === "rendering" && showVideoExportCancel ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <button
                type="button"
                disabled={exportCancelBusy}
                onClick={() => {
                  if (!window.confirm(t("animate.export.cancelConfirm"))) {
                    return;
                  }
                  setExportCancelFeedback(null);
                  void (async () => {
                    setExportCancelBusy(true);
                    try {
                      const res = await fetch(
                        `/api/animations/projects/${encodeURIComponent(id)}/export/cancel`,
                        { method: "POST", credentials: "include" }
                      );
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: string;
                      };
                      if (!res.ok) {
                        setExportCancelFeedback(data.error ?? t("animate.export.cancelFailed"));
                        return;
                      }
                      await load();
                    } finally {
                      setExportCancelBusy(false);
                    }
                  })();
                }}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportCancelBusy ? t("animate.retry.busy") : t("animate.export.cancel")}
              </button>
              {exportCancelFeedback ? (
                <p className="mt-2 text-xs text-red-700">{exportCancelFeedback}</p>
              ) : null}
            </div>
          ) : null}
          {canRecoverInstant ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-950">{t("instant.recover.notCompleted")}</p>
              <button
                type="button"
                disabled={recoverBusy}
                onClick={() => void recoverFinalVideo()}
                className="mt-3 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60"
              >
                {recoverBusy ? t("instant.recover.restoring") : t("instant.recover.cta")}
              </button>
              {recoverInfo ? <p className="mt-2 text-xs text-zinc-700">{recoverInfo}</p> : null}
              {recoverError ? <p className="mt-2 text-xs text-red-700">{recoverError}</p> : null}
            </div>
          ) : null}
        </div>
      )}

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("projectDetail.meta.createdAt")}</h2>
        <p className="text-sm text-zinc-800">
          <ClientFormattedDateTime iso={detail.createdAt} />
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t("videos.preset")}</dt>
          <dd className="text-right font-medium text-zinc-900">{t(presetTitleKey(detail.presetId ?? "standard"))}</dd>
          {intentKey ? (
            <>
              <dt className="text-zinc-500">{t("videos.intent")}</dt>
              <dd className="text-right font-medium text-zinc-900">{t(intentKey)}</dd>
            </>
          ) : null}
          <dt className="text-zinc-500">{t("videos.duration")}</dt>
          <dd className="text-right font-medium text-zinc-900">{durationLabel}</dd>
          <dt className="text-zinc-500">{t("videos.credits")}</dt>
          <dd className="text-right font-medium text-zinc-900">
            {detail.estimatedCredits != null ? String(detail.estimatedCredits) : "—"}
          </dd>
        </dl>
        {detail.userPrompt?.trim() ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("animate.prompt.label")}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{detail.userPrompt.trim()}</p>
          </div>
        ) : null}
      </section>

      {(canRetryMergeExport ||
        Boolean(latestExport && (latestExport.status === "failed" || latestExport.errorMessage?.trim()))) ? (
        <section
          className={`mt-8 rounded-lg border px-4 py-3 text-sm ${
            mergeStuckRetryOnly || userCancelledExport
              ? "border-amber-200 bg-amber-50/90 text-amber-950"
              : "border-red-100 bg-red-50/80 text-red-900"
          }`}
        >
          <p className="font-medium">{t("projectDetail.export.title")}</p>
          {mergeStuckRetryOnly ? (
            <p className="mt-1">{t("videos.exportMergeStuckTitle")}</p>
          ) : (
            <p className="mt-1">
              {userCancelledExport ? t("animate.export.cancelled") : t("videos.status.failed")}
            </p>
          )}
          {!mergeStuckRetryOnly && !userCancelledExport && latestExport?.errorMessage?.trim() ? (
            <p className="mt-2 font-mono text-xs text-red-800/90">{latestExport.errorMessage.trim()}</p>
          ) : null}
          {canRetryMergeExport ? (
            <>
              <p className="mt-2 text-xs leading-relaxed opacity-90">{t("videos.mergeRetryHint")}</p>
              <button
                type="button"
                disabled={retryExportBusy}
                onClick={() => void retryExportMerge()}
                className="mt-3 inline-flex rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryExportBusy ? t("animate.retry.busy") : t("animate.export.retryMerge")}
              </button>
              {retryExportError ? <p className="mt-2 text-xs text-red-800">{retryExportError}</p> : null}
            </>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">{t("projectDetail.images.title")}</h2>
        {detail.images.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">{t("projectDetail.images.empty")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                {img.previewUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.previewUrl.trim()}
                    alt={img.fileName}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-zinc-400">
                    {img.fileName}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        className="mt-10 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4"
        open={fragmentsSectionOpen}
        onToggle={(e) => setFragmentsSectionOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{t("videos.fragments")}</summary>
        <p className="mt-2 text-xs text-zinc-600">{t("videos.fragmentsSafariHint")}</p>
        <ul className="mt-4 space-y-4">
          {detail.transitions.length === 0 ? (
            <li className="text-sm text-zinc-600">{t("projectDetail.transitions.empty")}</li>
          ) : (
            detail.transitions.map((tr) => {
              const clipUrl = tr.outputVideoUrl?.trim() ?? "";
              return (
                <li key={tr.id} className="rounded-lg border border-zinc-100 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-zinc-800">
                      #{tr.order + 1} · {t(statusLabelKey(tr.status))}
                    </span>
                    <span className="tabular-nums text-zinc-500">{tr.progress}%</span>
                  </div>
                  {clipUrl ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={clipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                        >
                          {t("videos.open")}
                        </a>
                        <a
                          href={animationProjectDownloadUrl(id, { segmentOrder: tr.order })}
                          download={`homecheff-motion-${id}-segment-${tr.order + 1}.mp4`}
                          className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                        >
                          {t("videos.download")}
                        </a>
                      </div>
                      <video
                        className="w-full max-w-md rounded-md bg-black"
                        controls
                        playsInline
                        preload="metadata"
                      >
                        <source src={clipUrl} type="video/mp4" />
                      </video>
                    </div>
                  ) : null}
                  {tr.errorMessage?.trim() ? (
                    <p className="mt-2 text-xs text-red-700">{tr.errorMessage.trim()}</p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </details>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/animate"
          prefetch={false}
          className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
        >
          {t("videos.createNew")}
        </Link>
        <button
          type="button"
          disabled={deleteProjectBusy}
          onClick={() => {
            if (!window.confirm(t("videos.deleteProjectConfirm"))) {
              return;
            }
            setDeleteProjectError(null);
            void (async () => {
              setDeleteProjectBusy(true);
              try {
                const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
                  method: "DELETE",
                  credentials: "include",
                });
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                if (!res.ok) {
                  setDeleteProjectError(data.error ?? t("videos.deleteProjectFailed"));
                  return;
                }
                router.push("/videos");
                router.refresh();
              } finally {
                setDeleteProjectBusy(false);
              }
            })();
          }}
          className="inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleteProjectBusy ? t("animate.retry.busy") : t("videos.deleteProject")}
        </button>
      </div>
      {deleteProjectError ? (
        <p className="mt-3 text-sm text-red-700">{deleteProjectError}</p>
      ) : null}
    </main>
  );
}
