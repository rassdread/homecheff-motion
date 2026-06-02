"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InstantRecoveryActionButtons } from "@/components/instant/instant-recovery-action-buttons";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { InstantFinalProgressPanel } from "@/components/instant/instant-final-progress-panel";
import { InstantSegmentProgressList } from "@/components/instant/instant-segment-progress-list";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useInstantPremiumProgressPolling } from "@/hooks/use-instant-premium-progress-polling";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { invalidateCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import { buildPlaybackCacheKey } from "@/lib/playback-url-resolution";
import { brand } from "@/lib/brand";
import { syncActiveAnimationProjects } from "@/lib/sync-active-animation-projects";
import type { InstantPremiumStatusResponse, VideoLanguageExportSummary } from "@/types/animation-api";
import { VideoVersionsPanel } from "@/components/instant/video-versions-panel";

function stageKey(snapshot: InstantPremiumStatusResponse | null): string {
  if (!snapshot) {
    return "instant.progress.preparingProject";
  }
  if (snapshot.phase === "failed") {
    return "instant.progress.failed";
  }
  if (snapshot.phase === "completed" || snapshot.status === "completed") {
    return "instant.progress.completed";
  }
  if (snapshot.phase === "uploading_final") {
    return "instant.progress.uploadingFinal";
  }
  if (snapshot.phase === "merging_clips") {
    return "instant.progress.mergingClips";
  }
  if (snapshot.phase === "generating_clips") {
    if (snapshot.progressPercent < 10) {
      return "instant.progress.preparingImages";
    }
    return "instant.progress.generatingVideo";
  }
  return "instant.progress.preparingProject";
}

function transientBannerKey(message: string | null): string | null {
  if (message === "worker_connecting") {
    return "instant.progress.workerConnecting";
  }
  if (message === "connection_lost") {
    return "instant.progress.reconnecting";
  }
  return null;
}

export default function InstantPremiumProgressPage() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAdmin = session.resolved && session.user?.role === "admin";
  const completionSyncedRef = useRef(false);
  const {
    projectId,
    snapshot,
    setSnapshot,
    connectionState,
    transientMessage,
    showFatalMissing,
    lastPolledAtMs,
    lastProgressChangeAtMs,
  } = useInstantPremiumProgressPolling();

  const [actionError, setActionError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [segmentRetryBusy, setSegmentRetryBusy] = useState<number | null>(null);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const queuedSinceMsRef = useRef<number | null>(null);
  const [waitingForStartTooLong, setWaitingForStartTooLong] = useState(false);

  const [languageExports, setLanguageExports] = useState<VideoLanguageExportSummary[]>([]);
  const [versionMeta, setVersionMeta] = useState<{
    cleanVideoUrl: string | null;
    instantSceneTexts: unknown;
    usesStoryOverlay: boolean;
  } | null>(null);

  const isCompleted = snapshot?.status === "completed" || Boolean(snapshot?.finalVideoUrl);
  const isReconnecting =
    connectionState === "reconnecting" ||
    connectionState === "worker_connecting" ||
    (connectionState === "polling" && !snapshot);
  const effectiveProjectId = projectId || snapshot?.projectId || "";
  const finalPlaybackCacheKey = useMemo(
    () => buildPlaybackCacheKey(snapshot?.finalVideoUrl ?? null),
    [snapshot?.finalVideoUrl]
  );
  const transientBanner = transientBannerKey(transientMessage);

  useEffect(() => {
    if (!isCompleted || !effectiveProjectId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(effectiveProjectId)}/language-exports`,
        { credentials: "include" }
      );
      const json = (await res.json().catch(() => null)) as {
        exports?: VideoLanguageExportSummary[];
        cleanVideoUrl?: string | null;
        instantSceneTexts?: unknown;
        usesStoryOverlay?: boolean;
      } | null;
      if (cancelled || !json) {
        return;
      }
      setLanguageExports(json.exports ?? []);
      setVersionMeta({
        cleanVideoUrl: json.cleanVideoUrl ?? null,
        instantSceneTexts: json.instantSceneTexts,
        usesStoryOverlay: json.usesStoryOverlay ?? false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isCompleted, effectiveProjectId]);

  const headlineKey = useMemo(() => {
    if (showFatalMissing) {
      return "instant.progress.missingProjectParam";
    }
    if (isCompleted) {
      return "instant.progress.completedSuccess";
    }
    if (snapshot?.isRestoringFinalVideo || snapshot?.finalizationStuck) {
      return "instant.recover.restoring";
    }
    if (isReconnecting && !snapshot) {
      return "instant.progress.restoringState";
    }
    if (effectiveProjectId || snapshot) {
      return stageKey(snapshot);
    }
    return "instant.progress.restoringState";
  }, [showFatalMissing, isCompleted, isReconnecting, effectiveProjectId, snapshot]);
  const queuedWithoutJob = snapshot?.queuedWithoutJobCount ?? 0;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const queued = snapshot?.queuedWithoutJobCount ?? 0;
      if (queued > 0) {
        queuedSinceMsRef.current ??= now;
      } else {
        queuedSinceMsRef.current = null;
      }
      const tooLong =
        queuedSinceMsRef.current != null && queued > 0 && now - queuedSinceMsRef.current > 60_000;
      setWaitingForStartTooLong(tooLong);
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => window.clearInterval(timer);
  }, [snapshot?.queuedWithoutJobCount]);

  useEffect(() => {
    if (!effectiveProjectId || snapshot?.status !== "completed" || !snapshot.finalVideoUrl) {
      return;
    }
    if (completionSyncedRef.current) {
      return;
    }
    completionSyncedRef.current = true;
    void syncActiveAnimationProjects();
  }, [effectiveProjectId, snapshot?.finalVideoUrl, snapshot?.status]);

  const runTextRerender = useCallback(async () => {
    if (!effectiveProjectId) {
      return;
    }
    setRebuildBusy(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/instant-premium/projects/${encodeURIComponent(effectiveProjectId)}/rebuild-final-video`,
        { method: "POST", credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
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
        setActionError(
          body.error ?? body.rebuild?.message ?? t("instant.textRerender.failed")
        );
        return;
      }
      if (body.rebuild?.clipsReady === false) {
        setActionError(body.rebuild?.message ?? t("instant.textRerender.segmentsMissing"));
        return;
      }
      if (body.rebuild?.ok) {
        setActionError(null);
      } else {
        setActionError(
          body.rebuild?.message ??
            (body.rebuild?.finalVideoUrlPresent
              ? t("instant.progress.rebuildFinalFailedKeepsPrevious")
              : t("instant.textRerender.failed"))
        );
      }
      if (body.rebuild?.ok && effectiveProjectId) {
        invalidateCachedInstantProgressSnapshot(effectiveProjectId);
      }
      if (body.status) {
        setSnapshot(body.status);
      }
    } finally {
      setRebuildBusy(false);
    }
  }, [effectiveProjectId, setSnapshot, t]);

  const runVideoRepair = useCallback(async () => {
    if (!effectiveProjectId) {
      return;
    }
    setRetryBusy(true);
    setActionError(null);
    try {
      const useMergeRetry =
        snapshot?.canRetryMerge &&
        !snapshot?.canRepairFinalVideo &&
        !snapshot?.canRetryOverlay;
      const res = await fetch(
        useMergeRetry
          ? `/api/instant-premium/projects/${encodeURIComponent(effectiveProjectId)}/merge/retry`
          : `/api/instant-premium/projects/${encodeURIComponent(effectiveProjectId)}/repair-final-video`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? t("instant.videoRepair.failed"));
        return;
      }
      const body = (await res.json()) as {
        status?: InstantPremiumStatusResponse;
      };
      if (body.status) {
        setSnapshot(body.status);
      }
      if (useMergeRetry) {
        invalidateCachedInstantProgressSnapshot(effectiveProjectId);
      }
      setActionError(null);
    } finally {
      setRetryBusy(false);
    }
  }, [effectiveProjectId, setSnapshot, snapshot, t]);

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <AppCard>
          <h1 className="text-2xl font-bold">{t("instant.progress.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t(headlineKey as never)}</p>
          {effectiveProjectId ? (
            <p className="mt-2 text-xs text-zinc-500">{effectiveProjectId}</p>
          ) : null}

          {!showFatalMissing ? (
            <InstantFinalProgressPanel
              className="mt-4"
              snapshot={snapshot}
              lastPolledAtMs={lastPolledAtMs}
              lastProgressChangeAtMs={lastProgressChangeAtMs}
              connectionState={
                connectionState === "completed"
                  ? "completed"
                  : connectionState === "reconnecting" || connectionState === "worker_connecting"
                    ? connectionState
                    : "polling"
              }
              repairBusy={retryBusy}
              rebuildBusy={rebuildBusy}
              isAdmin={isAdmin}
              onRepair={
                effectiveProjectId &&
                (snapshot?.canRepairFinalVideo ||
                  snapshot?.canRetryOverlay ||
                  snapshot?.canRetryMerge ||
                  snapshot?.segmentsMergeFailed)
                  ? () => void runVideoRepair()
                  : undefined
              }
              onTextRerender={
                effectiveProjectId && snapshot?.canRebuildFinalVideo
                  ? () => void runTextRerender()
                  : undefined
              }
              onForceRebuild={isAdmin ? () => void runTextRerender() : undefined}
            />
          ) : null}

          {showFatalMissing ? (
            <p className="mt-4 text-sm text-red-700">{t("instant.progress.missingProjectParam")}</p>
          ) : null}
          {transientBanner && !showFatalMissing ? (
            <p className="mt-3 text-sm text-amber-800">{t(transientBanner as never)}</p>
          ) : null}
          {actionError ? <p className="mt-2 text-sm text-red-700">{actionError}</p> : null}
          {effectiveProjectId && waitingForStartTooLong ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p>{t("instant.progress.waitingToStart")}</p>
              <p className="mt-1 font-mono text-[11px]">
                queuedWithoutJobCount={queuedWithoutJob}
              </p>
              <button
                type="button"
                disabled={startBusy}
                className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 disabled:opacity-60"
                onClick={() => {
                  setStartBusy(true);
                  void (async () => {
                    try {
                      const res = await fetch(
                        `/api/instant-premium/projects/${effectiveProjectId}/segments/start`,
                        { method: "POST", credentials: "include" }
                      );
                      const body = (await res.json().catch(() => ({}))) as {
                        error?: string;
                        status?: InstantPremiumStatusResponse;
                      };
                      if (!res.ok) {
                        setActionError(body.error ?? t("instant.progress.retryFailed"));
                        return;
                      }
                      if (body.status) {
                        setSnapshot(body.status);
                      }
                    } finally {
                      setStartBusy(false);
                    }
                  })();
                }}
              >
                {startBusy ? t("instant.step7.preparing") : t("instant.progress.startQueuedSegments")}
              </button>
            </div>
          ) : null}
          {snapshot?.status === "failed" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {snapshot.overlayFailed ? (
                <p>{t("instant.progress.overlayFailedHelp")}</p>
              ) : null}
              <p className={snapshot.overlayFailed ? "mt-2" : undefined}>
                {snapshot.errorMessage || t("instant.progress.failedHelp")}
              </p>
            </div>
          ) : null}
          {snapshot?.segments?.length && effectiveProjectId ? (
            <InstantSegmentProgressList
              projectId={effectiveProjectId}
              snapshot={snapshot}
              segmentRetryBusy={segmentRetryBusy}
              mergeRetryBusy={retryBusy}
              onRetryMerge={() => {
                setRetryBusy(true);
                setActionError(null);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${effectiveProjectId}/merge/retry`,
                      { method: "POST", credentials: "include" }
                    );
                    if (!res.ok) {
                      const body = (await res.json().catch(() => ({}))) as { error?: string };
                      setActionError(body.error ?? t("instant.progress.retryFailed"));
                      return;
                    }
                    const body = (await res.json()) as InstantPremiumStatusResponse;
                    setSnapshot(body);
                    invalidateCachedInstantProgressSnapshot(effectiveProjectId);
                  } finally {
                    setRetryBusy(false);
                  }
                })();
              }}
              onRetrySegment={(segmentIndex) => {
                setSegmentRetryBusy(segmentIndex);
                setActionError(null);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${effectiveProjectId}/segments/${segmentIndex}/retry`,
                      { method: "POST", credentials: "include" }
                    );
                    const body = (await res.json().catch(() => ({}))) as
                      | InstantPremiumStatusResponse
                      | { error?: string };
                    if (!res.ok) {
                      setActionError(
                        "error" in body && body.error
                          ? body.error
                          : t("instant.progress.retryFailed")
                      );
                      return;
                    }
                    if ("projectId" in body && body.projectId) {
                      setSnapshot(body);
                      invalidateCachedInstantProgressSnapshot(effectiveProjectId);
                    }
                  } finally {
                    setSegmentRetryBusy(null);
                  }
                })();
              }}
            />
          ) : null}
          {isCompleted && snapshot?.finalVideoUrl ? (
            <div className="mt-4">
              <GradientButton href="/videos">{t("animate.button.openSavedProject")}</GradientButton>
              <p className="mt-2 text-xs text-zinc-500">{t("instant.progress.savedToGallery")}</p>
            </div>
          ) : null}
          {snapshot?.finalVideoUrl ? (
            <div className="mt-5">
              <h2 className="text-base font-semibold text-zinc-900">{t("instant.progress.finalVideoTitle")}</h2>
              <video
                key={finalPlaybackCacheKey}
                controls
                playsInline
                preload="metadata"
                className="mt-2 max-h-80 w-full rounded-xl border border-zinc-200 bg-black"
              >
                <source src={snapshot.finalVideoUrl} type="video/mp4" />
              </video>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                <a
                  href={animationProjectDownloadUrl(effectiveProjectId)}
                  download={`homecheff-motion-${effectiveProjectId}.mp4`}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900"
                >
                  {t("instant.progress.download")}
                </a>
                {snapshot.finalDurationSeconds ? (
                  <p className="text-xs text-zinc-500">
                    {t("instant.progress.finalDuration", { seconds: snapshot.finalDurationSeconds })}
                  </p>
                ) : null}
                </div>
                <InstantRecoveryActionButtons
                  snapshot={snapshot}
                  repairBusy={retryBusy}
                  textRerenderBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                  forceRebuildBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                  isAdmin={isAdmin}
                  onVideoRepair={() => void runVideoRepair()}
                  onTextRerender={() => void runTextRerender()}
                  onForceRebuild={isAdmin ? () => void runTextRerender() : undefined}
                  buttonClassName="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
                />
              </div>
            </div>
          ) : null}

          {isCompleted && snapshot?.finalVideoUrl && effectiveProjectId ?
            <VideoVersionsPanel
              projectId={effectiveProjectId}
              cleanVideoUrl={versionMeta?.cleanVideoUrl ?? null}
              finalVideoUrl={snapshot.finalVideoUrl}
              usesStoryOverlay={versionMeta?.usesStoryOverlay ?? false}
              instantSceneTexts={versionMeta?.instantSceneTexts}
              languageExports={languageExports}
              onLanguageExportsChange={setLanguageExports}
            />
          : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/animate/instant" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm">
              {t("instant.success.backToWizard")}
            </Link>
            {effectiveProjectId ? (
              <GradientButton href="/videos">{t("animate.button.openSavedProject")}</GradientButton>
            ) : null}
          </div>
        </AppCard>
      </div>
    </main>
  );
}
