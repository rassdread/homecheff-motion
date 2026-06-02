import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { triggerWorkerInstantPremiumProcess } from "@/lib/video-worker-client";
import {
  executeInstantPremiumMerge,
} from "@/server/instant-premium/merge-instant-project";
import { runFinalExportToCompletion } from "@/server/instant-premium/wait-for-final-export";
import {
  isStoryInstantMode,
  storyModeClipsReadyForMerge,
} from "@/server/instant-premium/story-mode-transitions";

export const FINALIZATION_STUCK_MS = 5 * 60 * 1000;
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

export async function orchestrateFinalMerge(
  projectId: string,
  options?: { force?: boolean; awaitWorker?: boolean }
): Promise<void> {
  if (isVideoRenderWorkerMode()) {
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

    if (options?.awaitWorker) {
      await runFinalExportToCompletion(projectId, { force: Boolean(options?.force) });
    } else {
      triggerWorkerInstantPremiumProcess(projectId, options);
    }
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
