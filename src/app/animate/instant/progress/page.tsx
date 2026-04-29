"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

function stageKey(snapshot: InstantPremiumStatusResponse | null): string {
  if (!snapshot) {
    return "instant.progress.preparingProject";
  }
  if (snapshot.phase === "failed") {
    return "instant.progress.failed";
  }
  if (snapshot.phase === "completed") {
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

export default function InstantPremiumProgressPage() {
  const t = useActiveTranslator();
  const [projectId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return new URLSearchParams(window.location.search).get("projectId")?.trim() ?? "";
  });
  const [snapshot, setSnapshot] = useState<InstantPremiumStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [queuedSinceMs, setQueuedSinceMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const missingProjectIdError = !projectId ? t("instant.progress.missingProjectParam") : null;

  const progress = useMemo(() => {
    if (!projectId) return 0;
    if (!snapshot) return 8;
    return Math.max(8, snapshot.progressPercent);
  }, [projectId, snapshot]);
  const queuedWithoutJob = snapshot?.queuedWithoutJobCount ?? 0;
  const waitingForStartTooLong =
    queuedSinceMs != null && queuedWithoutJob > 0 && nowMs - queuedSinceMs > 60_000;

  useEffect(() => {
    const tick = () => setNowMs(new Date().getTime());
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const res = await fetch(`/api/instant-premium/projects/${projectId}/status`, {
        credentials: "include",
      }).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) {
          setError(t("instant.progress.fetchFailed"));
          timer = setTimeout(() => void tick(), 3000);
        }
        return;
      }
      const data = (await res.json()) as InstantPremiumStatusResponse;
      if (cancelled) return;
      setSnapshot(data);
      setError(null);
      if ((data.queuedWithoutJobCount ?? 0) > 0) {
        setQueuedSinceMs((prev) => prev ?? Date.now());
      } else {
        setQueuedSinceMs(null);
      }
      if (data.status !== "completed" && data.status !== "failed") {
        timer = setTimeout(() => void tick(), 2500);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, t]);

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <AppCard>
          <h1 className="text-2xl font-bold">{t("instant.progress.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {projectId ? t(stageKey(snapshot) as never) : t("instant.progress.missingProjectParam")}
          </p>
          {projectId ? <p className="mt-2 text-xs text-zinc-500">{projectId}</p> : null}

          <p className="mt-4 text-sm font-medium text-zinc-800">{progress}%</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {missingProjectIdError ? <p className="mt-4 text-sm text-red-700">{missingProjectIdError}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {projectId && waitingForStartTooLong ? (
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
                        `/api/instant-premium/projects/${projectId}/segments/start`,
                        { method: "POST", credentials: "include" }
                      );
                      const body = (await res.json().catch(() => ({}))) as {
                        error?: string;
                        status?: InstantPremiumStatusResponse;
                      };
                      if (!res.ok) {
                        setError(body.error ?? t("instant.progress.retryFailed"));
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
              {snapshot.errorMessage || t("instant.progress.failedHelp")}
            </div>
          ) : null}
          <div className="mt-6">
            <h2 className="text-base font-semibold text-zinc-900">{t("instant.progress.segmentsTitle")}</h2>
            <p className="mt-1 text-xs text-zinc-500">{t("instant.progress.segmentsHelp")}</p>
          </div>
          <div className="mt-3 space-y-3">
            {snapshot?.segments.map((segment) => (
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
                      href={segment.videoUrl}
                      download={`homecheff-motion-${projectId}-segment-${segment.index + 1}.mp4`}
                      className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800"
                    >
                      {t("instant.progress.downloadSegment")}
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {snapshot?.finalVideoUrl ? (
            <div className="mt-5">
              <h2 className="text-base font-semibold text-zinc-900">{t("instant.progress.finalVideoTitle")}</h2>
              <video
                controls
                playsInline
                preload="metadata"
                className="mt-2 max-h-80 w-full rounded-xl border border-zinc-200 bg-black"
              >
                <source src={snapshot.finalVideoUrl} type="video/mp4" />
              </video>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={snapshot.finalVideoUrl}
                  download={`homecheff-motion-${projectId}.mp4`}
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
            </div>
          ) : null}
          {projectId && snapshot?.status === "failed" ? (
            <button
              type="button"
              disabled={retryBusy}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              onClick={() => {
                setRetryBusy(true);
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/instant-premium/projects/${projectId}/merge/retry`,
                      { method: "POST", credentials: "include" }
                    );
                    if (!res.ok) {
                      const body = (await res.json().catch(() => ({}))) as { error?: string };
                      setError(body.error ?? t("instant.progress.retryFailed"));
                      return;
                    }
                    const body = (await res.json()) as InstantPremiumStatusResponse;
                    setSnapshot(body);
                    setError(null);
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
            {projectId ? (
              <GradientButton href="/videos">{t("animate.button.openSavedProject")}</GradientButton>
            ) : null}
          </div>
        </AppCard>
      </div>
    </main>
  );
}
