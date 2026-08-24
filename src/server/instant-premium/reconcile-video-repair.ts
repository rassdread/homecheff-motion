import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import {
  clearVideoRepairAudit,
  mergeVideoRepairAudit,
  readVideoRepairAudit,
} from "@/lib/instant-video-repair";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import {
  clipsReadyForFinalizeRepair,
  dispatchInstantPremiumWorkerMerge,
  isExportMergeStuck,
  REPAIR_WORKER_DISPATCH_STALE_MS,
} from "@/server/instant-premium/finalize-repair";
import { canMarkVideoRepairCompleted } from "@/server/instant-premium/start-instant-video-repair";

/** Keep videoRepair audit aligned with export completion while repair runs in background. */
export async function reconcileVideoRepairState(projectId: string): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      instantFinalRebuildAuditJson: true,
      failureReason: true,
      instantWorkerJobStatus: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          outputVideoUrl: true,
          errorMessage: true,
          progress: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!project) {
    return;
  }

  const audit = readVideoRepairAudit(project.instantFinalRebuildAuditJson);
  if (!audit || audit.status !== "running") {
    return;
  }

  const repairStartedMs = Date.parse(audit.startedAt);
  const repairStale =
    Number.isFinite(repairStartedMs) &&
    Date.now() - repairStartedMs >= REPAIR_WORKER_DISPATCH_STALE_MS;

  const exportRow = project.exports[0];
  const exportCompleted = isInstantPremiumExportCompleted(
    project.status,
    exportRow?.status,
    exportRow?.outputVideoUrl
  );

  if (exportCompleted) {
    const outputsAligned = await canMarkVideoRepairCompleted(projectId);
    if (outputsAligned) {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: {
          instantFinalRebuildAuditJson:
            clearVideoRepairAudit(project.instantFinalRebuildAuditJson) as object | undefined,
          instantWorkerJobStatus: "completed",
          failureReason: null,
        },
      });
    } else {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: {
          instantFinalRebuildAuditJson: mergeVideoRepairAudit(project.instantFinalRebuildAuditJson, {
            status: "failed",
            stage: "failed",
            errorCode: "repair_output_mismatch",
            errorMessage:
              "Repair finished but final/clean outputs do not match the latest segment clips.",
            updatedAt: new Date().toISOString(),
          }) as object,
          instantWorkerJobStatus: "failed",
          failureReason: "merge_failed",
        },
      });
    }
    return;
  }

  const exportFailed =
    project.status === "failed" ||
    project.status === "failed_overlay" ||
    exportRow?.status === "failed" ||
    exportRow?.status === "failed_overlay";

  if (exportFailed) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        instantFinalRebuildAuditJson: mergeVideoRepairAudit(project.instantFinalRebuildAuditJson, {
          status: "failed",
          stage: "failed",
          errorCode: project.failureReason ?? "merge_failed",
          errorMessage:
            exportRow?.errorMessage?.trim() ?? "Repair failed during final export.",
          updatedAt: new Date().toISOString(),
        }) as object,
        instantWorkerJobStatus: "failed",
      },
    });
    return;
  }

  const fullProject = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { transitions: { orderBy: { order: "asc" } } },
  });
  const clipsReady = fullProject
    ? clipsReadyForFinalizeRepair(fullProject.instantMode, fullProject.transitions)
    : false;

  const exportStuck =
    exportRow?.status === "rendering" &&
    isExportMergeStuck({
      status: exportRow.status,
      progress: exportRow.progress ?? 0,
      updatedAt: exportRow.updatedAt ?? new Date(0),
    });

  const workerNeedsRedispatch =
    project.instantWorkerJobStatus === "queued" ||
    (project.instantWorkerJobStatus === "running" &&
      (exportStuck ||
        (!exportRow?.outputVideoUrl?.trim() &&
          (exportRow?.status === "pending" ||
            exportRow?.status === "queued" ||
            (exportRow?.progress ?? 0) === 0))));

  if (repairStale && clipsReady && workerNeedsRedispatch && isVideoRenderWorkerMode()) {
    console.info("[instant-video-repair]", {
      phase: exportStuck ? "stale_running_redispatch" : "stale_queued_redispatch",
      projectId,
      repairStartedAt: audit.startedAt,
      workerStatus: project.instantWorkerJobStatus,
      exportProgress: exportRow?.progress ?? null,
      exportStatus: exportRow?.status ?? null,
    });
    void dispatchInstantPremiumWorkerMerge(projectId, { force: true });
  }
}
