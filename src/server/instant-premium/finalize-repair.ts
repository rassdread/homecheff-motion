import { after } from "next/server";
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

/**
 * Stale threshold for finalization lease.
 * Normal worker merge completes in ~20–25s; keep materially above that.
 */
export const FINALIZATION_STUCK_MS = 90 * 1000;
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

  const workerRunning =
    project.instantWorkerJobStatus === "running" ||
    project.instantWorkerJobStatus === "queued";
  const workerAge = ageMs(project.instantWorkerJobStartedAt);
  const workerStuck = workerRunning && workerAge >= FINALIZATION_STUCK_MS;

  /** False "running" with export never claimed (pending/0) — Production orchestration gap. */
  const exportIdle =
    !latestExport?.outputVideoUrl?.trim() &&
    (latestExport?.status === "pending" ||
      latestExport?.status === "queued" ||
      ((latestExport?.progress ?? 0) === 0 && latestExport?.status !== "rendering"));
  const falseRunningLease =
    project.instantWorkerJobStatus === "running" &&
    exportIdle &&
    workerAge >= FINALIZATION_STUCK_MS;

  const projectRenderingStuck =
    project.status === "rendering" &&
    exportRendering &&
    ageMs(latestExport?.updatedAt) >= FINALIZATION_STUCK_MS;

  const failedWithoutFinal =
    (project.status === "failed" || project.status === "failed_overlay") && !latestExport?.outputVideoUrl;

  const mergeInProgress =
    !workerStuck &&
    ((exportRendering && ageMs(latestExport?.updatedAt) < FINALIZATION_STUCK_MS) ||
      (workerRunning && workerAge < FINALIZATION_STUCK_MS));

  const isStuck =
    exportStuckAtMerge ||
    workerStuck ||
    falseRunningLease ||
    projectRenderingStuck ||
    failedWithoutFinal;

  return {
    isStuck,
    shouldAutoRepair: isStuck && !mergeInProgress,
    mergeInProgress,
    reason: isStuck
      ? falseRunningLease
        ? "false_running_export_idle"
        : exportStuckAtMerge
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
  if (
    project.instantWorkerJobStatus !== "running" &&
    project.instantWorkerJobStatus !== "queued"
  ) {
    return false;
  }
  return ageMs(project.instantWorkerJobStartedAt) >= FINALIZATION_STUCK_MS;
}

/** Mark dispatch failure so "running" cannot remain immortal after a failed handoff. */
export async function markFinalMergeDispatchFailed(
  projectId: string,
  message: string
): Promise<void> {
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "failed",
      failureReason: "merge_failed",
      lastOverlayError: message.slice(0, 500),
    },
  });
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "FINAL_MERGE_DISPATCH_FAILED",
    error: message.slice(0, 200),
  });
}

/**
 * Claim a finalization lease as queued (not running) so duplicate GET /status
 * sees mergeInProgress without asserting the worker has accepted work.
 */
export async function claimFinalMergeQueued(projectId: string): Promise<boolean> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) {
    return false;
  }
  const stuck = detectFinalizationStuck(project);
  const exportDone = isInstantPremiumExportCompleted(
    project.status,
    project.exports[0]?.status,
    project.exports[0]?.outputVideoUrl
  );
  if (exportDone && project.exports[0]?.outputVideoUrl?.trim()) {
    return false;
  }
  if (stuck.mergeInProgress) {
    return false;
  }

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "queued",
      instantWorkerJobStartedAt: new Date(),
      status: "rendering",
      failureReason: null,
      lastOverlayError: null,
    },
  });
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "FINAL_MERGE_CLAIMED",
  });
  return true;
}

export async function dispatchInstantPremiumWorkerMerge(
  projectId: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; status: string; message?: string }> {
  if (!isVideoRenderWorkerMode()) {
    return { ok: false, status: "local_mode", message: "Worker mode is not enabled." };
  }

  console.info("[hc-instant-premium]", {
    projectId,
    phase: "FINAL_MERGE_DISPATCH_START",
    force: Boolean(options?.force),
  });

  // Keep lease as queued until the worker HTTP is accepted. Do NOT write
  // "running" before acknowledgement — that created immortal false-running.
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "queued",
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
    const accepted =
      result.ok || result.status === "completed" || result.status === "running";

    if (!accepted) {
      await markFinalMergeDispatchFailed(
        projectId,
        result.message ?? `Worker rejected dispatch (${result.status}).`
      );
      return {
        ok: false,
        status: result.status,
        message: result.message,
      };
    }

    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        instantWorkerJobStatus:
          result.status === "completed" ? "completed" : "running",
        instantWorkerJobStartedAt: new Date(),
        ...(result.status === "completed"
          ? { failureReason: null, lastOverlayError: null }
          : {}),
      },
    });

    console.info("[hc-instant-premium]", {
      projectId,
      phase:
        result.status === "completed"
          ? "FINAL_MERGE_WORKER_COMPLETED"
          : "FINAL_MERGE_DISPATCH_ACCEPTED",
      workerStatus: result.status,
    });

    return {
      ok: true,
      status: result.status,
      message: result.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFinalMergeDispatchFailed(projectId, message);
    return { ok: false, status: "dispatch_failed", message };
  }
}

/** Fire-and-forget worker merge; logs failures (legacy callers). Prefer after()-scheduled dispatch. */
export function triggerInstantPremiumWorkerMerge(
  projectId: string,
  options?: { force?: boolean }
): void {
  void dispatchInstantPremiumWorkerMerge(projectId, options).catch(() => undefined);
}

/**
 * Schedule / run final merge.
 *
 * Production (worker mode, non-awaitWorker): claim queued lease, then use Next.js
 * `after()` so dispatch survives the GET /status response lifecycle. Never
 * fire-and-forget the worker HTTP on the request isolate.
 */
export async function orchestrateFinalMerge(
  projectId: string,
  options?: { force?: boolean; awaitWorker?: boolean }
): Promise<void> {
  if (isVideoRenderWorkerMode()) {
    const force = Boolean(options?.force);

    if (options?.awaitWorker) {
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "FINAL_MERGE_ELIGIBLE",
        mode: "awaitWorker",
      });
      const dispatched = await dispatchInstantPremiumWorkerMerge(projectId, options);
      if (!dispatched.ok) {
        return;
      }
      if (dispatched.status !== "completed") {
        await runFinalExportToCompletion(projectId, { force });
      }
      return;
    }

    if (force) {
      await prisma.animationProject
        .update({
          where: { id: projectId },
          data: {
            instantWorkerJobStatus: "queued",
            instantWorkerJobStartedAt: new Date(),
            status: "rendering",
            failureReason: null,
            lastOverlayError: null,
          },
        })
        .catch(() => undefined);
    } else {
      const claimed = await claimFinalMergeQueued(projectId);
      if (!claimed) {
        console.info("[hc-instant-premium]", {
          projectId,
          phase: "FINAL_MERGE_CLAIM_SKIPPED",
          reason: "lease_held_or_complete",
        });
        return;
      }
    }

    console.info("[hc-instant-premium]", {
      projectId,
      phase: "FINAL_MERGE_ELIGIBLE",
      mode: "after_dispatch",
    });

    const runDispatch = async () => {
      try {
        const dispatched = await dispatchInstantPremiumWorkerMerge(projectId, {
          force,
        });
        if (!dispatched.ok) {
          return;
        }
        if (dispatched.status !== "completed") {
          await runFinalExportToCompletion(projectId, { force }).catch((error) => {
            console.warn("[hc-instant-premium]", {
              projectId,
              phase: "merge_completion_poll_failed",
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFinalMergeDispatchFailed(projectId, message).catch(() => undefined);
      }
    };

    // Prefer Next.js after() so work survives GET /status response completion.
    // Fall back to detached promise only when after() is unavailable (non-request contexts).
    try {
      after(runDispatch);
    } catch {
      void runDispatch();
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
