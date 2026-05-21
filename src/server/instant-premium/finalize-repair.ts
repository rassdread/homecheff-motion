import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { triggerWorkerInstantPremiumProcess } from "@/lib/video-worker-client";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import {
  executeInstantPremiumMerge,
  retryUploadLocalMergedFinalVideo,
} from "@/server/instant-premium/merge-instant-project";
import { runFinalExportToCompletion } from "@/server/instant-premium/wait-for-final-export";
import { isBlobTokenConfigured } from "@/lib/vercel-blob-config";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";

export const FINALIZATION_STUCK_MS = 5 * 60 * 1000;

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

function logFinalizeRepair(phase: string, data: Record<string, unknown>): void {
  console.info("[finalize-repair]", { phase, ...data });
}

function transitionsAllCompleted(
  transitions: Array<{ status: string; outputVideoUrl: string | null }>
): boolean {
  return (
    transitions.length > 0 &&
    transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim())
  );
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

    if (options?.awaitWorker || options?.force) {
      await runFinalExportToCompletion(projectId, { force: Boolean(options?.force) });
    } else {
      triggerWorkerInstantPremiumProcess(projectId, options);
    }
    return;
  }
  if (options?.awaitWorker || options?.force) {
    await runFinalExportToCompletion(projectId, { force: options?.force });
    return;
  }
  await executeInstantPremiumMerge(projectId, { force: options?.force });
}

/** Idempotent: rerun merge/overlay/upload when clips are ready but final video is missing. */
export async function repairInstantPremiumFinalVideo(
  projectId: string,
  options?: { force?: boolean; source?: string }
): Promise<RepairFinalVideoResult> {
  const source = options?.source ?? "manual";
  logFinalizeRepair("start", { projectId, source, force: Boolean(options?.force) });

  await refreshTransitionOutputsFromProvider(projectId).catch(() => undefined);
  await pollProjectJobs(projectId).catch(() => undefined);

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project || !isInstantLikeProject(project)) {
    logFinalizeRepair("failed", { projectId, source, reason: "not_found" });
    return {
      ok: false,
      projectId,
      clipsReady: false,
      workerTriggered: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
      message: "Instant Premium project not found.",
    };
  }

  const clipsReady = transitionsAllCompleted(project.transitions);
  if (!clipsReady) {
    logFinalizeRepair("failed", { projectId, source, reason: "clips_not_ready" });
    return {
      ok: false,
      projectId,
      clipsReady: false,
      workerTriggered: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
      message: "Provider clips are not all completed yet.",
    };
  }

  logFinalizeRepair("clips-ready", {
    projectId,
    source,
    segmentCount: project.transitions.length,
  });

  if (isBlobTokenConfigured()) {
    const uploadOnly = await retryUploadLocalMergedFinalVideo(projectId);
    if (uploadOnly.ok && uploadOnly.finalUrl) {
      logFinalizeRepair("completed", {
        projectId,
        source,
        uploadOnly: true,
        finalVideoUrl: uploadOnly.finalUrl,
      });
      return {
        ok: true,
        projectId,
        clipsReady: true,
        workerTriggered: false,
        mergeCompleted: true,
        finalVideoUrlPresent: true,
      };
    }
    if (uploadOnly.message && !uploadOnly.ok) {
      logFinalizeRepair("worker-triggered", {
        projectId,
        source,
        uploadOnlyRetrySkipped: uploadOnly.message,
      });
    }
  }

  const latestExport = project.exports[0];
  const force = Boolean(options?.force) || detectFinalizationStuck(project).isStuck;

  if (force && latestExport) {
    await prisma.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "rendering",
        progress: latestExport.progress >= 55 ? 55 : Math.max(10, latestExport.progress),
        errorMessage: null,
        outputVideoUrl: null,
      },
    });
  }

  if (force) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "rendering",
        failureReason: null,
        lastOverlayError: null,
        instantWorkerJobStatus: "queued",
        instantWorkerJobStartedAt: new Date(),
      },
    });
  }

  try {
    await orchestrateFinalMerge(projectId, { force, awaitWorker: true });
    logFinalizeRepair("worker-triggered", { projectId, source, force, workerMode: isVideoRenderWorkerMode() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finalize repair failed.";
    logFinalizeRepair("failed", { projectId, source, error: message });
    return {
      ok: false,
      projectId,
      clipsReady: true,
      workerTriggered: true,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
      message,
    };
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" } } },
  });
  const finalExport = refreshed?.exports[0];
  const mergeCompleted = isInstantPremiumExportCompleted(
    refreshed?.status ?? "",
    finalExport?.status
  );
  const finalVideoUrlPresent = Boolean(finalExport?.outputVideoUrl?.trim());

  if (mergeCompleted && finalVideoUrlPresent) {
    logFinalizeRepair("completed", { projectId, source, finalVideoUrl: finalExport?.outputVideoUrl });
  } else {
    logFinalizeRepair("failed", {
      projectId,
      source,
      projectStatus: refreshed?.status,
      exportStatus: finalExport?.status,
    });
  }

  return {
    ok: mergeCompleted && finalVideoUrlPresent,
    projectId,
    clipsReady: true,
    workerTriggered: true,
    mergeCompleted,
    finalVideoUrlPresent,
    message:
      mergeCompleted && finalVideoUrlPresent
        ? undefined
        : "Final merge did not complete yet. Try again in a moment.",
  };
}
