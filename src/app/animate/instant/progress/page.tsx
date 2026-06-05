"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InstantRecoveryActionButtons } from "@/components/instant/instant-recovery-action-buttons";
import { useInstantVideoRepair } from "@/hooks/use-instant-video-repair";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { InstantFinalProgressPanel } from "@/components/instant/instant-final-progress-panel";
import { InstantSegmentProgressList } from "@/components/instant/instant-segment-progress-list";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useInstantPremiumProgressPolling } from "@/hooks/use-instant-premium-progress-polling";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { invalidateCachedInstantProgressSnapshot } from "@/lib/instant-premium-progress-cache";
import {
  MOTION_RENDER_PIPELINE_STEP_I18N,
  resolveMotionRenderPipelineProgress,
} from "@/lib/motion-render-pipeline-progress";
import { buildPlaybackCacheKey } from "@/lib/playback-url-resolution";
import { brand } from "@/lib/brand";
import { syncActiveAnimationProjects } from "@/lib/sync-active-animation-projects";
import type { InstantPremiumStatusResponse, VideoLanguageExportSummary } from "@/types/animation-api";
import { VideoVersionsPanel } from "@/components/instant/video-versions-panel";
import { VideoPreview } from "@/components/ui/video-preview";
import {
  instantExportUserErrorMessage,
  postRebuildFinalVideo,
  type RebuildFinalVideoResponse,
} from "@/lib/instant-export-client";
import { TextRerenderEditorModal } from "@/components/instant/text-rerender-editor-modal";
import { FullRerenderEditorModal } from "@/components/instant/full-rerender-editor-modal";
import { ProjectRerenderChoices } from "@/components/videos/project-rerender-choices";
import { postCopyProjectAsDraft } from "@/lib/copy-project-as-draft-client";
import { runQuickFullRerender } from "@/lib/quick-full-rerender";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";
import { MotionProjectStudioQaPanel } from "@/components/instant/motion/motion-project-studio-qa-panel";
import { fetchStudioIntelligenceStale } from "@/lib/refresh-studio-intelligence-client";

function stageKey(snapshot: InstantPremiumStatusResponse | null): string {
  if (!snapshot) {
    return "instant.progress.preparingProject";
  }
  const pipeline = resolveMotionRenderPipelineProgress({ snapshot });
  if (pipeline.phase === "running" && pipeline.activeStepId) {
    return MOTION_RENDER_PIPELINE_STEP_I18N[pipeline.activeStepId];
  }
  if (pipeline.phase === "failed" && pipeline.failedStepId) {
    return MOTION_RENDER_PIPELINE_STEP_I18N[pipeline.failedStepId];
  }
  if (snapshot.phase === "failed") {
    return "instant.progress.failed";
  }
  if (snapshot.phase === "completed" || snapshot.status === "completed") {
    return "instant.progress.completed";
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
  const router = useRouter();
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
    pollingError,
    refreshSnapshot,
  } = useInstantPremiumProgressPolling();

  const [actionError, setActionError] = useState<string | null>(null);
  const [segmentRetryBusy, setSegmentRetryBusy] = useState<number | null>(null);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [textRerenderEditorOpen, setTextRerenderEditorOpen] = useState(false);
  const [fullRerenderEditorOpen, setFullRerenderEditorOpen] = useState(false);
  const [fullRerenderBusy, setFullRerenderBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const queuedSinceMsRef = useRef<number | null>(null);
  const studioStaleCheckDone = useRef(false);
  const [waitingForStartTooLong, setWaitingForStartTooLong] = useState(false);

  const [languageExports, setLanguageExports] = useState<VideoLanguageExportSummary[]>([]);
  const [versionMeta, setVersionMeta] = useState<{
    cleanVideoUrl: string | null;
    instantSceneTexts: unknown;
    usesStoryOverlay: boolean;
    instantMode?: string;
    instantTransitionSeconds?: number;
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
        instantMode?: string;
        instantTransitionSeconds?: number;
      } | null;
      if (cancelled || !json) {
        return;
      }
      setLanguageExports(json.exports ?? []);
      setVersionMeta({
        cleanVideoUrl: json.cleanVideoUrl ?? null,
        instantSceneTexts: json.instantSceneTexts,
        usesStoryOverlay: json.usesStoryOverlay ?? false,
        instantMode: json.instantMode,
        instantTransitionSeconds: json.instantTransitionSeconds,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isCompleted, effectiveProjectId]);

  useEffect(() => {
    if (!effectiveProjectId || !snapshot?.studioQa?.source.storyboardId || studioStaleCheckDone.current) {
      return;
    }
    studioStaleCheckDone.current = true;
    let cancelled = false;
    void (async () => {
      const res = await fetchStudioIntelligenceStale(effectiveProjectId, true);
      if (cancelled || !res.ok || !res.data.ok) {
        return;
      }
      const qa = res.data.studioQa;
      if (!qa) {
        return;
      }
      setSnapshot((prev) => (prev ? { ...prev, studioQa: qa } : prev));
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveProjectId, snapshot?.studioQa?.source.storyboardId, setSnapshot]);

  const videoRepair = useInstantVideoRepair({
    projectId: effectiveProjectId,
    snapshot,
    setSnapshot,
    isAdmin,
    onPollNow: refreshSnapshot,
  });

  const canShowFullRerender = Boolean(
    effectiveProjectId &&
      snapshot?.projectType === "instant_premium" &&
      (snapshot.segmentCount ?? snapshot.segments?.length ?? 0) > 0
  );
  const fullRerenderDisabled = Boolean(
    fullRerenderBusy ||
      rebuildBusy ||
      videoRepair.repairInFlight ||
      snapshot?.isRebuildingFinalVideo ||
      snapshot?.status === "running" ||
      snapshot?.status === "finalizing" ||
      snapshot?.status === "queued" ||
      snapshot?.phase === "generating_clips" ||
      snapshot?.phase === "merging_clips" ||
      snapshot?.phase === "uploading_final"
  );

  const handleQuickFullRerender = useCallback(async () => {
    if (!effectiveProjectId || fullRerenderDisabled) {
      return;
    }
    setFullRerenderBusy(true);
    setActionError(null);
    try {
      const result = await runQuickFullRerender({
        projectId: effectiveProjectId,
        confirmMessage: t("instant.fullRerender.confirmPromptQuick"),
        confirmMessageTestMode: t("instant.fullRerender.confirmPromptQuickTestMode"),
        abortedMessage: t("instant.fullRerender.aborted"),
        networkMessage: t("instant.fullRerender.failed"),
        failedMessage: t("instant.fullRerender.failed"),
      });
      if (!result.ok) {
        if (!result.cancelled) {
          setActionError(result.message);
        }
        return;
      }
      invalidateCachedInstantProgressSnapshot(effectiveProjectId);
      router.push(result.progressRoute);
    } finally {
      setFullRerenderBusy(false);
    }
  }, [effectiveProjectId, fullRerenderDisabled, router, t]);

  const handleCopyAsConcept = useCallback(async () => {
    if (!effectiveProjectId || fullRerenderDisabled) {
      return;
    }
    setFullRerenderBusy(true);
    setActionError(null);
    try {
      const result = await postCopyProjectAsDraft(effectiveProjectId);
      if (result.networkError || !result.ok) {
        setActionError(result.data.error ?? t("projects.concept.copyFailed"));
        return;
      }
      const path =
        result.data.editVersionPath ??
        (result.data.draftProjectId
          ? `/videos/${encodeURIComponent(result.data.draftProjectId)}/edit-version`
          : null);
      if (!path) {
        setActionError(t("projects.concept.copyFailed"));
        return;
      }
      router.push(path);
    } finally {
      setFullRerenderBusy(false);
    }
  }, [effectiveProjectId, fullRerenderDisabled, router, t]);

  const panelPollingError =
    pollingError ??
    (videoRepair.feedback.kind === "poll_failed" && videoRepair.feedback.userMessageKey
      ? {
          userMessageKey: videoRepair.feedback.userMessageKey as "instant.videoRepair.pollFailed",
          adminDetail: videoRepair.feedback.adminDetail,
        }
      : null);

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

  const applyTextRerenderResponse = useCallback(
    async (body: RebuildFinalVideoResponse) => {
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
    },
    [effectiveProjectId, setSnapshot, t]
  );

  const runTextRerender = useCallback(async () => {
    if (!effectiveProjectId) {
      return;
    }
    setRebuildBusy(true);
    setActionError(null);
    try {
      const result = await postRebuildFinalVideo(effectiveProjectId);
      if (result.networkError) {
        setActionError(
          instantExportUserErrorMessage({
            kind: result.errorKind ?? "network",
            abortedMessage: t("instant.textRerender.aborted"),
            networkMessage: t("instant.textRerender.failed"),
            httpMessage: result.data.error,
          })
        );
        setRebuildBusy(false);
        return;
      }
      const body = result.data;
      if (!result.ok) {
        setActionError(
          body.error ?? body.rebuild?.message ?? t("instant.textRerender.failed")
        );
        setRebuildBusy(false);
        return;
      }
      if (body.rebuild?.clipsReady === false) {
        setActionError(body.rebuild?.message ?? t("instant.textRerender.segmentsMissing"));
        setRebuildBusy(false);
        return;
      }
      await applyTextRerenderResponse(body);
    } catch (e) {
      setActionError(
        instantExportUserErrorMessage({
          kind: "network",
          abortedMessage: t("instant.textRerender.aborted"),
          networkMessage: t("instant.textRerender.failed"),
          adminDetail: e instanceof Error ? e.message : String(e),
        })
      );
      setRebuildBusy(false);
    }
  }, [applyTextRerenderResponse, effectiveProjectId, t]);

  useEffect(() => {
    if (!rebuildBusy || !snapshot || snapshot.isRebuildingFinalVideo) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRebuildBusy(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [rebuildBusy, snapshot]);

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
            <>
            {snapshot?.studioQa && effectiveProjectId ?
              <div className="mt-4">
                <MotionProjectStudioQaPanel
                  projectId={effectiveProjectId}
                  studioQa={snapshot.studioQa}
                  compact
                  syncDisabled={
                    snapshot.status === "running" ||
                    snapshot.status === "finalizing" ||
                    snapshot.phase === "generating_clips" ||
                    snapshot.phase === "merging_clips" ||
                    snapshot.phase === "uploading_final"
                  }
                  onStudioQaUpdated={(qa) => {
                    setSnapshot((prev) => (prev ? { ...prev, studioQa: qa } : prev));
                  }}
                />
              </div>
            : null}

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
              repairBusy={videoRepair.repairInFlight}
              rebuildBusy={rebuildBusy || Boolean(snapshot?.isRebuildingFinalVideo)}
              isAdmin={isAdmin}
              showUnifiedRepair={videoRepair.showRepairCard}
              repairUiView={videoRepair.uiView}
              repairFeedback={videoRepair.feedback}
              pollingError={panelPollingError}
              onRepair={
                effectiveProjectId && videoRepair.showRepairCard
                  ? () => void videoRepair.runRepair()
                  : undefined
              }
              onTextRerender={
                effectiveProjectId && snapshot?.canRebuildFinalVideo
                  ? () => setTextRerenderEditorOpen(true)
                  : undefined
              }
              onForceRebuild={isAdmin ? () => void runTextRerender() : undefined}
            />
            </>
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

          {isCompleted && snapshot?.finalVideoUrl ? (
            <div className="mt-4 space-y-3">
              <h2 className="text-base font-semibold text-zinc-900">
                {t("instant.progress.finalVideoTitle")}
              </h2>
              <VideoPreview
                key={finalPlaybackCacheKey}
                variant="main"
                frameClassName="overflow-hidden rounded-xl border border-zinc-200"
                controls
                playsInline
                preload="metadata"
                src={snapshot.finalVideoUrl}
              />
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
                <GradientButton href="/videos">{t("animate.button.openSavedProject")}</GradientButton>
              </div>
              <InstantRecoveryActionButtons
                snapshot={snapshot}
                hideVideoRepair={videoRepair.showRepairCard}
                textRerenderBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                forceRebuildBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                isAdmin={isAdmin}
                onTextRerender={() => setTextRerenderEditorOpen(true)}
                onForceRebuild={isAdmin ? () => void runTextRerender() : undefined}
                buttonClassName="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
              />
              {canShowFullRerender && isCompleted ?
                <ProjectRerenderChoices
                  disabled={fullRerenderDisabled}
                  quickBusy={fullRerenderBusy}
                  copyBusy={fullRerenderBusy}
                  onQuickRerender={() => void handleQuickFullRerender()}
                  onCopyAsConcept={() => void handleCopyAsConcept()}
                  onTextOnlyAdjust={() => setTextRerenderEditorOpen(true)}
                />
              : null}
              <p className="text-xs text-zinc-500">{t("instant.progress.savedToGallery")}</p>
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
            isCompleted ? (
              <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
                  {t("instant.progress.segment")} ({snapshot.segments.length})
                </summary>
                <div className="mt-3">
                  <InstantSegmentProgressList
                    projectId={effectiveProjectId}
                    snapshot={snapshot}
                    segmentRetryBusy={segmentRetryBusy}
                    mergeRetryBusy={videoRepair.repairInFlight}
                    hideMergeRepairButton={videoRepair.showRepairCard}
                    onRetryMerge={() => void videoRepair.runRepair()}
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
                </div>
              </details>
            ) : (
              <InstantSegmentProgressList
                projectId={effectiveProjectId}
                snapshot={snapshot}
                segmentRetryBusy={segmentRetryBusy}
                mergeRetryBusy={videoRepair.repairInFlight}
                hideMergeRepairButton={videoRepair.showRepairCard}
                onRetryMerge={() => void videoRepair.runRepair()}
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
            )
          ) : null}

          {snapshot?.finalVideoUrl && !isCompleted ? (
            <div className="mt-5 space-y-3">
              <h2 className="text-base font-semibold text-zinc-900">
                {t("instant.progress.finalVideoTitle")}
              </h2>
              <VideoPreview
                key={finalPlaybackCacheKey}
                variant="main"
                frameClassName="overflow-hidden rounded-xl border border-zinc-200"
                controls
                playsInline
                preload="metadata"
                src={snapshot.finalVideoUrl}
              />
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
                hideVideoRepair={videoRepair.showRepairCard}
                textRerenderBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                forceRebuildBusy={rebuildBusy || snapshot.isRebuildingFinalVideo}
                isAdmin={isAdmin}
                onTextRerender={() => setTextRerenderEditorOpen(true)}
                onForceRebuild={isAdmin ? () => void runTextRerender() : undefined}
                buttonClassName="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
              />
            </div>
          ) : null}

          {isCompleted && snapshot?.finalVideoUrl && effectiveProjectId ?
            <VideoVersionsPanel
              projectId={effectiveProjectId}
              hideOriginalVideoPlayer
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

      {effectiveProjectId && versionMeta?.usesStoryOverlay ?
        <TextRerenderEditorModal
          open={textRerenderEditorOpen}
          onClose={() => setTextRerenderEditorOpen(false)}
          projectId={effectiveProjectId}
          instantSceneTexts={versionMeta?.instantSceneTexts}
          imageCount={Math.max(parseSceneTextsJson(versionMeta?.instantSceneTexts).length, 1)}
          onRenderStart={() => setRebuildBusy(true)}
          onSuccess={(response) => {
            setRebuildBusy(true);
            void applyTextRerenderResponse(response);
          }}
          onError={(message) => {
            setActionError(message);
            setRebuildBusy(false);
          }}
        />
      : null}

      {effectiveProjectId && canShowFullRerender ?
        <FullRerenderEditorModal
          open={fullRerenderEditorOpen}
          onClose={() => setFullRerenderEditorOpen(false)}
          projectId={effectiveProjectId}
          instantSceneTexts={versionMeta?.instantSceneTexts ?? snapshot?.segments?.map(() => ({}))}
          instantMode={versionMeta?.instantMode}
          instantTransitionSeconds={versionMeta?.instantTransitionSeconds ?? 5}
          uploadRole={session.user?.role ?? "user"}
          imageCount={Math.max(
            snapshot?.segmentCount ?? snapshot?.segments?.length ?? 0,
            parseSceneTextsJson(versionMeta?.instantSceneTexts).length,
            1
          )}
          images={(snapshot?.segments ?? []).map((segment) => ({
            id: segment.sourceImageId,
            previewUrl: segment.sourceImageUrl ?? "",
          }))}
          onRenderStart={() => {
            setFullRerenderBusy(true);
            setActionError(null);
          }}
          onSuccess={(response) => {
            setFullRerenderBusy(false);
            setActionError(null);
            if (response.status) {
              setSnapshot(response.status);
            }
            invalidateCachedInstantProgressSnapshot(effectiveProjectId);
          }}
          onError={(message) => {
            setActionError(message);
            setFullRerenderBusy(false);
          }}
        />
      : null}
    </main>
  );
}
