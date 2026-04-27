import { EXPORT_CANCELLED_BY_USER_MESSAGE } from "@/lib/animation-export-messages";
import { prisma } from "@/lib/prisma";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { toProjectSnapshotResponse } from "@/server/animation-projects/project-snapshot";

export { EXPORT_CANCELLED_BY_USER_MESSAGE } from "@/lib/animation-export-messages";

function isCancellableProjectStatus(status: string): boolean {
  return status === "rendering" || status === "generating";
}

function isCancellableExportStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "idle" || s === "queued" || s === "rendering" || s === "processing";
}

/**
 * Marks the latest in-progress export as failed and sets the project to `failed`
 * so export polling will not auto-restart merge (poll only runs while project is `rendering`).
 */
export async function cancelInProgressAnimationExport(projectId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.animationProject.findUnique({
      where: { id: projectId },
      select: { id: true, status: true },
    });
    if (!project) {
      return { kind: "not_found" as const };
    }

    const latestExport = await tx.animationExport.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (
      project.status === "failed" &&
      latestExport?.status === "failed" &&
      latestExport.errorMessage === EXPORT_CANCELLED_BY_USER_MESSAGE
    ) {
      return { kind: "already_cancelled" as const };
    }

    if (project.status === "failed") {
      return { kind: "already_failed" as const };
    }

    if (!isCancellableProjectStatus(project.status)) {
      return { kind: "bad_state" as const, detail: "Project is not in a cancellable export phase." };
    }

    if (!latestExport) {
      return { kind: "bad_state" as const, detail: "No export record to cancel." };
    }

    if (!isCancellableExportStatus(latestExport.status)) {
      return {
        kind: "bad_state" as const,
        detail: "Export is not in progress (already completed or failed).",
      };
    }

    await tx.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "failed",
        progress: 0,
        errorMessage: EXPORT_CANCELLED_BY_USER_MESSAGE,
        outputVideoUrl: null,
        providerJobId: null,
      },
    });

    await tx.animationProject.update({
      where: { id: projectId },
      data: { status: "failed" },
    });

    return { kind: "ok" as const };
  });

  if (result.kind === "not_found") {
    throw new Error("Project not found.");
  }
  if (result.kind === "bad_state") {
    throw new Error(result.detail);
  }
  if (result.kind === "already_failed") {
    throw new Error("Project already failed; export cannot be cancelled.");
  }

  const fresh = await getAnimationProjectById(projectId);
  if (!fresh) {
    throw new Error("Project not found.");
  }
  return toProjectSnapshotResponse(fresh);
}
