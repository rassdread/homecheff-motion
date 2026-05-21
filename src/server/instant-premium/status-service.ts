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
import { resolveLatestExportPlaybackUrl } from "@/lib/playback-url-resolution";
import {
  resolveExportFailureDiagnostics,
  userSafeExportFailureKey,
} from "@/lib/instant-premium-export-failure";
import { resolveInstantPremiumProgress } from "@/lib/instant-premium-progress-stage";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/instant-premium-provider-sync";
import { reconcilePlayableProjectCompletion } from "@/server/animation-projects/reconcile-project-completion";
import { parseInstantSegmentErrorCode } from "@/lib/instant-segment-error-code";
import { readPendingSegmentRetryOrder } from "@/server/instant-premium/retry-segment";

export { refreshTransitionOutputsFromProvider };

type InstantSegmentStatus = "queued" | "generating" | "completed" | "failed";

export type { InstantPremiumStatusResponse } from "@/types/animation-api";

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

async function clearPendingSegmentRetryIfDone(
  projectId: string,
  audit: unknown,
  transitions: Array<{ order: number; status: string }>
): Promise<void> {
  const pendingOrder = readPendingSegmentRetryOrder(audit);
  if (pendingOrder == null) {
    return;
  }
  const pending = transitions.find((t) => t.order === pendingOrder);
  if (!pending || pending.status === "completed" || pending.status === "failed") {
    const auditBase =
      audit && typeof audit === "object" && !Array.isArray(audit)
        ? (audit as Record<string, unknown>)
        : {};
    const rest = { ...auditBase };
    delete rest.pendingSegmentRetry;
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        instantFinalRebuildAuditJson:
          Object.keys(rest).length > 0 ? (rest as object) : undefined,
      },
    });
  }
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

  await reconcilePlayableProjectCompletion(projectId);

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

  await clearPendingSegmentRetryIfDone(
    projectId,
    finalState.instantFinalRebuildAuditJson,
    finalState.transitions
  );

  const stateAfterRetryClear = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  });
  const projectState = stateAfterRetryClear && isInstantLikeProject(stateAfterRetryClear)
    ? stateAfterRetryClear
    : finalState;

  const latestExport = projectState.exports[0];
  const imageById = new Map(projectState.images.map((i) => [i.id, i]));
  const segmentDuration = projectState.viduDurationSeconds ?? null;
  const pendingSegmentRetryOrder = readPendingSegmentRetryOrder(
    projectState.instantFinalRebuildAuditJson
  );
  const segments = projectState.transitions.map((t) => {
    const source = imageById.get(t.startImageId);
    const mappedStatus = mapTransitionStatus(t.status);
    const isPendingRetry =
      pendingSegmentRetryOrder === t.order &&
      (mappedStatus === "generating" || mappedStatus === "queued");
    return {
      index: t.order,
      status: mappedStatus,
      sourceImageId: t.startImageId,
      sourceImageUrl: source?.previewUrl ?? null,
      videoUrl: t.outputVideoUrl,
      durationSeconds: segmentDuration,
      providerTaskId: t.providerJobId,
      error: t.errorMessage,
      errorCode: parseInstantSegmentErrorCode(t.errorMessage),
      canRetry: mappedStatus === "failed" && !isPendingRetry,
    };
  });

  const averageTransitions =
    projectState.transitions.length > 0
      ? Math.round(
          projectState.transitions.reduce((acc, tr) => acc + (tr.progress ?? 0), 0) /
            projectState.transitions.length
        )
      : 0;
  let progressPercent =
    projectState.status === "completed"
      ? 100
      : projectState.status === "failed" || projectState.status === "failed_overlay"
        ? Math.max(0, latestExport?.progress ?? averageTransitions)
        : projectState.status === "rendering"
          ? Math.max(55, latestExport?.progress ?? 55)
          : Math.max(5, averageTransitions);
  const overlayFailed =
    projectState.status === "failed_overlay" || latestExport?.status === "failed_overlay";
  const finalRebuildFailed = projectState.instantFinalRebuildStatus === "failed";
  const exportFailureDiagnostics = resolveExportFailureDiagnostics({
    projectId: projectState.id,
    projectStatus: projectState.status,
    failureReason:
      projectState.failureReason === "overlay_failed" ||
      projectState.failureReason === "merge_failed" ||
      projectState.failureReason === "export_upload_auth_failed"
        ? projectState.failureReason
        : null,
    overlayFailed,
    instantFinalRebuildStatus: projectState.instantFinalRebuildStatus,
    instantWorkerJobStatus: projectState.instantWorkerJobStatus,
    lastOverlayError: projectState.lastOverlayError,
    export: latestExport
      ? {
          id: latestExport.id,
          status: latestExport.status,
          progress: latestExport.progress,
          errorMessage: latestExport.errorMessage,
          provider: latestExport.provider,
        }
      : null,
  });
  const exportFailed = Boolean(exportFailureDiagnostics?.isExportFailure);
  let phase: InstantPremiumStatusResponse["phase"] =
    exportFailed || overlayFailed || projectState.status === "failed"
      ? "failed"
      : projectState.status === "completed" && !finalRebuildFailed
        ? "completed"
        : projectState.status === "rendering"
          ? latestExport?.progress && latestExport.progress >= 85
            ? "uploading_final"
            : "merging_clips"
          : "generating_clips";
  let status: InstantPremiumStatusResponse["status"] =
    exportFailed || overlayFailed || projectState.status === "failed"
      ? "failed"
      : projectState.status === "completed" && !finalRebuildFailed
        ? "completed"
        : projectState.status === "rendering"
          ? "finalizing"
          : "running";

  const finalVideoUrl = resolveLatestExportPlaybackUrl(projectState, latestExport);
  const lockedLayers = parseLockedTextLayersJson(projectState.instantLockedTextLayers);
  const segmentsAllCompleted =
    projectState.transitions.length > 0 &&
    projectState.transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim());
  const failureReason =
    projectState.failureReason === "overlay_failed" ||
    projectState.failureReason === "merge_failed" ||
    projectState.failureReason === "export_upload_auth_failed"
      ? (projectState.failureReason as InstantPremiumStatusResponse["failureReason"])
      : overlayFailed
        ? "overlay_failed"
        : projectState.status === "failed"
          ? "merge_failed"
          : null;
  const stuckInfo = detectFinalizationStuck(projectState);
  const exportCompleted = isInstantPremiumExportCompleted(
    projectState.status,
    latestExport?.status,
    finalVideoUrl ?? latestExport?.outputVideoUrl
  );
  if (exportCompleted && status !== "failed") {
    status = "completed";
    phase = "completed";
    progressPercent = 100;
  }
  const canRepairFinalVideo =
    segmentsAllCompleted && !exportCompleted && !Boolean(latestExport?.outputVideoUrl?.trim());
  const isRestoringFinalVideo =
    canRepairFinalVideo &&
    (stuckInfo.mergeInProgress ||
      projectState.instantWorkerJobStatus === "queued" ||
      projectState.instantWorkerJobStatus === "running");
  const canRebuildFinalVideo = segmentsAllCompleted;
  const isRebuildingFinalVideo =
    projectState.instantFinalRebuildStatus === "running" ||
    (canRebuildFinalVideo &&
      latestExport?.status === "rendering" &&
      (latestExport?.progress ?? 0) >= 55 &&
      (projectState.instantWorkerJobStatus === "queued" ||
        projectState.instantWorkerJobStatus === "running" ||
        projectState.status === "rendering"));
  const progressView = resolveInstantPremiumProgress({
    status,
    phase,
    progressPercent,
    isRebuildingFinalVideo,
    isRestoringFinalVideo,
    instantTextRenderMode: projectState.instantTextRenderMode,
    overlayFailed,
    exportFailure: exportFailureDiagnostics,
    failureReason,
    exportProgress: latestExport?.progress ?? null,
    exportStatus: latestExport?.status ?? null,
  });
  const exportLastError = exportFailureDiagnostics?.exportLastError ?? null;
  const userExportErrorKey = exportFailed
    ? userSafeExportFailureKey(
        exportFailureDiagnostics?.exportFailureReason ?? failureReason ?? null,
        finalRebuildFailed
      )
    : null;

  const hasFailedSegment = segments.some((s) => s.status === "failed");
  const retryingSegmentIndex =
    pendingSegmentRetryOrder != null &&
    segments.some(
      (s) =>
        s.index === pendingSegmentRetryOrder &&
        (s.status === "generating" || s.status === "queued")
    )
      ? pendingSegmentRetryOrder
      : null;
  const retryingMerge =
    segmentsAllCompleted &&
    (isRestoringFinalVideo ||
      projectState.instantWorkerJobStatus === "queued" ||
      projectState.instantWorkerJobStatus === "running");
  const retryState =
    retryingSegmentIndex != null
      ? ("retrying_segment" as const)
      : retryingMerge
        ? ("retrying_merge" as const)
        : null;
  const segmentsMergeFailed =
    segmentsAllCompleted &&
    !exportCompleted &&
    !Boolean(finalVideoUrl?.trim()) &&
    (exportFailed ||
      projectState.status === "failed" ||
      projectState.status === "failed_overlay" ||
      failureReason === "merge_failed" ||
      canRepairFinalVideo);
  const canRetryMerge =
    segmentsMergeFailed && !retryingMerge && !retryingSegmentIndex && !overlayFailed;

  const partialSegmentFailure =
    hasFailedSegment && segments.some((s) => s.status === "completed") && !segmentsMergeFailed;
  if (partialSegmentFailure && status === "failed" && !exportFailed && !overlayFailed) {
    status = "running";
    phase = "generating_clips";
  }

  return {
    projectId: projectState.id,
    projectType: "instant_premium",
    status,
    phase,
    progressPercent: progressView.displayPercent,
    currentStage: progressView.stage,
    activeOperation: progressView.activeOperation,
    exportProvider: latestExport?.provider ?? null,
    rebuildCount: projectState.instantFinalRebuildCount,
    segmentCount: projectState.transitions.length,
    progressUpdatedAt: new Date().toISOString(),
    instantTextRenderMode: projectState.instantTextRenderMode,
    segments,
    finalVideoUrl,
    lockedTextMode: projectState.instantLockedTextMode,
    lockedTextLayerCount: lockedLayers.length,
    finalDurationSeconds:
      projectState.transitions.length > 0 && segmentDuration
        ? projectState.transitions.length * segmentDuration
        : null,
    downloadable: Boolean(finalVideoUrl),
    errorMessage:
      exportLastError ??
      (overlayFailed ? projectState.lastOverlayError : null) ??
      latestExport?.errorMessage ??
      projectState.transitions.find((t) => t.status === "failed")?.errorMessage ??
      null,
    overlayFailed,
    canRetryOverlay: overlayFailed && segmentsAllCompleted,
    failureReason,
    exportId: exportFailureDiagnostics?.exportId ?? latestExport?.id ?? null,
    exportStatus: exportFailureDiagnostics?.exportStatus ?? latestExport?.status ?? null,
    exportFailureReason: exportFailureDiagnostics?.exportFailureReason ?? failureReason,
    exportLastError,
    workerError: exportFailureDiagnostics?.workerError ?? null,
    failedAtStage: exportFailureDiagnostics?.failedAtStage,
    finalRebuildFailed,
    userExportErrorKey,
    workerJobStatus: projectState.instantWorkerJobStatus,
    missingSegments: projectState.transitions
      .filter((t) => !(t.status === "completed" && t.outputVideoUrl?.trim()))
      .map((t) => t.order),
    queuedWithoutJobCount: projectState.transitions.filter(
      (t) => t.status === "queued" && !t.providerJobId?.trim()
    ).length,
    finalizationStuck: stuckInfo.isStuck,
    canRepairFinalVideo,
    isRestoringFinalVideo,
    canRebuildFinalVideo,
    isRebuildingFinalVideo,
    retryState,
    retryingSegmentIndex,
    segmentsMergeFailed,
    canRetryMerge,
    hasFailedSegment,
  };
}
