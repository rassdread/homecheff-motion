import { prisma } from "@/lib/prisma";
import {
  isExplicitProjectFailure,
  isProjectPlayablyComplete,
} from "@/lib/project-display-status";

export type ReconcileProjectCompletionResult = "updated" | "unchanged" | "skipped";

/**
 * Promote project + latest export to completed when a playable final URL exists
 * but DB rows were left in rendering/generating.
 */
export async function reconcilePlayableProjectCompletion(
  projectId: string
): Promise<ReconcileProjectCompletionResult> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) {
    return "skipped";
  }

  const latestExport = project.exports[0];
  const outputVideoUrl = latestExport?.outputVideoUrl?.trim() ?? null;
  if (
    !isProjectPlayablyComplete({
      projectStatus: project.status,
      exportStatus: latestExport?.status,
      outputVideoUrl,
    })
  ) {
    return "unchanged";
  }

  if (isExplicitProjectFailure(project.status, latestExport?.status)) {
    return "unchanged";
  }

  const projectDone = project.status === "completed";
  const exportDone = latestExport?.status === "completed";
  if (projectDone && exportDone) {
    return "unchanged";
  }

  await prisma.$transaction(async (tx) => {
    if (latestExport && !exportDone) {
      await tx.animationExport.update({
        where: { id: latestExport.id },
        data: {
          status: "completed",
          progress: 100,
          errorMessage: null,
        },
      });
    }
    if (!projectDone) {
      await tx.animationProject.update({
        where: { id: projectId },
        data: {
          status: "completed",
          lastOverlayError: null,
          failureReason: null,
          instantWorkerJobStatus:
            project.instantWorkerJobStatus === "running" ||
            project.instantWorkerJobStatus === "queued"
              ? "completed"
              : project.instantWorkerJobStatus,
        },
      });
    }
  });

  console.info("[project-completion]", {
    projectId,
    action: "reconciled_playable_complete",
    previousProjectStatus: project.status,
    previousExportStatus: latestExport?.status ?? null,
  });

  return "updated";
}
