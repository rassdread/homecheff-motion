import { prisma } from "@/lib/prisma";
import { parseLockedTextLayersJson } from "@/lib/locked-text-layer";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import {
  requestWorkerRetryOverlay,
  triggerWorkerInstantPremiumProcess,
} from "@/lib/video-worker-client";
import {
  pollProjectJobs,
  startQueuedSegmentsWithoutJob,
} from "@/server/animation-jobs/service";
import { executeInstantPremiumMerge } from "@/server/instant-premium/merge-instant-project";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";

export { refreshTransitionOutputsFromProvider };

type InstantSegmentStatus = "queued" | "generating" | "completed" | "failed";

export type InstantPremiumStatusResponse = {
  projectId: string;
  projectType: "instant_premium";
  status: "queued" | "running" | "finalizing" | "completed" | "failed";
  phase: "generating_clips" | "merging_clips" | "uploading_final" | "completed" | "failed";
  progressPercent: number;
  segments: Array<{
    index: number;
    status: InstantSegmentStatus;
    sourceImageId: string;
    sourceImageUrl: string | null;
    videoUrl: string | null;
    durationSeconds: number | null;
    providerTaskId: string | null;
    error: string | null;
  }>;
  finalVideoUrl: string | null;
  finalDurationSeconds: number | null;
  downloadable: boolean;
  errorMessage: string | null;
  missingSegments?: number[];
  queuedWithoutJobCount?: number;
  lockedTextMode?: boolean;
  lockedTextLayerCount?: number;
  overlayFailed?: boolean;
  canRetryOverlay?: boolean;
  failureReason?: "overlay_failed" | "merge_failed" | null;
  workerJobStatus?: string | null;
};

function mapTransitionStatus(status: string): InstantSegmentStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "generating" || status === "rendering" || status === "processing") {
    return "generating";
  }
  return "queued";
}

async function orchestrateInstantPremiumMerge(
  projectId: string,
  options?: { force?: boolean }
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
    triggerWorkerInstantPremiumProcess(projectId, options);
    return;
  }
  await executeInstantPremiumMerge(projectId, options);
}

type RecoverResult = {
  segmentCount: number;
  completedSegments: number;
  missingSegments: number[];
  mergeStarted: boolean;
  mergeCompleted: boolean;
  finalVideoUrlPresent: boolean;
  duplicateSegments?: number[];
};

function duplicateCompletedSegmentOrders(
  transitions: Array<{ order: number; status: string; outputVideoUrl: string | null }>
): number[] {
  const seen = new Map<string, number>();
  const dupes: number[] = [];
  for (const t of transitions) {
    const url = t.outputVideoUrl?.trim();
    if (t.status !== "completed" || !url) continue;
    if (seen.has(url)) {
      dupes.push(t.order);
    } else {
      seen.set(url, t.order);
    }
  }
  return dupes.sort((a, b) => a - b);
}

export async function recoverExistingInstantProject(
  projectId: string,
  options?: { force?: boolean }
): Promise<RecoverResult> {
  await refreshTransitionOutputsFromProvider(projectId);

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }
  const total = project.transitions.length;
  const completed = project.transitions.filter((t) => t.status === "completed" && t.outputVideoUrl?.trim());
  const missingSegments = project.transitions
    .filter((t) => !(t.status === "completed" && t.outputVideoUrl?.trim()))
    .map((t) => t.order);
  const duplicateSegments = duplicateCompletedSegmentOrders(project.transitions);
  const alreadyFinal = Boolean(project.exports[0]?.status === "completed" && project.exports[0]?.outputVideoUrl);

  if (duplicateSegments.length > 0) {
    return {
      segmentCount: total,
      completedSegments: completed.length,
      missingSegments,
      duplicateSegments,
      mergeStarted: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
    };
  }

  if ((options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0) {
    await orchestrateInstantPremiumMerge(projectId, { force: Boolean(options?.force) });
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" } } },
  });
  const finalVideoUrlPresent = Boolean(
    refreshed?.exports[0]?.status === "completed" && refreshed.exports[0]?.outputVideoUrl
  );
  return {
    segmentCount: total,
    completedSegments: completed.length,
    missingSegments,
    duplicateSegments,
    mergeStarted: (options?.force || !alreadyFinal) && missingSegments.length === 0 && completed.length > 0,
    mergeCompleted: finalVideoUrlPresent,
    finalVideoUrlPresent,
  };
}

export async function retryInstantPremiumMerge(projectId: string): Promise<void> {
  const p = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      projectType: true,
      stylePreset: true,
      instantOutputDurationSeconds: true,
      instantSelectedChips: true,
      instantUserIntent: true,
    },
  });
  if (!p || !isInstantLikeProject(p)) {
    throw new Error("Instant Premium project not found.");
  }
  await orchestrateInstantPremiumMerge(projectId, { force: true });
}

export async function retryInstantPremiumOverlay(projectId: string): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { transitions: { orderBy: { order: "asc" } } },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }
  const completed = project.transitions.filter(
    (t) => t.status === "completed" && t.outputVideoUrl?.trim()
  );
  if (completed.length !== project.transitions.length || completed.length === 0) {
    throw new Error("Provider clips are not ready yet.");
  }
  if (isVideoRenderWorkerMode()) {
    await requestWorkerRetryOverlay(projectId);
    return;
  }
  await executeInstantPremiumMerge(projectId, { force: true });
}

export async function getInstantPremiumStatus(projectId: string): Promise<InstantPremiumStatusResponse> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project || !isInstantLikeProject(project)) {
    throw new Error("Instant Premium project not found.");
  }

  const queuedWithoutJobCount = project.transitions.filter(
    (t) => t.status === "queued" && !t.providerJobId?.trim()
  ).length;
  if (queuedWithoutJobCount > 0) {
    await startQueuedSegmentsWithoutJob(project.id);
  }

  const anyNonTerminalTransition = project.transitions.some(
    (t) => t.status !== "completed" && t.status !== "failed"
  );
  const needsPoll =
    anyNonTerminalTransition ||
    project.status === "queued" ||
    project.status === "generating" ||
    project.status === "rendering";

  if (needsPoll) {
    await refreshTransitionOutputsFromProvider(project.id).catch(() => undefined);
    await pollProjectJobs(project.id).catch(() => undefined);
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!refreshed || !isInstantLikeProject(refreshed)) {
    throw new Error("Instant Premium project not found.");
  }

  const transitionsCompleted =
    refreshed.transitions.length > 0 &&
    refreshed.transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim());

  if (
    transitionsCompleted &&
    refreshed.status !== "completed" &&
    refreshed.status !== "failed_overlay"
  ) {
    await orchestrateInstantPremiumMerge(projectId);
  }

  const finalState = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!finalState || !isInstantLikeProject(finalState)) {
    throw new Error("Instant Premium project not found.");
  }
  const latestExport = finalState.exports[0];
  const imageById = new Map(finalState.images.map((i) => [i.id, i]));
  const segmentDuration = finalState.viduDurationSeconds ?? null;
  const segments = finalState.transitions.map((t) => {
    const source = imageById.get(t.startImageId);
    return {
      index: t.order,
      status: mapTransitionStatus(t.status),
      sourceImageId: t.startImageId,
      sourceImageUrl: source?.previewUrl ?? null,
      videoUrl: t.outputVideoUrl,
      durationSeconds: segmentDuration,
      providerTaskId: t.providerJobId,
      error: t.errorMessage,
    };
  });

  const averageTransitions =
    finalState.transitions.length > 0
      ? Math.round(
          finalState.transitions.reduce((acc, tr) => acc + (tr.progress ?? 0), 0) /
            finalState.transitions.length
        )
      : 0;
  const progressPercent =
    finalState.status === "completed"
      ? 100
      : finalState.status === "failed" || finalState.status === "failed_overlay"
        ? Math.max(0, latestExport?.progress ?? averageTransitions)
        : finalState.status === "rendering"
          ? Math.max(55, latestExport?.progress ?? 55)
          : Math.max(5, averageTransitions);
  const overlayFailed =
    finalState.status === "failed_overlay" || latestExport?.status === "failed_overlay";
  const phase: InstantPremiumStatusResponse["phase"] =
    overlayFailed || finalState.status === "failed"
      ? "failed"
      : finalState.status === "completed"
        ? "completed"
        : finalState.status === "rendering"
          ? latestExport?.progress && latestExport.progress >= 85
            ? "uploading_final"
            : "merging_clips"
          : "generating_clips";
  const status: InstantPremiumStatusResponse["status"] =
    overlayFailed || finalState.status === "failed"
      ? "failed"
      : finalState.status === "completed"
        ? "completed"
        : finalState.status === "rendering"
          ? "finalizing"
          : "running";

  const finalVideoUrl = latestExport?.status === "completed" ? latestExport.outputVideoUrl ?? null : null;
  const lockedLayers = parseLockedTextLayersJson(finalState.instantLockedTextLayers);
  const segmentsAllCompleted =
    finalState.transitions.length > 0 &&
    finalState.transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim());
  const failureReason =
    finalState.failureReason === "overlay_failed" || finalState.failureReason === "merge_failed"
      ? finalState.failureReason
      : overlayFailed
        ? "overlay_failed"
        : finalState.status === "failed"
          ? "merge_failed"
          : null;
  return {
    projectId: finalState.id,
    projectType: "instant_premium",
    status,
    phase,
    progressPercent,
    segments,
    finalVideoUrl,
    lockedTextMode: finalState.instantLockedTextMode,
    lockedTextLayerCount: lockedLayers.length,
    finalDurationSeconds:
      finalState.transitions.length > 0 && segmentDuration
        ? finalState.transitions.length * segmentDuration
        : null,
    downloadable: Boolean(finalVideoUrl),
    errorMessage:
      (overlayFailed ? finalState.lastOverlayError : null) ??
      latestExport?.errorMessage ??
      finalState.transitions.find((t) => t.status === "failed")?.errorMessage ??
      null,
    overlayFailed,
    canRetryOverlay: overlayFailed && segmentsAllCompleted,
    failureReason,
    workerJobStatus: finalState.instantWorkerJobStatus,
    missingSegments: finalState.transitions
      .filter((t) => !(t.status === "completed" && t.outputVideoUrl?.trim()))
      .map((t) => t.order),
    queuedWithoutJobCount: finalState.transitions.filter(
      (t) => t.status === "queued" && !t.providerJobId?.trim()
    ).length,
  };
}
