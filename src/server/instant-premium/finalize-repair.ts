import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { requestWorkerInstantPremiumProcess } from "@/lib/video-worker-client";
import {
  executeInstantPremiumMerge,
} from "@/server/instant-premium/merge-instant-project";
import { runFinalExportToCompletion } from "@/server/instant-premium/wait-for-final-export";
import {
  isStoryInstantMode,
  storyModeClipsReadyForMerge,
} from "@/server/instant-premium/story-mode-transitions";

export const FINALIZATION_STUCK_MS = 5 * 60 * 1000;
/** Repair/worker dispatch left in queued with no running worker. */
export const REPAIR_WORKER_DISPATCH_STALE_MS = 90 * 1000;
/** Restart merge from segment download — avoids leaving UI stuck at 55–70%. */
export const REPAIR_MERGE_START_PROGRESS = 10;

export type FinalizationStuckInfo = {
  isStuck: boolean;
  shouldAutoRepair: boolean;
  mergeInProgress: boolean;
  reason: string | null;
};

export type RepairFinalVideoResult = {
  ok: boolean;
  projectId: string;
  clipsReady: boolean;
  workerTriggered: boolean;
  mergeCompleted: boolean;
  finalVideoUrlPresent: boolean;
  message?: string;
};

function transitionsAllCompleted(
  transitions: Array<{ status: string; outputVideoUrl: string | null }>
): boolean {
  return (
    transitions.length > 0 &&
    transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim())
  );
}

export function clipsReadyForFinalizeRepair(
  instantMode: string | null | undefined,
  transitions: Array<{ order: number; status: string; outputVideoUrl: string | null }>
): boolean {
  if (isStoryInstantMode(instantMode)) {
    return storyModeClipsReadyForMerge(instantMode, transitions);
  }
  return transitionsAllCompleted(transitions);
}

/** Clears stuck worker/export state so merge can restart from segment download. */
export async function resetInstantRepairExportState(projectId: string): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!project) {
    return;
  }

  const latestExport = project.exports[0];
  if (latestExport) {
    await prisma.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "rendering",
        progress: REPAIR_MERGE_START_PROGRESS,
        errorMessage: null,
        outputVideoUrl: null,
      },
    });
  }

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "rendering",
      failureReason: null,
      lastOverlayError: null,
      instantWorkerJobStatus: "queued",
      instantWorkerJobStartedAt: new Date(),
      instantFinalRebuildStatus: null,
    },
  });
}

function ageMs(date: Date | null | undefined): number {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Date.now() - date.getTime());
}

export function detectFinalizationStuck(project: {
  status: string;
  instantWorkerJobStatus: string | null;
  instantWorkerJobStartedAt: Date | null;
  transitions: Array<{ status: string; outputVideoUrl: string | null }>;
  exports: Array<{
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    updatedAt: Date;
  }>;
}): FinalizationStuckInfo {
  const latestExport = project.exports[0];
  const segmentsDone = transitionsAllCompleted(project.transitions);
  const hasFinal = isInstantPremiumExportCompleted(project.status, latestExport?.status) &&
    Boolean(latestExport?.outputVideoUrl?.trim());

  if (!segmentsDone || hasFinal) {
    return { isStuck: false, shouldAutoRepair: false, mergeInProgress: false, reason: null };
  }

  const exportRendering = latestExport?.status === "rendering";
  const exportStuckAtMerge =
    exportRendering &&
    (latestExport?.progress ?? 0) >= 55 &&
    ageMs(latestExport?.updatedAt) >= FINALIZATION_STUCK_MS;

  const workerRunning = project.instantWorkerJobStatus === "running";
  const workerStuck =
    workerRunning && ageMs(project.instantWorkerJobStartedAt) >= FINALIZATION_STUCK_MS;

  const projectRenderingStuck =
    project.status === "rendering" &&
    exportRendering &&
    ageMs(latestExport?.updatedAt) >= FINALIZATION_STUCK_MS;

  const failedWithoutFinal =
    (project.status === "failed" || project.status === "failed_overlay") && !latestExport?.outputVideoUrl;

  const mergeInProgress =
    (exportRendering && ageMs(latestExport?.updatedAt) < FINALIZATION_STUCK_MS) ||
    (workerRunning && ageMs(project.instantWorkerJobStartedAt) < FINALIZATION_STUCK_MS);

  const isStuck = exportStuckAtMerge || workerStuck || projectRenderingStuck || failedWithoutFinal;

  return {
    isStuck,
    shouldAutoRepair: isStuck && !mergeInProgress,
    mergeInProgress,
    reason: isStuck
      ? exportStuckAtMerge
        ? "export_rendering_stuck"
        : workerStuck
          ? "worker_running_stuck"
          : failedWithoutFinal
            ? "failed_without_final"
            : "project_rendering_stuck"
      : null,
  };
}

export function isExportMergeStuck(exportRow: {
  status: string;
  progress: number;
  updatedAt: Date;
}): boolean {
  return (
    exportRow.status === "rendering" &&
    exportRow.progress >= 55 &&
    ageMs(exportRow.updatedAt) >= FINALIZATION_STUCK_MS
  );
}

export function isWorkerJobStuck(project: {
  instantWorkerJobStatus: string | null;
  instantWorkerJobStartedAt: Date | null;
}): boolean {
  if (project.instantWorkerJobStatus !== "running") {
    return false;
  }
  return ageMs(project.instantWorkerJobStartedAt) >= FINALIZATION_STUCK_MS;
}

export async function dispatchInstantPremiumWorkerMerge(
  projectId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; status: string; message?: string }> {
  if (!isVideoRenderWorkerMode()) {
    return { ok: false, status: "local_mode", message: "Worker mode is not enabled." };
  }

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "running",
      instantWorkerJobStartedAt: new Date(),
      status: "rendering",
      failureReason: null,
      lastOverlayError: null,
    },
  });

  try {
    const result = await requestWorkerInstantPremiumProcess(projectId, {
      force: Boolean(options?.force),
    });
    return {
      ok: result.ok || result.status === "completed" || result.status === "running",
      status: result.status,
      message: result.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.info("[hc-instant-premium]", {
      projectId,
      phase: "worker_dispatch_failed",
      error: message,
    });
    return { ok: false, status: "dispatch_failed", message };
  }
}

/** Fire-and-forget worker merge; logs failures (legacy callers). */
export function triggerInstantPremiumWorkerMerge(
  projectId: string,
  options?: { force?: boolean }
): void {
  void dispatchInstantPremiumWorkerMerge(projectId, options).catch(() => undefined);
}

export async function orchestrateFinalMerge(
  projectId: string,
  options?: { force?: boolean; awaitWorker?: boolean }
): Promise<void> {
  if (isVideoRenderWorkerMode()) {
    const force = Boolean(options?.force);
    const pollCompletion = () => runFinalExportToCompletion(projectId, { force });

    if (options?.awaitWorker) {
      await dispatchInstantPremiumWorkerMerge(projectId, options);
      await pollCompletion();
      return;
    }

    await prisma.animationProject
      .update({
        where: { id: projectId },
        data: {
          instantWorkerJobStatus: "queued",
          instantWorkerJobStartedAt: new Date(),
          status: "rendering",
        },
      })
      .catch(() => undefined);

    triggerInstantPremiumWorkerMerge(projectId, options);
    void pollCompletion().catch((error) => {
      console.warn("[hc-instant-premium]", {
        projectId,
        phase: "merge_completion_poll_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }
  if (options?.awaitWorker) {
    await runFinalExportToCompletion(projectId, { force: options?.force });
    return;
  }
  await executeInstantPremiumMerge(projectId, { force: options?.force });
}

export {
  repairInstantPremiumFinalVideo,
  startInstantVideoRepair,
  isInstantVideoRepairInProgress,
} from "@/server/instant-premium/start-instant-video-repair";
