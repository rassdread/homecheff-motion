import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import {
  clearVideoRepairAudit,
  mergeVideoRepairAudit,
  readVideoRepairAudit,
} from "@/lib/instant-video-repair";

/** Keep videoRepair audit aligned with export completion while repair runs in background. */
export async function reconcileVideoRepairState(projectId: string): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      instantFinalRebuildAuditJson: true,
      failureReason: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          outputVideoUrl: true,
          errorMessage: true,
          progress: true,
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

  const exportRow = project.exports[0];
  const exportCompleted = isInstantPremiumExportCompleted(
    project.status,
    exportRow?.status,
    exportRow?.outputVideoUrl
  );

  if (exportCompleted) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        instantFinalRebuildAuditJson:
          clearVideoRepairAudit(project.instantFinalRebuildAuditJson) as object | undefined,
        instantWorkerJobStatus: "completed",
        failureReason: null,
      },
    });
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
  }
}
