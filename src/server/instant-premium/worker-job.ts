import { prisma } from "@/lib/prisma";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { executeInstantPremiumMerge } from "@/server/instant-premium/merge-instant-project";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { isWorkerJobStuck } from "@/server/instant-premium/finalize-repair";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";

export type WorkerJobResult = {
  ok: boolean;
  projectId: string;
  status: string;
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

async function loadProject(projectId: string) {
  return prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
}

/** Idempotent worker job: poll Vidu, merge, overlay, upload.final */
export async function runInstantPremiumWorkerProcess(
  projectId: string,
  options?: { force?: boolean }
): Promise<WorkerJobResult> {
  const project = await loadProject(projectId);
  if (!project || !isInstantLikeProject(project)) {
    return { ok: false, projectId, status: "not_found", message: "Project not found." };
  }

  const latestExport = project.exports[0];
  if (
    !options?.force &&
    project.status === "completed" &&
    latestExport?.status === "completed" &&
    latestExport.outputVideoUrl
  ) {
    return { ok: true, projectId, status: "completed" };
  }

  if (
    !options?.force &&
    project.instantWorkerJobStatus === "running" &&
    project.status === "rendering" &&
    !isWorkerJobStuck(project)
  ) {
    return { ok: true, projectId, status: "running" };
  }

  if (
    !options?.force &&
    project.status === "failed_overlay" &&
    project.failureReason === "overlay_failed"
  ) {
    return {
      ok: false,
      projectId,
      status: "failed_overlay",
      message: "Use retry-overlay for overlay failures.",
    };
  }

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantWorkerJobStatus: "queued",
      instantWorkerJobStartedAt: new Date(),
    },
  });

  await refreshTransitionOutputsFromProvider(projectId).catch(() => undefined);
  await pollProjectJobs(projectId).catch(() => undefined);

  const refreshed = await loadProject(projectId);
  if (!refreshed) {
    return { ok: false, projectId, status: "not_found", message: "Project not found." };
  }

  if (!transitionsAllCompleted(refreshed.transitions)) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { instantWorkerJobStatus: "queued" },
    });
    return {
      ok: true,
      projectId,
      status: "waiting_clips",
      message: "Provider clips are not all completed yet.",
    };
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

  await executeInstantPremiumMerge(projectId, { force: options?.force });

  const final = await loadProject(projectId);
  if (final?.status === "completed" && final.exports[0]?.status === "completed") {
    return { ok: true, projectId, status: "completed" };
  }
  if (final?.status === "failed_overlay") {
    return { ok: false, projectId, status: "failed_overlay" };
  }
  if (final?.status === "failed") {
    return { ok: false, projectId, status: "failed" };
  }
  return { ok: true, projectId, status: final?.instantWorkerJobStatus ?? "running" };
}

export async function runInstantPremiumWorkerRetryOverlay(
  projectId: string
): Promise<WorkerJobResult> {
  const project = await loadProject(projectId);
  if (!project || !isInstantLikeProject(project)) {
    return { ok: false, projectId, status: "not_found", message: "Project not found." };
  }
  if (!transitionsAllCompleted(project.transitions)) {
    return {
      ok: false,
      projectId,
      status: "waiting_clips",
      message: "Provider clips are not ready yet.",
    };
  }
  await executeInstantPremiumMerge(projectId, { force: true });
  const final = await loadProject(projectId);
  if (final?.status === "completed") {
    return { ok: true, projectId, status: "completed" };
  }
  if (final?.status === "failed_overlay") {
    return { ok: false, projectId, status: "failed_overlay" };
  }
  return { ok: false, projectId, status: final?.status ?? "failed" };
}
