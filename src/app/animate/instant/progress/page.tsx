"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useInstantPremiumProgressPolling } from "@/hooks/use-instant-premium-progress-polling";
import { useActiveTranslator } from "@/i18n/client";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { brand } from "@/lib/brand";
import { syncActiveAnimationProjects } from "@/lib/sync-active-animation-projects";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

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
  const completionSyncedRef = useRef(false);
  const {
    projectId,
    snapshot,
    setSnapshot,
    connectionState,
    transientMessage,
    showFatalMissing,
  } = useInstantPremiumProgressPolling();

  const [actionError, setActionError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const queuedSinceMsRef = useRef<number | null>(null);
  const [waitingForStartTooLong, setWaitingForStartTooLong] = useState(false);

  const isCompleted = snapshot?.status === "completed" || Boolean(snapshot?.finalVideoUrl);
  const isReconnecting =
    connectionState === "reconnecting" ||
    connectionState === "worker_connecting" ||
    (connectionState === "polling" && !snapshot);
  const effectiveProjectId = projectId || snapshot?.projectId || "";
  const transientBanner = transientBannerKey(transientMessage);

  const progress = useMemo(() => {
    if (isCompleted) {
      return 100;
    }
    if (!effectiveProjectId) {
      return snapshot ? Math.max(8, snapshot.progressPercent) : 4;
    }
    if (!snapshot) {
      return 8;
    }
    return Math.max(8, snapshot.progressPercent);
  }, [effectiveProjectId, snapshot, isCompleted]);

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
              <p className="mt-4 text-sm font-medium text-zinc-800">{progress}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
          {snapshot?.segments?.length ? (
            <>
              <div className="mt-6">
                <h2 className="text-base font-semibold text-zinc-900">{t("instant.progress.segmentsTitle")}</h2>
                <p className="mt-1 text-xs text-zinc-500">{t("instant.progress.segmentsHelp")}</p>
              </div>
              <div className="mt-3 space-y-3">
                {snapshot.segments.map((segment) => (
              <div key={segment.index} className="rounded-xl border border-zinc-200 p-3">
                <p className="text-xs font-semibold text-zinc-700">
                  {t("instant.progress.segment")} #{segment.index + 1} - {segment.status}
                </p>
                {segment.videoUrl ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="mt-2 max-h-44 w-full rounded-lg border border-zinc-200 bg-black"
                  >
                    <source src={segment.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">{t("instant.progress.segmentPending")}</p>
                )}
                {segment.error ? <p className="mt-1 text-xs text-red-700">{segment.error}</p> : null}
                {segment.videoUrl ? (
                  <div className="mt-2">
                    <a
                      href={animationProjectDownloadUrl(effectiveProjectId, { segmentOrder: segment.index })}
                      download={`homecheff-motion-${effectiveProjectId}-segment-${segment.index + 1}.mp4`}
                      className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800"
                    >
                      {t("instant.progress.downloadSegment")}
                    </a>
                  </div>
                ) : null}
              </div>
                ))}
              </div>
            </>
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
                key={snapshot.finalVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="mt-2 max-h-80 w-full rounded-xl border border-zinc-200 bg-black"
              >
                <source src={snapshot.finalVideoUrl} type="video/mp4" />
              </video>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={animationProjectDownloadUrl(effectiveProjectId)}
                  download={`homecheff-motion-${effectiveProjectId}.mp4`}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900"
                >
                  {t("instant.progress.download")}
                </a>
                {snapshot.canRebuildFinalVideo ? (
                  <button
                    type="button"
                    disabled={rebuildBusy || snapshot.isRebuildingFinalVideo}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900 disabled:opacity-60"
                    onClick={() => {
                      setRebuildBusy(true);
                      setActionError(null);
                      void (async () => {
                        try {
                          const res = await fetch(
                            `/api/instant-premium/projects/${effectiveProjectId}/rebuild-final-video`,
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
                              body.error ??
                                body.rebuild?.message ??
                                t("instant.progress.rebuildFinalFailed")
                            );
                            return;
                          }
                          if (body.rebuild?.clipsReady === false) {
                            setActionError(
                              body.rebuild?.message ?? t("instant.progress.rebuildSegmentsMissing")
                            );
                            return;
                          }
                          if (body.rebuild?.ok) {
                            setActionError(null);
                          } else {
                            setActionError(
                              body.rebuild?.message ??
                                (body.rebuild?.finalVideoUrlPresent
                                  ? t("instant.progress.rebuildFinalFailedKeepsPrevious")
                                  : t("instant.progress.rebuildFinalFailed"))
                            );
                          }
                          if (body.status) {
                            setSnapshot(body.status);
                          }
                        } finally {
                          setRebuildBusy(false);
                        }
                      })();
                    }}
                  >
                    {rebuildBusy || snapshot.isRebuildingFinalVideo
                      ? t("instant.progress.rebuildingFinal")
                      : t("instant.progress.rebuildFinalVideo")}
                  </button>
                ) : null}
                {snapshot.finalDurationSeconds ? (
                  <p className="text-xs text-zinc-500">
                    {t("instant.progress.finalDuration", { seconds: snapshot.finalDurationSeconds })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {effectiveProjectId &&
          snapshot?.canRebuildFinalVideo &&
          !snapshot?.finalVideoUrl &&
          !snapshot?.canRetryOverlay ? (
            <button
              type="button"
              disabled={rebuildBusy || snapshot.isRebuildingFinalVideo}
              className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setRebuildBusy(true);
                setActionError(null);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${effectiveProjectId}/rebuild-final-video`,
                      { method: "POST", credentials: "include" }
                    );
                    const body = (await res.json().catch(() => ({}))) as {
                      error?: string;
                      rebuild?: { clipsReady?: boolean; message?: string };
                      status?: InstantPremiumStatusResponse;
                    };
                    if (!res.ok) {
                      setActionError(
                        body.error ?? body.rebuild?.message ?? t("instant.progress.rebuildFinalFailed")
                      );
                      return;
                    }
                    if (body.rebuild?.clipsReady === false) {
                      setActionError(
                        body.rebuild?.message ?? t("instant.progress.rebuildSegmentsMissing")
                      );
                      return;
                    }
                    if (body.status) {
                      setSnapshot(body.status);
                    }
                  } finally {
                    setRebuildBusy(false);
                  }
                })();
              }}
            >
              {rebuildBusy || snapshot.isRebuildingFinalVideo
                ? t("instant.progress.rebuildingFinal")
                : t("instant.progress.rebuildFinalVideo")}
            </button>
          ) : null}
          {effectiveProjectId && snapshot?.canRepairFinalVideo && !snapshot?.canRetryOverlay ? (
            <button
              type="button"
              disabled={retryBusy}
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setRetryBusy(true);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${effectiveProjectId}/repair-final-video`,
                      { method: "POST", credentials: "include" }
                    );
                    if (!res.ok) {
                      const body = (await res.json().catch(() => ({}))) as { error?: string };
                      setActionError(body.error ?? t("instant.recover.failed"));
                      return;
                    }
                    const body = (await res.json()) as {
                      status?: InstantPremiumStatusResponse;
                    };
                    if (body.status) {
                      setSnapshot(body.status);
                    }
                    setActionError(null);
                  } finally {
                    setRetryBusy(false);
                  }
                })();
              }}
            >
              {retryBusy ? t("instant.recover.restoring") : t("instant.progress.repairFinalVideo")}
            </button>
          ) : null}
          {effectiveProjectId && snapshot?.canRetryOverlay ? (
            <button
              type="button"
              disabled={retryBusy}
              className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setRetryBusy(true);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${effectiveProjectId}/repair-final-video`,
                      { method: "POST", credentials: "include" }
                    );
                    if (!res.ok) {
                      const body = (await res.json().catch(() => ({}))) as { error?: string };
                      setActionError(body.error ?? t("instant.progress.retryFailed"));
                      return;
                    }
                    const body = (await res.json()) as {
                      status?: InstantPremiumStatusResponse;
                    };
                    if (body.status) {
                      setSnapshot(body.status);
                    }
                    setActionError(null);
                  } finally {
                    setRetryBusy(false);
                  }
                })();
              }}
            >
              {retryBusy ? t("instant.recover.restoring") : t("instant.progress.retryOverlay")}
            </button>
          ) : null}
          {effectiveProjectId && snapshot?.status === "failed" && !snapshot?.canRetryOverlay ? (
            <button
              type="button"
              disabled={retryBusy}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setRetryBusy(true);
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
                      setActionError(null);
                  } finally {
                    setRetryBusy(false);
                  }
                })();
              }}
            >
              {retryBusy ? t("instant.step7.preparing") : t("instant.progress.retryMerge")}
            </button>
          ) : null}

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
