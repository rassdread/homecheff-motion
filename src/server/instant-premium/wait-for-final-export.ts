import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import {
  FinalExportTimeoutError,
  logFinalExportTimeout,
  resolveExportTimeoutMs,
  WORKER_POLL_INTERVAL_MS,
} from "@/lib/export-timeout";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { triggerWorkerInstantPremiumProcess } from "@/lib/video-worker-client";
import { executeInstantPremiumMerge } from "@/server/instant-premium/merge-instant-project";
import {
  clearFinalExportStage,
  getFinalExportStage,
  setFinalExportStage,
} from "@/server/instant-premium/final-export-stage";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadExportState(projectId: string) {
  return prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      instantFinalRebuildStatus: true,
      instantWorkerJobStatus: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          outputVideoUrl: true,
          errorMessage: true,
          updatedAt: true,
        },
      },
    },
  });
}

function isExportDone(project: NonNullable<Awaited<ReturnType<typeof loadExportState>>>): boolean {
  const exportRow = project.exports[0];
  return isInstantPremiumExportCompleted(project.status, exportRow?.status) &&
    Boolean(exportRow?.outputVideoUrl?.trim());
}

function isRebuildFailed(project: NonNullable<Awaited<ReturnType<typeof loadExportState>>>): boolean {
  return project.instantFinalRebuildStatus === "failed";
}

/**
 * Run merge to completion without blocking on a long-lived worker HTTP response.
 * Worker mode: dispatch job then poll DB. Local mode: inline merge with export timeout guard.
 */
export async function runFinalExportToCompletion(
  projectId: string,
  options?: { force?: boolean }
): Promise<void> {
  const timeoutMs = resolveExportTimeoutMs();
  const startedAt = Date.now();
  setFinalExportStage(projectId, isVideoRenderWorkerMode() ? "worker_dispatch" : "download_segments");

  try {
    if (isVideoRenderWorkerMode()) {
      setFinalExportStage(projectId, "worker_dispatch");
      triggerWorkerInstantPremiumProcess(projectId, { force: Boolean(options?.force) });
      setFinalExportStage(projectId, "worker_wait");

      while (Date.now() - startedAt < timeoutMs) {
        const project = await loadExportState(projectId);
        if (!project) {
          throw new Error("Instant Premium project not found.");
        }
        if (isExportDone(project)) {
          return;
        }
        if (isRebuildFailed(project)) {
          const msg =
            project.exports[0]?.errorMessage?.trim() ??
            "Final video rebuild failed.";
          throw new Error(msg);
        }
        await sleep(WORKER_POLL_INTERVAL_MS);
      }

      const stage = getFinalExportStage(projectId)?.stage ?? "worker_wait";
      const elapsedMs = Date.now() - startedAt;
      logFinalExportTimeout({
        projectId,
        stage,
        elapsedMs,
        timeoutMs,
        abortSource: "worker_poll_deadline",
        exportId: (await loadExportState(projectId))?.exports[0]?.id,
      });
      throw new FinalExportTimeoutError({
        message: `[${projectId}] Final export timed out after ${elapsedMs}ms (${stage}).`,
        stage,
        elapsedMs,
        timeoutMs,
        abortSource: "worker_poll_deadline",
      });
    }

    await executeInstantPremiumMerge(projectId, { force: options?.force });
    const project = await loadExportState(projectId);
    if (!project) {
      return;
    }
    if (isExportDone(project)) {
      return;
    }
    if (isRebuildFailed(project)) {
      throw new Error(
        project.exports[0]?.errorMessage?.trim() ?? "Final video rebuild failed."
      );
    }
    if (Date.now() - startedAt >= timeoutMs) {
      const stage = getFinalExportStage(projectId)?.stage ?? "finalize";
      const elapsedMs = Date.now() - startedAt;
      logFinalExportTimeout({
        projectId,
        stage,
        elapsedMs,
        timeoutMs,
        abortSource: "local_merge_deadline",
        exportId: project.exports[0]?.id,
      });
      throw new FinalExportTimeoutError({
        message: `[${projectId}] Final export timed out after ${elapsedMs}ms (${stage}).`,
        stage,
        elapsedMs,
        timeoutMs,
        abortSource: "local_merge_deadline",
      });
    }
  } finally {
    clearFinalExportStage(projectId);
  }
}
