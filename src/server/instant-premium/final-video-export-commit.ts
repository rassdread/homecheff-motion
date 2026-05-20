import { prisma } from "@/lib/prisma";
import {
  appendFinalVideoRebuildAudit,
  type FinalVideoRebuildAuditEvent,
} from "@/lib/final-video-storage";
import { validateLockedTextLayerMetadata } from "@/lib/locked-text-layer";
import type { LockedTextLayer } from "@/lib/locked-text-layer";
import {
  logFinalVideoReplaced,
  scheduleDeleteOldFinalBlob,
} from "@/server/instant-premium/replace-final-video-blob";

export function logFinalVideoRebuildAudit(event: FinalVideoRebuildAuditEvent): void {
  console.info("[final-video-rebuild-audit]", event);
}

export async function commitInstantPremiumFinalVideoExport(params: {
  projectId: string;
  exportId: string;
  finalUrl: string;
  lockedLayers: LockedTextLayer[];
  isRebuild: boolean;
  previousFinalUrl: string | null;
  nextRebuildCount: number;
  segmentCount: number;
}): Promise<void> {
  const {
    projectId,
    exportId,
    finalUrl,
    lockedLayers,
    isRebuild,
    previousFinalUrl,
    nextRebuildCount,
    segmentCount,
  } = params;
  const rebuiltAt = new Date();
  const textValidation = validateLockedTextLayerMetadata(lockedLayers);

  const projectBefore = isRebuild
    ? await prisma.animationProject.findUnique({
        where: { id: projectId },
        select: { instantFinalRebuildAuditJson: true },
      })
    : null;

  await prisma.animationExport.update({
    where: { id: exportId },
    data: {
      status: "completed",
      progress: 100,
      outputVideoUrl: finalUrl,
      errorMessage: null,
      expectedTextLayers:
        lockedLayers.length > 0 ? (textValidation.records as object) : undefined,
    },
  });

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "completed",
      lastOverlayError: null,
      failureReason: null,
      instantWorkerJobStatus: "completed",
      instantFinalRebuildStatus: null,
      ...(isRebuild
        ? {
            instantFinalRebuildCount: nextRebuildCount,
            instantFinalRebuiltAt: rebuiltAt,
            instantPreviousFinalVideoUrl: previousFinalUrl,
          }
        : {}),
      ...(isRebuild && projectBefore
        ? {
            instantFinalRebuildAuditJson: appendFinalVideoRebuildAudit(
              projectBefore.instantFinalRebuildAuditJson,
              {
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
                newFinalVideoUrl: finalUrl,
                recordedAt: rebuiltAt.toISOString(),
                status: "completed",
              }
            ) as object,
          }
        : {}),
    },
  });

  if (isRebuild) {
    logFinalVideoReplaced({
      projectId,
      oldUrl: previousFinalUrl,
      newUrl: finalUrl,
      rebuildCount: nextRebuildCount,
      rebuiltAt: rebuiltAt.toISOString(),
    });
    const auditEvent: FinalVideoRebuildAuditEvent = {
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
      newFinalVideoUrl: finalUrl,
      recordedAt: rebuiltAt.toISOString(),
      status: "completed",
    };
    logFinalVideoRebuildAudit(auditEvent);
    scheduleDeleteOldFinalBlob(previousFinalUrl);
  }
}

export async function markInstantPremiumFinalRebuildFailed(params: {
  projectId: string;
  exportId: string;
  previousFinalUrl: string | null;
  segmentCount: number;
  rebuildCount: number;
  message: string;
}): Promise<void> {
  const { projectId, exportId, previousFinalUrl, segmentCount, rebuildCount, message } = params;
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { instantFinalRebuildAuditJson: true },
  });
  const failedAt = new Date();
  const auditEvent: FinalVideoRebuildAuditEvent = {
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
    rebuildCount,
    previousFinalVideoUrl: previousFinalUrl,
    newFinalVideoUrl: null,
    recordedAt: failedAt.toISOString(),
    status: "failed",
  };

  await prisma.animationExport.update({
    where: { id: exportId },
    data: {
      status: "completed",
      progress: 100,
      outputVideoUrl: previousFinalUrl,
      errorMessage: message.slice(0, 500),
    },
  });
  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "completed",
      instantFinalRebuildStatus: "failed",
      instantWorkerJobStatus: "completed",
      instantFinalRebuildAuditJson: appendFinalVideoRebuildAudit(
        project?.instantFinalRebuildAuditJson,
        auditEvent
      ) as object,
    },
  });
  logFinalVideoRebuildAudit(auditEvent);
}
