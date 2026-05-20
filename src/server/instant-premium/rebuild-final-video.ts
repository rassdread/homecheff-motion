import { prisma } from "@/lib/prisma";
import { isInstantPremiumExportCompleted } from "@/lib/instant-premium-export-status";
import { normalizeTextRenderMode } from "@/lib/hybrid-motion-overlay";
import {
  parsePosterMotionSettings,
  resolvePosterMotionBlendStrength,
} from "@/lib/poster-motion-preserve";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { orchestrateFinalMerge } from "@/server/instant-premium/finalize-repair";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";

export const REBUILD_FINAL_EXPORT_PROGRESS = 70;

export type RebuildFinalVideoResult = {
  ok: boolean;
  projectId: string;
  clipsReady: boolean;
  mergeTriggered: boolean;
  mergeCompleted: boolean;
  finalVideoUrlPresent: boolean;
  segmentCount: number;
  textRenderMode: string;
  blendStrength: number;
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
  const blendStrength = resolvePosterMotionBlendStrength(
    parsePosterMotionSettings(project.instantPosterMotionSettings)
  );

  const clipsReady = transitionsAllCompleted(project.transitions);
  if (!clipsReady) {
    logRebuildFinalVideo({
      projectId,
      segmentCount,
      mode: textRenderMode,
      blendStrength,
      clipsReady: false,
    });
    return {
      ok: false,
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

  logRebuildFinalVideo({
    projectId,
    segmentCount,
    mode: textRenderMode,
    blendStrength,
    clipsReady: true,
    workerMode: isVideoRenderWorkerMode(),
  });

  const latestExport = project.exports[0];
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
      instantWorkerJobStartedAt: new Date(),
    },
  });

  try {
    await orchestrateFinalMerge(projectId, { force: true, awaitWorker: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rebuild final video failed.";
    logRebuildFinalVideo({ projectId, segmentCount, mode: textRenderMode, blendStrength, error: message });
    return {
      ok: false,
      projectId,
      clipsReady: true,
      mergeTriggered: true,
      mergeCompleted: false,
      finalVideoUrlPresent: Boolean(latestExport?.outputVideoUrl?.trim()),
      segmentCount,
      textRenderMode,
      blendStrength,
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

  logRebuildFinalVideo({
    projectId,
    segmentCount,
    mode: textRenderMode,
    blendStrength,
    mergeCompleted,
    finalVideoUrlPresent,
    finalVideoUrl: finalExport?.outputVideoUrl ?? null,
  });

  return {
    ok: mergeCompleted && finalVideoUrlPresent,
    projectId,
    clipsReady: true,
    mergeTriggered: true,
    mergeCompleted,
    finalVideoUrlPresent,
    segmentCount,
    textRenderMode,
    blendStrength,
    message:
      mergeCompleted && finalVideoUrlPresent
        ? undefined
        : "Rebuild started but final video is not ready yet. Refresh status shortly.",
  };
}
