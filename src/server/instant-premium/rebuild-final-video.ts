import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { normalizeTextRenderMode } from "@/lib/hybrid-motion-overlay";
import {
  appendFinalVideoRebuildAudit,
  type FinalVideoRebuildAuditEvent,
} from "@/lib/final-video-storage";
import {
  parsePosterMotionSettings,
  resolvePosterMotionBlendStrength,
} from "@/lib/poster-motion-preserve";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { orchestrateFinalMerge } from "@/server/instant-premium/finalize-repair";
import {
  logFinalVideoRebuildAudit,
  markInstantPremiumFinalRebuildFailed,
} from "@/server/instant-premium/final-video-export-commit";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { resolveFinalAssemblyMode } from "@/server/instant-premium/final-assembly";
import { resolveSegmentTransitionType } from "@/server/instant-premium/segment-transition";

export const REBUILD_FINAL_EXPORT_PROGRESS = 70;
export const REBUILD_SEGMENTS_MISSING = "REBUILD_SEGMENTS_MISSING";
export { MERGE_SEGMENTS_MISSING } from "@/server/instant-premium/merge-segments";
export const REBUILD_ALREADY_RUNNING = "REBUILD_ALREADY_RUNNING";

export type RebuildFinalVideoResult = {
  ok: boolean;
  code?: string;
  projectId: string;
  clipsReady: boolean;
  mergeTriggered: boolean;
  mergeCompleted: boolean;
  finalVideoUrlPresent: boolean;
  segmentCount: number;
  textRenderMode: string;
  blendStrength: number;
  rebuildCount?: number;
  message?: string;
  suggestRepair?: boolean;
  suggestFullRerender?: boolean;
};

function transitionsAllCompleted(
  transitions: Array<{ status: string; outputVideoUrl: string | null }>
): boolean {
  return (
    transitions.length > 0 &&
    transitions.every((t) => t.status === "completed" && t.outputVideoUrl?.trim())
  );
}

function logRebuildFinalVideo(data: Record<string, unknown>): void {
  console.info("[rebuild-final-video]", data);
}

/**
 * Re-merge existing segment videos and re-run compositor/overlays/upload.
 * Does not call Vidu or refresh provider jobs.
 */
export async function rebuildInstantPremiumFinalVideo(
  projectId: string
): Promise<RebuildFinalVideoResult> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
      images: { orderBy: { order: "asc" } },
    },
  });

  if (!project || !isInstantLikeProject(project)) {
    return {
      ok: false,
      projectId,
      clipsReady: false,
      mergeTriggered: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
      segmentCount: 0,
      textRenderMode: "poster_motion_preserve",
      blendStrength: 0,
      message: "Instant Premium project not found.",
    };
  }

  const segmentCount = project.transitions.length;
  const textRenderMode = normalizeTextRenderMode(project.instantTextRenderMode);
  const finalAssemblyMode = resolveFinalAssemblyMode(
    textRenderMode,
    project.instantPosterMotionSettings
  );
  const segmentTransitionType = resolveSegmentTransitionType(project.instantPosterMotionSettings);
  const blendStrength = resolvePosterMotionBlendStrength(
    parsePosterMotionSettings(project.instantPosterMotionSettings)
  );

  const clipsReady = transitionsAllCompleted(project.transitions);
  if (!clipsReady) {
    logRebuildFinalVideo({
      projectId,
      segmentCount,
      mode: textRenderMode,
      finalAssemblyMode,
      segmentTransitionType,
      blendStrength,
      clipsReady: false,
    });
    return {
      ok: false,
      code: REBUILD_SEGMENTS_MISSING,
      projectId,
      clipsReady: false,
      mergeTriggered: false,
      mergeCompleted: false,
      finalVideoUrlPresent: false,
      segmentCount,
      textRenderMode,
      blendStrength,
      message: "Not all segment videos are ready. Use repair or full rerender.",
      suggestRepair: true,
      suggestFullRerender: true,
    };
  }

  if (project.instantFinalRebuildStatus === "running") {
    return {
      ok: false,
      code: REBUILD_ALREADY_RUNNING,
      projectId,
      clipsReady: true,
      mergeTriggered: false,
      mergeCompleted: false,
      finalVideoUrlPresent: Boolean(project.exports[0]?.outputVideoUrl?.trim()),
      segmentCount,
      textRenderMode,
      blendStrength,
      message: "Final video rebuild is already in progress.",
    };
  }

  const latestExport = project.exports[0];
  const previousFinalUrl = latestExport?.outputVideoUrl?.trim() ?? null;
  const nextRebuildCount = project.instantFinalRebuildCount + 1;
  const startedAt = new Date();
  const startedAudit: FinalVideoRebuildAuditEvent = {
    type: "final_video_rebuild",
    billingImpact: "none",
    aiCreditsUsed: 0,
    provider: "internal_merge",
    source: "existing_segments",
    rebuildType: "merge_only",
    usedExistingSegments: true,
    newProviderJobsCreated: false,
    estimatedAdditionalAiCost: 0,
    projectId,
    segmentCount,
    rebuildCount: nextRebuildCount,
    previousFinalVideoUrl: previousFinalUrl,
    newFinalVideoUrl: null,
    recordedAt: startedAt.toISOString(),
    status: "started",
  };

  logRebuildFinalVideo({
    projectId,
    segmentCount,
    mode: textRenderMode,
    finalAssemblyMode,
    segmentTransitionType,
    blendStrength,
    clipsReady: true,
    workerMode: isVideoRenderWorkerMode(),
    rebuildCount: nextRebuildCount,
  });
  logFinalVideoRebuildAudit(startedAudit);

  if (latestExport) {
    await prisma.animationExport.update({
      where: { id: latestExport.id },
      data: {
        status: "rendering",
        progress: REBUILD_FINAL_EXPORT_PROGRESS,
        errorMessage: null,
      },
    });
  } else {
    await prisma.animationExport.create({
      data: {
        projectId,
        status: "rendering",
        progress: REBUILD_FINAL_EXPORT_PROGRESS,
        provider: isVideoRenderWorkerMode() ? "instant-video-worker" : "instant-local-ffmpeg",
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
      instantWorkerJobStartedAt: startedAt,
      instantFinalRebuildStatus: "running",
      instantPreviousFinalVideoUrl: previousFinalUrl,
      instantFinalRebuildAuditJson: appendFinalVideoRebuildAudit(
        project.instantFinalRebuildAuditJson,
        startedAudit
      ) as object,
    },
  });

  try {
    await orchestrateFinalMerge(projectId, { force: true, awaitWorker: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rebuild final video failed.";
    logRebuildFinalVideo({ projectId, segmentCount, mode: textRenderMode, blendStrength, error: message });
    const exportAfter = await prisma.animationExport.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    if (exportAfter && previousFinalUrl) {
      await markInstantPremiumFinalRebuildFailed({
        projectId,
        exportId: exportAfter.id,
        previousFinalUrl,
        segmentCount,
        rebuildCount: nextRebuildCount,
        message,
      });
    } else {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { instantFinalRebuildStatus: "failed" },
      });
    }
    return {
      ok: false,
      projectId,
      clipsReady: true,
      mergeTriggered: true,
      mergeCompleted: false,
      finalVideoUrlPresent: Boolean(previousFinalUrl),
      segmentCount,
      textRenderMode,
      blendStrength,
      rebuildCount: project.instantFinalRebuildCount,
      message,
    };
  }

  const refreshed = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" } } },
  });
  const finalExport = refreshed?.exports[0];
  const mergeCompleted = isInstantPremiumExportCompleted(
    refreshed?.status ?? "",
    finalExport?.status
  );
  const finalVideoUrlPresent = Boolean(finalExport?.outputVideoUrl?.trim());
  const rebuildFailed = refreshed?.instantFinalRebuildStatus === "failed";

  logRebuildFinalVideo({
    projectId,
    segmentCount,
    mode: textRenderMode,
    blendStrength,
    mergeCompleted,
    finalVideoUrlPresent,
    finalVideoUrl: finalExport?.outputVideoUrl ?? null,
    rebuildCount: refreshed?.instantFinalRebuildCount,
  });

  return {
    ok: mergeCompleted && finalVideoUrlPresent && !rebuildFailed,
    projectId,
    clipsReady: true,
    mergeTriggered: true,
    mergeCompleted,
    finalVideoUrlPresent,
    segmentCount,
    textRenderMode,
    blendStrength,
    rebuildCount: refreshed?.instantFinalRebuildCount,
    message:
      rebuildFailed
        ? "Final video rebuild failed. Your previous final video is still available."
        : mergeCompleted && finalVideoUrlPresent
          ? undefined
          : "Rebuild started but final video is not ready yet. Refresh status shortly.",
  };
}
