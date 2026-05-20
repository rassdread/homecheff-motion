import { prisma } from "@/lib/prisma";
import { parseLockedTextLayersJson } from "@/lib/locked-text-layer";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import {
  pollProjectJobs,
  startQueuedSegmentsWithoutJob,
} from "@/server/animation-jobs/service";
import {
  detectFinalizationStuck,
  orchestrateFinalMerge,
  repairInstantPremiumFinalVideo,
} from "@/server/instant-premium/finalize-repair";
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
  failureReason?: "overlay_failed" | "merge_failed" | "export_upload_auth_failed" | null;
  workerJobStatus?: string | null;
  finalizationStuck?: boolean;
  canRepairFinalVideo?: boolean;
  isRestoringFinalVideo?: boolean;
};

function mapTransitionStatus(status: string): InstantSegmentStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "generating" || status === "rendering" || status === "processing") {
    return "generating";
  }
  return "queued";
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

  let mergeStarted = false;
  let mergeCompleted = alreadyFinal;
  let finalVideoUrlPresent = alreadyFinal;

  if (missingSegments.length === 0 && completed.length > 0 && (options?.force || !alreadyFinal)) {
    const repair = await repairInstantPremiumFinalVideo(projectId, {
      force: Boolean(options?.force),
      source: "recover",
    });
    mergeStarted = repair.workerTriggered;
    mergeCompleted = repair.mergeCompleted && repair.finalVideoUrlPresent;
    finalVideoUrlPresent = repair.finalVideoUrlPresent;
  }

  return {
    segmentCount: total,
    completedSegments: completed.length,
    missingSegments,
    duplicateSegments,
    mergeStarted,
    mergeCompleted,
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
  const repair = await repairInstantPremiumFinalVideo(projectId, {
    force: true,
    source: "merge-retry",
  });
  if (!repair.ok && repair.message) {
    throw new Error(repair.message);
  }
}

export async function retryInstantPremiumOverlay(projectId: string): Promise<void> {
  const repair = await repairInstantPremiumFinalVideo(projectId, {
    force: true,
    source: "retry-overlay",
  });
  if (!repair.clipsReady) {
    throw new Error(repair.message ?? "Provider clips are not ready yet.");
  }
  if (!repair.ok && repair.message) {
    throw new Error(repair.message);
  }
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

  if (transitionsCompleted && refreshed.status !== "completed") {
    const stuckInfo = detectFinalizationStuck(refreshed);
    if (stuckInfo.shouldAutoRepair || refreshed.status === "failed_overlay") {
      void repairInstantPremiumFinalVideo(projectId, {
        force: true,
        source: "status-auto",
      }).catch((error) => {
        console.warn("[finalize-repair] status-auto failed", {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } else if (!stuckInfo.mergeInProgress) {
      await orchestrateFinalMerge(projectId);
    }
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
    finalState.failureReason === "overlay_failed" ||
    finalState.failureReason === "merge_failed" ||
    finalState.failureReason === "export_upload_auth_failed"
      ? (finalState.failureReason as InstantPremiumStatusResponse["failureReason"])
      : overlayFailed
        ? "overlay_failed"
        : finalState.status === "failed"
          ? "merge_failed"
          : null;
  const stuckInfo = detectFinalizationStuck(finalState);
  const exportCompleted = isInstantPremiumExportCompleted(
    finalState.status,
    latestExport?.status
  );
  const canRepairFinalVideo =
    segmentsAllCompleted && !exportCompleted && !Boolean(latestExport?.outputVideoUrl?.trim());
  const isRestoringFinalVideo =
    canRepairFinalVideo &&
    (stuckInfo.mergeInProgress ||
      finalState.instantWorkerJobStatus === "queued" ||
      finalState.instantWorkerJobStatus === "running");
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
    finalizationStuck: stuckInfo.isStuck,
    canRepairFinalVideo,
    isRestoringFinalVideo,
  };
}
