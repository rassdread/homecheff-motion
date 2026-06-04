"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  cancelStudioJobApi,
  fetchStudioJobApi,
  isStudioJobActive,
} from "@/lib/studio-jobs-client";
import type { StudioJobDetail, StudioJobListItem } from "@/types/studio-job";

const POLL_MS = 3000;

type StudioStoryboardJobPanelProps = {
  storyboardId: string;
  activeJobId: string | null;
  recentJobs: StudioJobListItem[];
  onJobUpdated: (job: StudioJobDetail) => void;
  onJobFinished: (job: StudioJobDetail) => void;
  onRefreshJobs: () => void;
  canModify: boolean;
};

export function StudioStoryboardJobPanel({
  storyboardId,
  activeJobId,
  recentJobs,
  onJobUpdated,
  onJobFinished,
  onRefreshJobs,
  canModify,
}: StudioStoryboardJobPanelProps) {
  const t = useActiveTranslator();
  const [job, setJob] = useState<StudioJobDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadJob = useCallback(
    async (jobId: string) => {
      const res = await fetchStudioJobApi(storyboardId, jobId);
      if (!res.ok) {
        return;
      }
      setJob(res.data.job);
      onJobUpdated(res.data.job);
      if (!isStudioJobActive(res.data.job.status)) {
        onJobFinished(res.data.job);
      }
    },
    [storyboardId, onJobUpdated, onJobFinished]
  );

  useEffect(() => {
    if (!activeJobId) {
      return;
    }
    queueMicrotask(() => {
      void loadJob(activeJobId);
    });
  }, [activeJobId, loadJob]);

  useEffect(() => {
    if (!activeJobId || !job || !isStudioJobActive(job.status)) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadJob(activeJobId);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeJobId, job?.status, job, loadJob]);

  const displayJob =
    job ?? (activeJobId ? recentJobs.find((j) => j.id === activeJobId) : recentJobs[0]) ?? null;

  if (!displayJob) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.jobs.noJobsYet")}</p>
    );
  }

  const handleCancel = async () => {
    if (!displayJob || !canModify) {
      return;
    }
    setCancelling(true);
    const res = await cancelStudioJobApi(storyboardId, displayJob.id);
    setCancelling(false);
    if (res.ok) {
      await loadJob(displayJob.id);
      onRefreshJobs();
    }
  };

  const failedScenes =
    job?.result?.errors?.map((e) => ({
      sceneId: e.sceneId,
      label: e.sceneTitle ?? e.sceneId,
      message: e.message,
    })) ?? [];

  const completedCount = job?.result?.completedSceneCount ?? 0;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t("studio.jobs.panelTitle")}</h2>
          <p className="text-sm text-zinc-600">
            {t(`studio.jobs.type.${displayJob.type}`)} · {t(`studio.jobs.status.${displayJob.status}`)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onRefreshJobs();
              if (displayJob) {
                void loadJob(displayJob.id);
              }
            }}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700"
          >
            {t("studio.jobs.refresh")}
          </button>
          {canModify && isStudioJobActive(displayJob.status) ? (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => void handleCancel()}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              {t("studio.jobs.cancel")}
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-semibold text-zinc-600">
          <span>{displayJob.currentStep || t("studio.jobs.waiting")}</span>
          <span>{displayJob.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[#006D52] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, displayJob.progress))}%` }}
          />
        </div>
      </div>

      {displayJob.errorMessage ? (
        <p className="text-sm text-red-700">{displayJob.errorMessage}</p>
      ) : null}

      {completedCount > 0 ? (
        <p className="text-sm text-emerald-800">
          {t("studio.jobs.completedScenes", { count: String(completedCount) })}
        </p>
      ) : null}

      {failedScenes.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("studio.jobs.failedScenes")}</p>
          <ul className="mt-2 space-y-1 text-sm text-red-800">
            {failedScenes.map((f) => (
              <li key={f.sceneId}>
                {t("studio.jobs.sceneFailed", {
                  scene: f.label,
                  error: f.message,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
