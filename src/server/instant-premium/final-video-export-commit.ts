import { logFinalExportFailed } from "@/lib/instant-premium-export-failure";
import { prisma } from "@/lib/prisma";
import type { InstantPremiumFailureReason } from "@/types/animation-api";
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
import {
  clearRunningFullRerenderAudit,
  isFullRerenderInProgress,
} from "@/lib/full-rerender-audit";
import { markLanguageExportsNeedsRefresh } from "@/server/instant-premium/language-export-service";
import {
  completePendingFullRerenderVersion,
  ensureInitialRenderVersion,
  failPendingFullRerenderVersion,
  loadVersionHistoryUrlSource,
  persistFinalRenderVersionAfterExport,
  readPendingFullRerender,
} from "@/server/instant-premium/render-version-service";
import {
  collectVersionHistoryVideoUrls,
  isVideoUrlReferencedByVersionHistory,
} from "@/lib/video-version-retention";
import { getAnimationProjectById } from "@/server/animation-projects/queries";
import { syncProjectLanguageTextLayers } from "@/server/instant-premium/persist-language-text-layers";
import {
  assertPlaybackUrlFreshAfterRebuild,
  logPlaybackUrlUpdated,
  resolveLatestExportPlaybackUrl,
} from "@/lib/playback-url-resolution";
import { recordTextRerenderCostEvent } from "@/server/provider-cost/provider-cost-event";

export function logFinalVideoRebuildAudit(event: FinalVideoRebuildAuditEvent): void {
  console.info("[final-video-rebuild-audit]", event);
}

export async function commitInstantPremiumFinalVideoExport(params: {
  projectId: string;
  exportId: string;
  finalUrl: string;
  /** Bare concat URL from the same merge pass (avoids stale DB reload). */
  cleanVideoUrl?: string | null;
  lockedLayers: LockedTextLayer[];
  isRebuild: boolean;
  previousFinalUrl: string | null;
  nextRebuildCount: number;
  segmentCount: number;
  rebuildCandidateUrl?: string | null;
  identicalOutputDetected?: boolean;
  validationOk?: boolean;
  /** When rebuild/re-finalization has no pending audit row, which version kind to create. */
  renderVersionKind?: "text_rerender" | "full_rerender";
}): Promise<void> {
  const {
    projectId,
    exportId,
    finalUrl,
    cleanVideoUrl: committedCleanVideoUrl = null,
    lockedLayers,
    isRebuild,
    previousFinalUrl,
    nextRebuildCount,
    segmentCount,
    rebuildCandidateUrl = null,
    identicalOutputDetected = false,
    validationOk = true,
    renderVersionKind = "full_rerender",
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
                rebuildCandidateVideoUrl: rebuildCandidateUrl,
                identicalOutputDetected,
                validationOk,
              }
            ) as object,
          }
        : {}),
    },
  });

  if (isRebuild && identicalOutputDetected) {
    console.warn("[final-video-rebuild-audit]", {
      projectId,
      identicalOutputDetected: true,
      validationOk,
      rebuildCandidateUrl,
      committedFinalUrl: finalUrl,
    });
  }

  const resolvedPlaybackUrl =
    resolveLatestExportPlaybackUrl(
      {
        status: "completed",
        instantFinalRebuildCount: nextRebuildCount,
        instantFinalRebuiltAt: rebuiltAt,
        instantPreviousFinalVideoUrl: previousFinalUrl,
        instantFinalRebuildStatus: null,
      },
      {
        id: exportId,
        status: "completed",
        outputVideoUrl: finalUrl,
        updatedAt: rebuiltAt,
      }
    ) ?? finalUrl;

  if (isRebuild) {
    const staleCheck = assertPlaybackUrlFreshAfterRebuild({
      projectId,
      newRawUrl: finalUrl,
      previousRawUrl: previousFinalUrl,
      rebuildCount: nextRebuildCount,
      exportId,
    });
    if (!staleCheck.ok) {
      console.warn("[playback-url-updated]", staleCheck);
    }
    logPlaybackUrlUpdated({
      projectId,
      oldUrl: previousFinalUrl,
      newUrl: finalUrl,
      rebuildCount: nextRebuildCount,
      exportId,
      resolvedPlaybackUrl,
    });
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
    const versionHistory = await loadVersionHistoryUrlSource(projectId);
    if (!isVideoUrlReferencedByVersionHistory(previousFinalUrl, versionHistory)) {
      scheduleDeleteOldFinalBlob(previousFinalUrl);
    } else {
      console.info("[final-video-blob-cleanup]", {
        projectId,
        skipped: true,
        reason: "referenced_by_render_version_history",
        oldUrl: previousFinalUrl,
        retainedUrls: collectVersionHistoryVideoUrls(versionHistory).length,
      });
    }
  }

  try {
    const sync = await syncProjectLanguageTextLayers({
      projectId,
      recoverySource: isRebuild ? "rebuild" : "original_render",
    });
    console.info("[language-text-layers]", {
      projectId,
      phase: "persisted_on_final_commit",
      layerCount: sync.layerCount,
      recoverySource: sync.stats.recoverySource,
    });
  } catch (error) {
    console.error("[language-text-layers]", {
      projectId,
      phase: "persist_failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  await markLanguageExportsNeedsRefresh(projectId);

  const projectForVersion = await getAnimationProjectById(projectId);
  if (projectForVersion) {
    if (isFullRerenderInProgress(projectForVersion.instantFinalRebuildAuditJson)) {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: {
          instantFinalRebuildAuditJson: clearRunningFullRerenderAudit(
            projectForVersion.instantFinalRebuildAuditJson,
            { status: "completed", completedAt: rebuiltAt.toISOString() }
          ) as object,
        },
      });
    }

    const pending = readPendingFullRerender(projectForVersion.instantFinalRebuildAuditJson);
    if (pending) {
      const pendingRow = await prisma.projectRenderVersion.findUnique({
        where: { id: pending.renderVersionId },
        select: { kind: true, cleanVideoUrl: true },
      });
      const cleanForVersion =
        committedCleanVideoUrl?.trim() ||
        pendingRow?.cleanVideoUrl?.trim() ||
        projectForVersion.instantCleanFinalVideoUrl;
      await completePendingFullRerenderVersion({
        projectId,
        renderVersionId: pending.renderVersionId,
        finalVideoUrl: finalUrl,
        cleanVideoUrl: cleanForVersion,
        exportId,
      });
      const auditBase =
        projectForVersion.instantFinalRebuildAuditJson &&
        typeof projectForVersion.instantFinalRebuildAuditJson === "object" &&
        !Array.isArray(projectForVersion.instantFinalRebuildAuditJson)
          ? (projectForVersion.instantFinalRebuildAuditJson as Record<string, unknown>)
          : {};
      const lastVersionKey =
        pendingRow?.kind === "text_rerender" ? "lastTextRerender" : "lastFullRerender";
      await prisma.animationProject.update({
        where: { id: projectId },
        data: {
          instantFinalRebuildAuditJson: {
            ...auditBase,
            pendingFullRerender: null,
            [lastVersionKey]: {
              renderVersionId: pending.renderVersionId,
              renderVersionNumber: pending.renderVersionNumber,
              completedAt: rebuiltAt.toISOString(),
              status: "completed",
              finalVideoUrl: finalUrl,
              kind: pendingRow?.kind ?? "full_rerender",
            },
          } as object,
        },
      });
      if (pendingRow?.kind === "text_rerender") {
        await recordTextRerenderCostEvent({
          projectId,
          userId: projectForVersion.ownerId,
          renderVersionId: pending.renderVersionId,
          status: "completed",
        }).catch((err) => {
          console.error("[provider-cost] recordTextRerenderCostEvent", err);
        });
      }
    } else if (!isRebuild) {
      await ensureInitialRenderVersion({
        project: projectForVersion,
        finalVideoUrl: finalUrl,
        cleanVideoUrl:
          committedCleanVideoUrl?.trim() ||
          projectForVersion.instantCleanFinalVideoUrl,
        exportId,
      });
    } else {
      // V1 closeout: automatic re-finalization sets isRebuild without pending audit.
      // Reuse rebuild primitives (seal → createPending → complete) so ProjectRenderVersion
      // always tracks the successful final blob.
      const persisted = await persistFinalRenderVersionAfterExport({
        project: projectForVersion,
        finalVideoUrl: finalUrl,
        cleanVideoUrl:
          committedCleanVideoUrl?.trim() ||
          projectForVersion.instantCleanFinalVideoUrl,
        exportId,
        previousFinalUrl,
        kind: renderVersionKind,
      });
      const auditBase =
        projectForVersion.instantFinalRebuildAuditJson &&
        typeof projectForVersion.instantFinalRebuildAuditJson === "object" &&
        !Array.isArray(projectForVersion.instantFinalRebuildAuditJson)
          ? (projectForVersion.instantFinalRebuildAuditJson as Record<string, unknown>)
          : {};
      const lastVersionKey =
        renderVersionKind === "text_rerender" ? "lastTextRerender" : "lastFullRerender";
      await prisma.animationProject.update({
        where: { id: projectId },
        data: {
          instantFinalRebuildAuditJson: {
            ...auditBase,
            pendingFullRerender: null,
            [lastVersionKey]: {
              renderVersionId: persisted.id,
              renderVersionNumber: persisted.renderVersionNumber,
              completedAt: rebuiltAt.toISOString(),
              status: "completed",
              finalVideoUrl: finalUrl,
              kind: renderVersionKind,
            },
          } as object,
        },
      });
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "FINAL_RENDER_VERSION_PERSISTED",
        renderVersionId: persisted.id,
        renderVersionNumber: persisted.renderVersionNumber,
        kind: renderVersionKind,
      });
    }
  }
}

export async function markInstantPremiumFinalRebuildFailed(params: {
  projectId: string;
  exportId: string;
  previousFinalUrl: string | null;
  segmentCount: number;
  rebuildCount: number;
  message: string;
  failureReason?: InstantPremiumFailureReason;
  provider?: string | null;
  failedStage?: string;
  rebuildCandidateUrl?: string | null;
  validationErrors?: string[];
}): Promise<void> {
  const {
    projectId,
    exportId,
    segmentCount,
    rebuildCount,
    message,
    failureReason = "merge_failed",
    provider = null,
    failedStage = "merge_clips",
    rebuildCandidateUrl = null,
    validationErrors = [],
  } = params;
  let restoreFinalUrl = params.previousFinalUrl;
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { instantFinalRebuildAuditJson: true },
  });
  const pending = readPendingFullRerender(project?.instantFinalRebuildAuditJson);
  if (pending) {
    const restoredFromVersion = await failPendingFullRerenderVersion({
      projectId,
      renderVersionId: pending.renderVersionId,
      errorMessage: message.slice(0, 500),
    });
    if (restoredFromVersion) {
      restoreFinalUrl = restoredFromVersion;
    }
    const auditBase =
      project?.instantFinalRebuildAuditJson &&
      typeof project.instantFinalRebuildAuditJson === "object" &&
      !Array.isArray(project.instantFinalRebuildAuditJson)
        ? (project.instantFinalRebuildAuditJson as Record<string, unknown>)
        : {};
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        instantFinalRebuildAuditJson: {
          ...auditBase,
          pendingFullRerender: null,
        } as object,
      },
    });
  }
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
    previousFinalVideoUrl: restoreFinalUrl,
    newFinalVideoUrl: null,
    recordedAt: failedAt.toISOString(),
    status: "failed",
    rebuildCandidateVideoUrl: rebuildCandidateUrl,
    validationOk: false,
    validationErrors,
  };

  await prisma.animationExport.update({
    where: { id: exportId },
    data: {
      status: "completed",
      progress: 100,
      outputVideoUrl: restoreFinalUrl,
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
  logFinalExportFailed({
    projectId,
    exportId,
    provider,
    stage: failedStage,
    failureReason,
    failureMessage: message,
    workerError: message,
  });
}
