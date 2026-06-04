import { prisma } from "@/lib/prisma";
import {
  isFullRerenderInProgress,
  type FullRerenderAuditEntry,
  type FullRerenderSource,
  type FullRerenderTransitionArchive,
} from "@/lib/full-rerender-audit";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { markLanguageExportsNeedsRefresh } from "@/server/instant-premium/language-export-service";
import { persistInstantSceneTextsForProject } from "@/server/instant-premium/persist-instant-scene-texts";
import { ensureStoryModeTransitionRows } from "@/server/instant-premium/story-mode-transitions";
import { isInstantVideoRepairInProgress } from "@/server/instant-premium/start-instant-video-repair";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import {
  createPendingFullRerenderVersion,
  handleFullRerenderFailure,
  mergeAuditWithPendingFullRerender,
  sealDefaultRenderVersion,
} from "@/server/instant-premium/render-version-service";
import type { FullRerenderImageChangeAudit } from "@/lib/full-rerender-editor-types";
import {
  fullRerenderMayInvalidateSubtitleTiming,
  readMotionAudioExportFromHandoffJson,
} from "@/lib/motion-voice-export";
import {
  buildStudioRenderAuditMetadata,
  imageChangesAffectStudioIntelligence,
  resolveStudioIntelligenceStatus,
} from "@/lib/studio-project-metadata";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export const FULL_RERENDER_ALREADY_RUNNING = "FULL_RERENDER_ALREADY_RUNNING";
export const FULL_RERENDER_NOT_READY = "FULL_RERENDER_NOT_READY";
export const FULL_RERENDER_WRONG_TYPE = "FULL_RERENDER_WRONG_TYPE";
export const FULL_RERENDER_FORBIDDEN = "FULL_RERENDER_FORBIDDEN";

export type FullRerenderProjectResult = {
  ok: boolean;
  code?: string;
  projectId: string;
  status?: "started";
  progressRoute?: string;
  startedSegmentCount?: number;
  message?: string;
};

export function resolveImageViduSource(image: {
  viduInputUrl: string | null;
  previewUrl: string | null;
  storageKey: string | null;
}): string | null {
  return (
    image.viduInputUrl?.trim() ||
    image.previewUrl?.trim() ||
    image.storageKey?.trim() ||
    null
  );
}

export function detectFullRerenderBlockReason(project: {
  status: string;
  instantFinalRebuildStatus: string | null;
  instantFinalRebuildAuditJson: unknown;
  instantWorkerJobStatus: string | null;
  instantWorkerJobStartedAt: Date | null;
  transitions: Array<{ status: string; providerJobId: string | null; outputVideoUrl: string | null }>;
  exports: Array<{
    status: string;
    progress: number;
    outputVideoUrl: string | null;
    updatedAt: Date;
  }>;
}): string | null {
  if (project.instantFinalRebuildStatus === "running") {
    return "A text rebuild is already running.";
  }
  if (isFullRerenderInProgress(project.instantFinalRebuildAuditJson)) {
    return "A full rerender is already in progress.";
  }
  if (
    isInstantVideoRepairInProgress({
      instantFinalRebuildAuditJson: project.instantFinalRebuildAuditJson,
      instantWorkerJobStatus: project.instantWorkerJobStatus,
      instantWorkerJobStartedAt: project.instantWorkerJobStartedAt,
      status: project.status,
      transitions: project.transitions,
      exports: project.exports,
    })
  ) {
    return "Video repair is already in progress.";
  }
  const activeSegment = project.transitions.some(
    (t) =>
      t.status === "generating" ||
      t.status === "processing" ||
      t.status === "rendering" ||
      (t.status === "queued" && Boolean(t.providerJobId?.trim()))
  );
  if (activeSegment && (project.status === "generating" || project.status === "rendering")) {
    return "Video generation is still in progress.";
  }
  return null;
}

function instantPremiumProgressRoute(projectId: string): string {
  return `/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * Full Vidu re-generation from existing project images — no re-upload.
 * Seals the current final into ProjectRenderVersion, then starts a pending version row.
 */
export async function fullRerenderInstantPremiumProject(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
  sceneTexts?: unknown;
  versionNote?: string;
  rerenderSource?: FullRerenderSource;
  imageChangeAudit?: FullRerenderImageChangeAudit | null;
}): Promise<FullRerenderProjectResult> {
  const { projectId, userId, isAdmin = false, sceneTexts, versionNote, rerenderSource, imageChangeAudit } =
    params;

  const project = await getAnimationProjectById(projectId);
  if (!project) {
    return {
      ok: false,
      code: FULL_RERENDER_NOT_READY,
      projectId,
      message: "Project not found.",
    };
  }

  if (project.projectType !== "instant_premium") {
    return {
      ok: false,
      code: FULL_RERENDER_WRONG_TYPE,
      projectId,
      message: "Full rerender is only available for Instant Premium projects.",
    };
  }

  if (project.ownerId !== userId && !isAdmin) {
    return {
      ok: false,
      code: FULL_RERENDER_FORBIDDEN,
      projectId,
      message: "Forbidden.",
    };
  }

  const busyReason = detectFullRerenderBlockReason(project);
  if (busyReason) {
    return {
      ok: false,
      code: FULL_RERENDER_ALREADY_RUNNING,
      projectId,
      message: busyReason,
    };
  }

  if (!project.images.length) {
    return {
      ok: false,
      code: FULL_RERENDER_NOT_READY,
      projectId,
      message: "This project has no images to rerender.",
    };
  }

  const missingImage = project.images.find((image) => !resolveImageViduSource(image));
  if (missingImage) {
    return {
      ok: false,
      code: FULL_RERENDER_NOT_READY,
      projectId,
      message: `Image ${missingImage.order + 1} is missing a Vidu input URL or storage key.`,
    };
  }

  if (sceneTexts !== undefined) {
    const persisted = await persistInstantSceneTextsForProject(projectId, sceneTexts);
    if (!persisted.ok) {
      return {
        ok: false,
        code: FULL_RERENDER_NOT_READY,
        projectId,
        message: persisted.error,
      };
    }
  }

  if (project.instantMode === "story") {
    await ensureStoryModeTransitionRows(projectId);
  }

  const refreshed = await getAnimationProjectById(projectId);
  if (!refreshed || refreshed.projectType !== "instant_premium") {
    return {
      ok: false,
      code: FULL_RERENDER_NOT_READY,
      projectId,
      message: "Instant Premium project not found.",
    };
  }

  if (!refreshed.transitions.length) {
    return {
      ok: false,
      code: FULL_RERENDER_NOT_READY,
      projectId,
      message: "No segments found for this project.",
    };
  }

  const latestExport = refreshed.exports[0] ?? null;
  const previousFinalVideoUrl = latestExport?.outputVideoUrl?.trim() ?? null;
  const previousCleanFinalVideoUrl = refreshed.instantCleanFinalVideoUrl?.trim() ?? null;
  const previousTransitions: FullRerenderTransitionArchive[] = refreshed.transitions.map((t) => ({
    order: t.order,
    outputVideoUrl: t.outputVideoUrl?.trim() ?? null,
    providerJobId: t.providerJobId?.trim() ?? null,
  }));

  const hasStudioMetadata = Boolean(refreshed.studioSourceStoryboardId?.trim());
  let studioIntelligenceStatus = resolveStudioIntelligenceStatus(refreshed);
  if (
    hasStudioMetadata &&
    imageChangeAudit &&
    imageChangesAffectStudioIntelligence(imageChangeAudit)
  ) {
    studioIntelligenceStatus = "stale";
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { studioIntelligenceStatus: "stale" },
    });
  }
  const studioAudit = hasStudioMetadata ? buildStudioRenderAuditMetadata(refreshed) : undefined;
  const suggestStudioRefresh =
    hasStudioMetadata &&
    (studioIntelligenceStatus === "stale" ||
      Boolean(refreshed.studioLastStaleReason?.trim()));

  const startedAt = new Date().toISOString();
  const auditEntry: FullRerenderAuditEntry = {
    rebuildType: "full_rerender",
    status: "running",
    startedAt,
    rerenderSource: rerenderSource ?? (sceneTexts !== undefined ? "editor" : "quick"),
    imageChanges: imageChangeAudit ?? undefined,
    studioIntelligenceStatus: hasStudioMetadata ? studioIntelligenceStatus : undefined,
    studioAudit: studioAudit
      ? { ...studioAudit, suggestStudioRefresh: suggestStudioRefresh || undefined }
      : undefined,
    suggestStudioRefresh: suggestStudioRefresh || undefined,
    versionNote: versionNote?.trim() || null,
    previousFinalVideoUrl,
    previousCleanFinalVideoUrl,
    previousTransitions,
    newProviderJobsCreated: true,
  };

  await sealDefaultRenderVersion({
    project: refreshed,
    finalVideoUrl: previousFinalVideoUrl,
    cleanVideoUrl: previousCleanFinalVideoUrl,
    exportId: latestExport?.id ?? null,
  });

  const pendingVersion = await createPendingFullRerenderVersion({
    project: refreshed,
    versionNote: versionNote?.trim() || null,
  });

  const auditJson = mergeAuditWithPendingFullRerender(
    refreshed.instantFinalRebuildAuditJson,
    auditEntry,
    {
      renderVersionId: pendingVersion.id,
      renderVersionNumber: pendingVersion.renderVersionNumber,
      startedAt,
    }
  );

  await prisma.$transaction([
    ...refreshed.transitions.map((transition) =>
      prisma.animationTransition.update({
        where: { id: transition.id },
        data: {
          status: "queued",
          providerJobId: null,
          outputVideoUrl: null,
          errorMessage: null,
          progress: 0,
        },
      })
    ),
    prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "generating",
        failureReason: null,
        lastOverlayError: null,
        instantFinalRebuildStatus: null,
        instantWorkerJobStatus: "queued",
        instantWorkerJobStartedAt: startedAt,
        instantPreviousFinalVideoUrl: previousFinalVideoUrl,
        instantCleanFinalVideoUrl: null,
        instantFinalRebuildAuditJson: auditJson as object,
      },
    }),
    ...(latestExport
      ? [
          prisma.animationExport.update({
            where: { id: latestExport.id },
            data: {
              status: "queued",
              progress: 0,
              outputVideoUrl: null,
              errorMessage: null,
            },
          }),
        ]
      : [
          prisma.animationExport.create({
            data: {
              projectId,
              status: "queued",
              progress: 0,
              provider: isVideoRenderWorkerMode() ? "instant-video-worker" : "instant-local-ffmpeg",
            },
          }),
        ]),
  ]);

  await markLanguageExportsNeedsRefresh(projectId);

  console.info("[hc-instant-full-rerender]", {
    projectId,
    segmentCount: refreshed.transitions.length,
    previousFinalVideoUrl,
    pendingRenderVersionNumber: pendingVersion.renderVersionNumber,
    archivedTransitionCount: previousTransitions.filter((t) => t.outputVideoUrl).length,
  });

  const { startedCount } = await startProjectJobs(projectId);

  const voiceExport = readMotionAudioExportFromHandoffJson(refreshed.studioHandoffJson);
  const subtitleTimingWarning =
    voiceExport?.subtitleTrack?.entries?.length &&
    imageChangeAudit &&
    fullRerenderMayInvalidateSubtitleTiming(
      imageChangesAffectStudioIntelligence(imageChangeAudit)
    )
      ? " Subtitle timing may need refresh from Studio after scene timing changes."
      : "";

  return {
    ok: true,
    projectId,
    status: "started",
    progressRoute: instantPremiumProgressRoute(projectId),
    startedSegmentCount: startedCount,
    message: `Full rerender started using existing images.${subtitleTimingWarning}`,
  };
}

export async function fullRerenderInstantPremiumProjectWithStatus(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
  sceneTexts?: unknown;
  versionNote?: string;
  rerenderSource?: FullRerenderSource;
  imageChangeAudit?: FullRerenderImageChangeAudit | null;
}): Promise<{
  fullRerender: FullRerenderProjectResult;
  status: InstantPremiumStatusResponse;
}> {
  const fullRerender = await fullRerenderInstantPremiumProject(params);
  const status = await getInstantPremiumStatus(params.projectId);
  return { fullRerender, status };
}

/** Clears running full-rerender audit and restores last playable version when possible. */
export async function markFullRerenderFailedIfRunning(
  projectId: string,
  message?: string
): Promise<boolean> {
  return handleFullRerenderFailure(projectId, message);
}
