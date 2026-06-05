import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  ExportBlobUploadError,
  classifyExportBlobFailure,
  exportBlobErrorMessage,
  logExportBlobUploadFailure,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import { getFinalMergeMaxWidthFromViduResolution } from "@/lib/media-export-constants";
import {
  parseLockedTextLayersJson,
  validateLockedTextLayerMetadata,
} from "@/lib/locked-text-layer";
import { logFinalExportFailed } from "@/lib/instant-premium-export-failure";
import { sanitizeOverlayError } from "@/lib/video-ffmpeg-capability";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import {
  normalizeOverlayStyle,
  normalizeTextRenderMode,
  shouldApplyOcrTextOverlay,
} from "@/lib/hybrid-motion-overlay";
import { resolvePosterMotionBlendStrength, parsePosterMotionSettings } from "@/lib/poster-motion-preserve";
import {
  buildFinalAssemblyLogBase,
  logFinalAssembly,
  resolveFinalAssemblyMode,
  shouldRunSegmentCompositor,
} from "@/server/instant-premium/final-assembly";
import { compositePosterMotionPreserveSegments } from "@/server/instant-premium/poster-motion/poster-motion-compositor";
import {
  logMergeSegment,
  MergeSegmentsValidationError,
  buildMergeSegmentsValidationInput,
  validateMergeSegmentsBeforeExport,
} from "@/server/instant-premium/merge-segments";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import {
  buildLockedTextRegionsFromBlocks,
  resolveTextLockMode,
} from "@/lib/hard-text-lock";
import { buildSeamlessJoinPlansForOrderedSegments } from "@/server/instant-premium/seamless-segment-join";
import { resolveFinalConcatSegmentPaths } from "@/server/instant-premium/final-concat-segments";
import {
  assertNoInvalidAssemblySources,
  FinalSegmentSourceError,
  INVALID_FINAL_ASSEMBLY_SOURCE,
  prepareFinalSegmentProviderVideos,
} from "@/server/instant-premium/final-segment-source";
import {
  assertConcatLockedToCanonicalProviderPaths,
  ProviderVideoPipelineError,
} from "@/server/instant-premium/canonical-provider-video";
import {
  isPlainConcatSafeMode,
  resolveSafeModeSegmentTransitionType,
} from "@/server/instant-premium/final-assembly-safe-mode";
import { assertSegmentsAnimatedBeforeConcat } from "@/server/instant-premium/segment-motion-validation";
import {
  assertFinalConcatInputOrder,
  buildConcatSegmentMapEntries,
  InvalidSegmentMappingError,
  logConcatSegmentMap,
  validateUniqueConcatPaths,
} from "@/server/instant-premium/concat-segment-mapping";
import {
  concatMotionSegmentsWithTransitions,
  probeVideoSegment,
} from "@/server/instant-premium/segment-transition";
import { applyMinimalPolishToVideo } from "@/server/instant-premium/apply-minimal-polish";
import { applyBestTextOverlayForProject } from "@/server/instant-premium/hybrid-overlay/text-patch-compositor";
import { isExportMergeStuck } from "@/server/instant-premium/finalize-repair";
import { isTimeoutLikeError } from "@/lib/export-timeout";
import { REBUILD_FAILED_TIMEOUT } from "@/server/instant-premium/rebuild-final-video";
import {
  clearFinalExportStage,
  setFinalExportStage,
} from "@/server/instant-premium/final-export-stage";
import { hashFileSha256, hashRemoteVideoUrl } from "@/lib/file-content-hash";
import {
  createCleanRebuildWorkspace,
  purgeStaleProjectMergeArtifacts,
  removeRebuildWorkspace,
} from "@/server/instant-premium/clean-rebuild-workspace";
import { finalizeRebuildOutput } from "@/server/instant-premium/assert-fresh-rebuild-output";
import {
  REBUILD_OUTPUT_VALIDATION_FAILED,
  RebuildOutputValidationError,
} from "@/server/instant-premium/rebuild-output-validation";
import {
  getRebuildAssemblyTrace,
  startRebuildAssemblyTrace,
  upsertRebuildSegmentTrace,
} from "@/server/instant-premium/rebuild-assembly-trace";
import {
  STALE_REBUILD_OUTPUT,
  StaleRebuildOutputError,
} from "@/server/instant-premium/stale-rebuild-output";
import { finalBlobPathname, cleanFinalBlobPathname } from "@/lib/final-video-storage";
import { syncProjectLanguageTextLayers } from "@/server/instant-premium/persist-language-text-layers";
import {
  commitInstantPremiumFinalVideoExport,
  markInstantPremiumFinalRebuildFailed,
} from "@/server/instant-premium/final-video-export-commit";
import { markFullRerenderFailedIfRunning } from "@/server/instant-premium/full-rerender-project";
import {
  attachCleanVideoToPendingRenderVersion,
  readPendingFullRerender,
  resolveFinalBlobVersionForUpload,
} from "@/server/instant-premium/render-version-service";
import { replaceFinalVideoBlobSafely } from "@/server/instant-premium/replace-final-video-blob";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import { hasSceneOverlayContent, parseInstantSceneTexts } from "@/lib/story-overlay-templates";
import { applyStorySceneTextOverlay } from "@/server/animation-export/story-text-overlay";
import { resolveInstantVideoDimensions } from "@/lib/locked-text-layer";
import {
  assertFinalConcatInputCount,
  expectedAssemblySegmentCount,
  FinalAssemblyTransitionCountMismatchError,
  logFinalConcatInputs,
  SegmentTrimTooAggressiveError,
} from "@/server/instant-premium/final-assembly-invariants";
import { ensureStoryModeTransitionRows } from "@/server/instant-premium/story-mode-transitions";
import { applyStudioCharacterPerformanceExportToMergedVideo } from "@/server/instant-premium/apply-studio-performance-export";
import { applyStudioVoiceExportToMergedVideo } from "@/server/instant-premium/apply-studio-voice-export";
import { readMotionAudioExportFromHandoffJson } from "@/lib/motion-voice-export";

const MERGE_CHAIN = new Map<string, Promise<unknown>>();
const FINAL_BLOB_PROVIDER = "instant-final-merge";

export function localMergedFinalVideoPath(projectId: string): string {
  return absolutePublicPath("generated", "animations", "projects", projectId, "final.mp4");
}

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withMergeLock(projectId: string, fn: () => Promise<void>) {
  const prev = MERGE_CHAIN.get(projectId) ?? Promise.resolve();
  const run = prev.then(fn);
  MERGE_CHAIN.set(projectId, run.catch(() => undefined));
  return run;
}

async function uploadMergedVideoToBlob(
  projectId: string,
  mergedPath: string,
  options?: { rebuildVersion?: number; previousFinalUrl?: string | null }
): Promise<string> {
  const body = await fs.readFile(mergedPath);
  const rebuildVersion = options?.rebuildVersion ?? 0;
  if (rebuildVersion > 0) {
    return replaceFinalVideoBlobSafely({
      projectId,
      oldFinalUrl: options?.previousFinalUrl,
      body,
      rebuildCount: rebuildVersion,
    });
  }
  if (!body || body.length <= 0) {
    throw new Error("Merged video is empty before blob upload.");
  }
  const uploadTarget = finalBlobPathname(projectId, 0);
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "finalBlobUploadStart",
    uploadTarget,
    provider: FINAL_BLOB_PROVIDER,
    bytes: body.length,
  });
  const { url } = await uploadPublicBlob({
    pathname: uploadTarget,
    body,
    contentType: "video/mp4",
    addRandomSuffix: false,
    context: {
      projectId,
      uploadTarget,
      provider: FINAL_BLOB_PROVIDER,
    },
  });
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "finalBlobUploadComplete",
    uploadTarget,
    provider: FINAL_BLOB_PROVIDER,
  });
  return url;
}

async function uploadCleanFinalVideoToBlob(
  projectId: string,
  cleanPath: string,
  rebuildVersion = 0
): Promise<string> {
  const body = await fs.readFile(cleanPath);
  if (!body || body.length <= 0) {
    throw new Error("Clean merged video is empty before blob upload.");
  }
  const uploadTarget = cleanFinalBlobPathname(projectId, rebuildVersion);
  const { url } = await uploadPublicBlob({
    pathname: uploadTarget,
    body,
    contentType: "video/mp4",
    addRandomSuffix: false,
    context: {
      projectId,
      uploadTarget,
      provider: "instant_clean_final",
    },
  });
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "cleanFinalBlobUploadComplete",
    uploadTarget,
  });
  return url;
}

async function persistCleanFinalVideoUrl(
  projectId: string,
  cleanPath: string,
  rebuildVersion = 0
): Promise<string> {
  const cleanUrl = await uploadCleanFinalVideoToBlob(projectId, cleanPath, rebuildVersion);
  await prisma.animationProject.update({
    where: { id: projectId },
    data: { instantCleanFinalVideoUrl: cleanUrl },
  });
  return cleanUrl;
}

/** Upload cached local merge when FFmpeg already finished (blob auth retry). */
export async function retryUploadLocalMergedFinalVideo(projectId: string): Promise<{
  ok: boolean;
  finalUrl?: string;
  message?: string;
}> {
  const localPath = localMergedFinalVideoPath(projectId);
  if (!(await pathExists(localPath))) {
    return { ok: false, message: "No local merged video cached for upload retry." };
  }

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" } } },
  });
  if (!project || !isInstantLikeProject(project)) {
    return { ok: false, message: "Instant Premium project not found." };
  }

  const exportRow = project.exports[0];
  if (exportRow?.status === "completed" && exportRow.outputVideoUrl?.trim()) {
    return { ok: true, finalUrl: exportRow.outputVideoUrl.trim() };
  }

  const exportId =
    exportRow?.id ??
    (
      await prisma.animationExport.create({
        data: {
          projectId,
          status: "rendering",
          progress: 85,
          provider: isVideoRenderWorkerMode() ? "instant-video-worker" : "instant-local-ffmpeg",
        },
      })
    ).id;

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "rendering",
      instantWorkerJobStatus: "running",
      instantWorkerJobStartedAt: new Date(),
    },
  });
  await prisma.animationExport.update({
    where: { id: exportId },
    data: { status: "rendering", progress: 85, errorMessage: null },
  });

  try {
    const finalUrl = await uploadMergedVideoToBlob(projectId, localPath);
    const lockedLayers = parseLockedTextLayersJson(project.instantLockedTextLayers);
    const textValidation = validateLockedTextLayerMetadata(lockedLayers);
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
        failureReason: null,
        lastOverlayError: null,
        instantWorkerJobStatus: "completed",
      },
    });
    void syncProjectLanguageTextLayers({
      projectId,
      recoverySource: "original_render",
    }).catch((err) => {
      console.error("[language-text-layers]", {
        projectId,
        phase: "persist_after_upload_retry",
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return { ok: true, finalUrl };
  } catch (error) {
    const code = classifyExportBlobFailure(error);
    const message = exportBlobErrorMessage(code);
    logExportBlobUploadFailure(error, {
      phase: "retry-upload-local",
      projectId,
      uploadTarget: finalBlobPathname(projectId),
      provider: FINAL_BLOB_PROVIDER,
    });
    await prisma.animationExport.update({
      where: { id: exportId },
      data: {
        status: "failed",
        progress: 85,
        errorMessage: message,
        outputVideoUrl: null,
      },
    });
    const failureReason =
      code === "EXPORT_UPLOAD_AUTH_FAILED" ? "export_upload_auth_failed" : "merge_failed";
    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "failed",
        failureReason,
        instantWorkerJobStatus: "failed",
      },
    });
    logFinalExportFailed({
      projectId,
      exportId,
      provider: null,
      stage: "upload_storage",
      failureReason,
      failureMessage: message,
      workerError: message,
    });
    return { ok: false, message };
  }
}

export type ExecuteInstantPremiumMergeOptions = {
  force?: boolean;
  /** Admin repair / explicit static mode only */
  allowStaticFallback?: boolean;
  adminRepairMode?: boolean;
};

/** Merge Vidu clips + optional locked text overlay; updates project/export in DB. */
export async function executeInstantPremiumMerge(
  projectId: string,
  options?: ExecuteInstantPremiumMergeOptions
): Promise<void> {
  const exportProvider = isVideoRenderWorkerMode()
    ? "instant-video-worker"
    : "instant-local-ffmpeg";

  await withMergeLock(projectId, async () => {
    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      include: {
        transitions: { orderBy: { order: "asc" } },
        exports: { orderBy: { createdAt: "desc" } },
        images: { orderBy: { order: "asc" } },
      },
    });
    if (!project || !isInstantLikeProject(project)) {
      return;
    }

    const latestExport = project.exports[0];
    if (!options?.force && latestExport?.status === "completed" && latestExport.outputVideoUrl) {
      await prisma.animationProject.update({
        where: { id: projectId },
        data: { instantWorkerJobStatus: "completed" },
      });
      return;
    }
    if (
      !options?.force &&
      latestExport?.status === "rendering" &&
      !isExportMergeStuck(latestExport)
    ) {
      return;
    }

    if (project.transitions.length === 0) {
      return;
    }

    await ensureStoryModeTransitionRows(projectId);
    const mergeProject =
      (await prisma.animationProject.findUnique({
        where: { id: projectId },
        include: {
          transitions: { orderBy: { order: "asc" } },
          exports: { orderBy: { createdAt: "desc" } },
          images: { orderBy: { order: "asc" } },
        },
      })) ?? project;
    const latestExportForMerge = mergeProject.exports[0];

    const allowStaticFallback =
      options?.allowStaticFallback === true ||
      options?.adminRepairMode === true ||
      process.env.ALLOW_STATIC_SEGMENT_FALLBACK === "true";

    const isFinalRebuild = mergeProject.instantFinalRebuildStatus === "running";
    const rebuildPreviousFinalUrl =
      mergeProject.instantPreviousFinalVideoUrl?.trim() ??
      latestExportForMerge?.outputVideoUrl?.trim() ??
      null;
    const mergeStartProgress = isFinalRebuild ? 70 : 10;
    const clearOutputOnRestart = !isFinalRebuild;
    const exportRow =
      latestExportForMerge?.status === "failed" || latestExportForMerge?.status === "failed_overlay"
        ? await prisma.animationExport.update({
            where: { id: latestExportForMerge.id },
            data: {
              status: "rendering",
              progress: mergeStartProgress,
              errorMessage: null,
              ...(clearOutputOnRestart ? { outputVideoUrl: null } : {}),
            },
          })
        : latestExportForMerge
          ? await prisma.animationExport.update({
              where: { id: latestExportForMerge.id },
              data: {
                status: "rendering",
                progress: mergeStartProgress,
                errorMessage: null,
                ...(clearOutputOnRestart ? { outputVideoUrl: null } : {}),
              },
            })
          : await prisma.animationExport.create({
              data: {
                projectId,
                status: "rendering",
                progress: mergeStartProgress,
                provider: exportProvider,
              },
            });

    await prisma.animationProject.update({
      where: { id: projectId },
      data: {
        status: "rendering",
        lastOverlayError: null,
        failureReason: null,
        instantWorkerJobStatus: "running",
        instantWorkerJobStartedAt: new Date(),
      },
    });

    const mergeTextRenderMode = normalizeTextRenderMode(mergeProject.instantTextRenderMode);
    const mergeAssemblyMode = resolveFinalAssemblyMode(
      mergeTextRenderMode,
      mergeProject.instantPosterMotionSettings
    );
    const rebuildId = isFinalRebuild ? String(Date.now()) : null;
    let workDir: string;
    let finalAbs: string;
    let previousFinalHash: string | null = null;

    if (isFinalRebuild && rebuildId) {
      previousFinalHash = rebuildPreviousFinalUrl?.startsWith("http")
        ? await hashRemoteVideoUrl(rebuildPreviousFinalUrl)
        : rebuildPreviousFinalUrl
          ? await hashFileSha256(rebuildPreviousFinalUrl).catch(() => null)
          : null;
      workDir = await createCleanRebuildWorkspace(projectId, rebuildId);
      startRebuildAssemblyTrace({
        projectId,
        rebuildId,
        workspacePath: workDir,
        previousFinalHash,
      });
      finalAbs = path.join(workDir, `final-rebuild-${rebuildId}.mp4`);
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "strictRebuildWorkspace",
        rebuildId,
        workDir,
        finalAbs,
        previousFinalHash,
      });
    } else {
      workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-instant-merge-${projectId}-`));
      const outDir = absolutePublicPath("generated", "animations", "projects", projectId);
      await ensureDir(outDir);
      finalAbs = path.join(outDir, "final.mp4");
    }

    setFinalExportStage(projectId, "download_segments", { exportId: exportRow.id });

    let orderedSegments: Awaited<
      ReturnType<typeof prepareFinalSegmentProviderVideos>
    >["orderedSegments"];
    let segmentPaths: string[] = [];
    let assemblyTimeline: Awaited<
      ReturnType<typeof prepareFinalSegmentProviderVideos>
    >["timeline"] = [];
    let segmentSourceDurationsSec: number[] = [];

    try {
      const prepared = await prepareFinalSegmentProviderVideos({
        projectId,
        instantMode: mergeProject.instantMode,
        images: mergeProject.images.map((img) => ({ id: img.id, order: img.order })),
        strictRebuild: isFinalRebuild,
        transitions: mergeProject.transitions.map((t) => ({
          id: t.id,
          order: t.order,
          startImageId: t.startImageId,
          endImageId: t.endImageId,
          status: t.status,
          provider: t.provider,
          providerJobId: t.providerJobId,
          outputVideoUrl: t.outputVideoUrl,
          updatedAt: t.updatedAt,
        })),
        workDir,
      });
      orderedSegments = prepared.orderedSegments;
      segmentPaths = prepared.providerVideoPaths;
      assemblyTimeline = prepared.timeline;
      segmentSourceDurationsSec = prepared.sourceLogs.map((log) => log.durationSec);
    } catch (sourceError) {
      if (
        sourceError instanceof FinalSegmentSourceError ||
        sourceError instanceof ProviderVideoPipelineError ||
        sourceError instanceof FinalAssemblyTransitionCountMismatchError ||
        sourceError instanceof SegmentTrimTooAggressiveError
      ) {
        const message =
          sourceError instanceof Error ? sourceError.message : "Final assembly failed.";
        await prisma.animationExport.update({
          where: { id: exportRow.id },
          data: {
            status: "failed",
            progress: 65,
            errorMessage: message,
            outputVideoUrl: null,
          },
        });
        await prisma.animationProject.update({
          where: { id: projectId },
          data: {
            status: "failed",
            failureReason: "merge_failed",
            instantWorkerJobStatus: "failed",
          },
        });
        logFinalExportFailed({
          projectId,
          exportId: exportRow.id,
          provider: exportProvider,
          stage: "merge_clips",
          failureReason: "merge_failed",
          failureMessage: message,
          workerError: message,
        });
        return;
      }
      throw sourceError;
    }

    console.info("[hc-instant-premium]", {
      projectId,
      phase: "mergeStart",
      mergeStart: true,
      segmentCount: orderedSegments.length,
      exportProvider,
      finalAssemblyMode: mergeAssemblyMode,
    });

    const transitionById = new Map(project.transitions.map((t) => [t.id, t]));

    try {
      const lockedLayers = parseLockedTextLayersJson(project.instantLockedTextLayers);
      const textRenderMode = normalizeTextRenderMode(project.instantTextRenderMode);
      const overlayStyle = normalizeOverlayStyle(project.instantHybridOverlayStyle);
      const plainConcatSafeMode = isPlainConcatSafeMode();
      if (plainConcatSafeMode) {
        console.info("[final-assembly-safe-mode]", {
          projectId,
          mode: "plain_concat",
          note: "skipping_compositor_overlay_seamless_joins",
        });
      }
      const finalAssemblyMode = plainConcatSafeMode
        ? "concat_segments_only"
        : resolveFinalAssemblyMode(textRenderMode, project.instantPosterMotionSettings);
      const runSegmentCompositor =
        !plainConcatSafeMode && shouldRunSegmentCompositor(finalAssemblyMode);
      const blendStrength = resolvePosterMotionBlendStrength(
        parsePosterMotionSettings(project.instantPosterMotionSettings)
      );
      const expectedDurationSec = project.instantOutputDurationSeconds ?? 8;
      const perSegmentDurationSec = project.viduDurationSeconds ?? null;
      const polishProfile = resolvePremiumPolishProfile(project.instantPosterMotionSettings);
      const segmentTransitionType = resolveSafeModeSegmentTransitionType(
        polishProfile.segmentTransitionType
      );
      const assemblyLogBase = buildFinalAssemblyLogBase({
        projectId,
        assemblyMode: finalAssemblyMode,
        segmentCount: orderedSegments.length,
        transitionType: segmentTransitionType,
        blendStrength,
      });
      const imageById = new Map(project.images.map((img) => [img.id, img]));

      const segmentUrls = orderedSegments.map((seg) => seg.outputVideoUrl);
      for (const seg of orderedSegments) {
        logMergeSegment({
          projectId,
          segmentCount: orderedSegments.length,
          segmentIndex: seg.segmentIndex,
          segmentUrl: seg.outputVideoUrl,
          duration: perSegmentDurationSec,
          mode: textRenderMode,
        });
      }

      console.info("[hc-instant-premium]", {
        projectId,
        phase: "finalAssemblyTimeline",
        timeline: assemblyTimeline,
        allowStaticFallback,
      });

      const expectedAssemblySegments = expectedAssemblySegmentCount(
        mergeProject.images.length,
        mergeProject.instantMode
      );
      validateMergeSegmentsBeforeExport(
        buildMergeSegmentsValidationInput({
          projectId,
          instantMode: mergeProject.instantMode,
          imageCount: mergeProject.images.length,
          concatInputCount: segmentPaths.length,
          expectedDurationSec,
          perSegmentDurationSec,
          segmentUrls,
          probedSegmentDurationsSec: segmentSourceDurationsSec,
        })
      );
      validateUniqueConcatPaths(segmentPaths);

      console.info("[merge-segments]", {
        projectId,
        segmentCount: orderedSegments.length,
        phase: "concatReady",
        segmentUrls,
        duration: perSegmentDurationSec,
        mode: textRenderMode,
        expectedDurationSec,
      });

      let pathsToConcat = segmentPaths;
      let concatSourceTypes: string[] | undefined;
      const lockCanonicalConcat = options?.adminRepairMode !== true;
      const mergeMaxWidth = getFinalMergeMaxWidthFromViduResolution(project.viduResolution);

      logFinalAssembly({
        ...assemblyLogBase,
        phase: "assembly_start",
      });

      if (runSegmentCompositor) {
        const polishProfile = resolvePremiumPolishProfile(project.instantPosterMotionSettings);
        const textLockMode = resolveTextLockMode(
          polishProfile.animationStyleId,
          polishProfile.textLockMode
        );
        const posterSegments = orderedSegments
          .map((seg) => {
            const transition = transitionById.get(seg.transitionId);
            if (!transition) {
              return null;
            }
            const startImage = imageById.get(transition.startImageId);
            const baseUrl = startImage?.previewUrl?.trim();
            if (!baseUrl) {
              return null;
            }
            const blocks = parseBakedTextBlockRecords(startImage?.bakedTextBlocksJson);
            const lockedTextRegions = buildLockedTextRegionsFromBlocks(blocks, textLockMode);
            return {
              segmentPath: segmentPaths[seg.segmentIndex]!,
              baseImageUrl: baseUrl,
              segmentIndex: seg.segmentIndex,
              sourceSegmentUrl: segmentUrls[seg.segmentIndex]!,
              posterImageId: startImage?.id ?? transition.startImageId,
              lockedTextRegions,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (posterSegments.length !== orderedSegments.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Missing poster base image for one or more segments (${posterSegments.length}/${orderedSegments.length}).`
          );
        }

        const segmentDurationSec = perSegmentDurationSec ?? expectedDurationSec;
        const posterComposite = await compositePosterMotionPreserveSegments({
          projectId,
          workDir,
          segments: posterSegments,
          segmentDurationSec,
          maxWidth: mergeMaxWidth,
          posterMotionSettings: project.instantPosterMotionSettings,
          finalAssemblyMode,
          segmentCount: orderedSegments.length,
          blendStrength,
        });
        if (posterComposite.segmentPaths.length !== segmentPaths.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Poster compositor returned ${posterComposite.segmentPaths.length} segments; expected ${segmentPaths.length}.`
          );
        }
        if (posterComposite.compositorAppliedCount < orderedSegments.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Poster compositor did not apply to all segments (${posterComposite.compositorAppliedCount}/${orderedSegments.length}).`
          );
        }
        if (posterComposite.passthroughFallbackCount > 0) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Plain segment passthrough is not allowed for ${finalAssemblyMode} (${posterComposite.passthroughFallbackCount} segments).`
          );
        }
        if (posterComposite.staticFallbackCount > 0 && !allowStaticFallback) {
          throw new FinalSegmentSourceError(
            INVALID_FINAL_ASSEMBLY_SOURCE,
            `[${projectId}] Poster compositor produced ${posterComposite.staticFallbackCount} static still segment(s); not allowed for completed projects.`
          );
        }
        const compositorResultBySegmentIndex = new Map(
          posterSegments.map((seg, idx) => [
            seg.segmentIndex,
            posterComposite.segmentResults[idx],
          ])
        );
        if (lockCanonicalConcat) {
          console.info("[canonical-concat-lock]", {
            projectId,
            segmentCount: orderedSegments.length,
            note: "concat_locked_to_fresh_canonical_provider_downloads",
          });
          pathsToConcat = [...segmentPaths];
          concatSourceTypes = orderedSegments.map(() => "animated_vidu" as const);
        } else {
          const resolvedConcat = await resolveFinalConcatSegmentPaths({
            segments: posterSegments.map((seg) => ({
              segmentIndex: seg.segmentIndex,
              animatedViduPath: segmentPaths[seg.segmentIndex]!,
              compositorResult: compositorResultBySegmentIndex.get(seg.segmentIndex),
            })),
            expectedSegmentCount: orderedSegments.length,
            allowStaticFallback,
          });
          pathsToConcat = resolvedConcat.paths;
          concatSourceTypes = resolvedConcat.sourceTypes;
          assertNoInvalidAssemblySources({
            projectId,
            sourceKinds: resolvedConcat.sourceKinds,
            segmentIndexes: orderedSegments.map((s) => s.segmentIndex),
          });
        }
        console.info("[hc-instant-premium]", {
          projectId,
          phase: "posterMotionSegmentsCompositeApplied",
          finalAssemblyMode,
          segmentCount: orderedSegments.length,
          motionBlendAppliedCount: posterComposite.motionBlendAppliedCount,
          compositorAppliedCount: posterComposite.compositorAppliedCount,
          passthroughFallbackCount: posterComposite.passthroughFallbackCount,
          staticFallbackCount: posterComposite.staticFallbackCount,
          blendStrength,
          lockCanonicalConcat,
        });
      }

      if (lockCanonicalConcat) {
        assertConcatLockedToCanonicalProviderPaths({
          projectId,
          canonicalProviderVideoPaths: segmentPaths,
          concatInputPaths: pathsToConcat,
        });
      }

      await assertSegmentsAnimatedBeforeConcat({
        projectId,
        paths: pathsToConcat,
        animatedViduPaths: segmentPaths,
      });

      const imagePreviewById = new Map(
        project.images.map((img) => [img.id, img.previewUrl ?? null])
      );
      const joinPlans = plainConcatSafeMode
        ? []
        : await buildSeamlessJoinPlansForOrderedSegments({
            orderedSegments,
            imagePreviewById,
            transitionType: segmentTransitionType,
          });

      const mapEntries = buildConcatSegmentMapEntries({
        segments: orderedSegments,
        pathsToConcat,
        localSegmentPaths: segmentPaths,
        joinPlans,
        sourceTypes: concatSourceTypes,
      });
      for (const entry of mapEntries) {
        const probed = await probeVideoSegment(entry.selectedSourcePath);
        entry.outputDurationSec = probed?.durationSec;
        if (isFinalRebuild) {
          const concatInputHash = await hashFileSha256(entry.selectedSourcePath);
          const seg = orderedSegments.find((s) => s.segmentIndex === entry.segmentIndex);
          const transition = seg ? transitionById.get(seg.transitionId) : null;
          upsertRebuildSegmentTrace(projectId, {
            transitionId: seg?.transitionId ?? transition?.id ?? `seg-${entry.segmentIndex}`,
            segmentIndex: entry.segmentIndex,
            sourceVideoUrl: segmentUrls[entry.segmentIndex] ?? "",
            downloadedFilePath: segmentPaths[entry.segmentIndex] ?? "",
            downloadedFileHash: await hashFileSha256(
              segmentPaths[entry.segmentIndex] ?? entry.selectedSourcePath
            ).catch(() => concatInputHash),
            concatInputPath: entry.selectedSourcePath,
            concatInputHash,
            durationSec: probed?.durationSec,
          });
        }
      }
      logConcatSegmentMap(mapEntries);
      await assertFinalConcatInputOrder({
        projectId,
        paths: pathsToConcat,
        segmentCount: orderedSegments.length,
      });

      logFinalAssembly({
        ...assemblyLogBase,
        processedSegmentCount: pathsToConcat.length,
        phase: "assembly_complete",
        compositorDetail: runSegmentCompositor ? "blend" : "concat",
      });

      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { progress: 70, status: "rendering" },
      });
      assertFinalConcatInputCount({
        projectId,
        expectedTransitionCount: expectedAssemblySegments,
        actualConcatInputCount: pathsToConcat.length,
      });

      const concatInputRows = await Promise.all(
        mapEntries.map(async (entry) => {
          const seg = orderedSegments.find((s) => s.segmentIndex === entry.segmentIndex);
          const transition = seg ? transitionById.get(seg.transitionId) : null;
          const probed = await probeVideoSegment(entry.selectedSourcePath);
          const hash = await hashFileSha256(entry.selectedSourcePath).catch(() => undefined);
          return {
            concatIndex: entry.segmentIndex,
            transitionId: seg?.transitionId ?? transition?.id ?? `seg-${entry.segmentIndex}`,
            transitionOrder: transition?.order ?? entry.segmentIndex,
            startImageId: transition?.startImageId ?? "",
            endImageId: transition?.endImageId ?? "",
            path: entry.selectedSourcePath,
            durationSec: probed?.durationSec,
            frameCount:
              probed?.durationSec != null
                ? Math.max(1, Math.round(probed.durationSec * 30))
                : undefined,
            hash,
          };
        })
      );
      logFinalConcatInputs({
        projectId,
        expectedTransitionCount: expectedAssemblySegments,
        actualConcatInputCount: pathsToConcat.length,
        concatInputs: concatInputRows,
      });

      setFinalExportStage(projectId, "concat", { exportId: exportRow.id });
      const concatResult = await concatMotionSegmentsWithTransitions({
        workDir,
        segmentPaths: pathsToConcat,
        outputFile: finalAbs,
        maxWidth: mergeMaxWidth,
        transitionType: segmentTransitionType,
        joinPlans,
      });
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "segmentTransitionConcatComplete",
        ...concatResult,
        transitionPreview: concatResult.transitionPreview,
      });
      let mergedPath = finalAbs;

      if (!plainConcatSafeMode && polishProfile.minimalCompositorPolish) {
        const polishedPath = path.join(workDir, "final-minimal-polish.mp4");
        const applied = await applyMinimalPolishToVideo({
          inputPath: mergedPath,
          outputPath: polishedPath,
          fxPreset: polishProfile.fxPreset,
        });
        if (applied) {
          mergedPath = polishedPath;
          console.info("[hc-instant-premium]", {
            projectId,
            phase: "minimalCompositorPolishApplied",
            fxPreset: polishProfile.fxPreset,
          });
        }
      }

      const pendingRender = readPendingFullRerender(project.instantFinalRebuildAuditJson);
      const isTextRebuild = project.instantFinalRebuildStatus === "running";
      const finalBlobVersion = resolveFinalBlobVersionForUpload({
        pendingRenderVersionNumber: pendingRender?.renderVersionNumber ?? null,
        isMergeOnlyTextRebuild: isTextRebuild,
        nextTextRebuildCount: project.instantFinalRebuildCount + 1,
      });
      const cleanUrl = await persistCleanFinalVideoUrl(projectId, mergedPath, finalBlobVersion);

      const storyMode = parseInstantMode(project.instantMode) === "story";
      const storySceneTexts = parseInstantSceneTexts(project.instantSceneTexts);
      if (storyMode && storySceneTexts.some((s) => hasSceneOverlayContent(s))) {
        setFinalExportStage(projectId, "overlay", { exportId: exportRow.id });
        const withStoryPath = path.join(workDir, "final-with-story-text.mp4");
        const probedMerged = await probeVideoSegment(mergedPath);
        const dims = resolveInstantVideoDimensions(project.aspectRatio, project.viduResolution);
        const overlayDurationSec =
          probedMerged?.durationSec ??
          project.instantOutputDurationSeconds ??
          expectedDurationSec;
        try {
          const orderedImages = [...(project.images ?? [])].sort((a, b) => a.order - b.order);
          await applyStorySceneTextOverlay({
            inputVideoPath: mergedPath,
            outputVideoPath: withStoryPath,
            sceneTexts: storySceneTexts,
            durationSeconds: overlayDurationSec,
            width: probedMerged?.width ?? dims.width,
            height: probedMerged?.height ?? dims.height,
            workDir,
            projectId,
            aspectRatio: project.aspectRatio ?? "9:16",
            projectDetectedTextMetadata: project.instantDetectedTextMetadata,
            imageMeta: orderedImages.map((img) => ({
              imageId: img.id,
              order: img.order,
              bakedTextBlocksJson: img.bakedTextBlocksJson,
            })),
          });
          mergedPath = withStoryPath;
          console.info("[hc-instant-premium]", {
            projectId,
            phase: "storySceneTextOverlayComplete",
            durationSec: overlayDurationSec,
          });
        } catch (overlayError) {
          const safeMessage = sanitizeOverlayError(
            overlayError instanceof Error ? overlayError.message : "Story text overlay failed."
          );
          if (pendingRender?.renderVersionId) {
            await attachCleanVideoToPendingRenderVersion({
              renderVersionId: pendingRender.renderVersionId,
              cleanVideoUrl: cleanUrl,
            }).catch(() => undefined);
          }
          await prisma.animationExport.update({
            where: { id: exportRow.id },
            data: {
              status: "failed_overlay",
              progress: 75,
              errorMessage: safeMessage,
              outputVideoUrl: null,
            },
          });
          await prisma.animationProject.update({
            where: { id: projectId },
            data: {
              status: "failed_overlay",
              lastOverlayError: safeMessage,
              failureReason: "overlay_failed",
              instantWorkerJobStatus: "failed",
            },
          });
          logFinalExportFailed({
            projectId,
            exportId: exportRow.id,
            provider: exportProvider,
            stage: "story_text_overlay",
            failureReason: "overlay_failed",
            failureMessage: safeMessage,
            workerError: safeMessage,
          });
          return;
        }
      }

      const needsOverlay =
        !plainConcatSafeMode &&
        !storyMode &&
        shouldApplyOcrTextOverlay(textRenderMode) &&
        textRenderMode !== "none" &&
        project.instantLockedTextMode &&
        lockedLayers.length > 0 &&
        lockedLayers.some((layer) => layer.text.trim().length > 0);
      if (needsOverlay) {
        setFinalExportStage(projectId, "overlay", { exportId: exportRow.id });
        const withTextPath = path.join(workDir, "final-with-locked-text.mp4");
        const totalDurationMs = (project.instantOutputDurationSeconds ?? 8) * 1000;
        const segmentDurationSec = project.viduDurationSeconds ?? 4;
        try {
          const overlayResult = await applyBestTextOverlayForProject({
            projectId,
            inputVideoPath: mergedPath,
            outputVideoPath: withTextPath,
            images: project.images.map((img) => ({
              order: img.order,
              instantTextPatches: img.instantTextPatches,
            })),
            aspectRatio: project.aspectRatio,
            viduResolution: project.viduResolution,
            totalDurationMs,
            segmentCount: orderedSegments.length,
            segmentDurationSec,
            overlayStyle,
            textRenderMode,
            lockedLayers,
          });
          console.info("[hc-instant-premium]", {
            projectId,
            phase: "textOverlayComplete",
            overlayMethod: overlayResult.method,
            trackingMode: overlayResult.trackingMode,
          });
          mergedPath = withTextPath;
        } catch (overlayError) {
          const safeMessage = sanitizeOverlayError(
            overlayError instanceof Error ? overlayError.message : "Locked text overlay failed."
          );
          if (pendingRender?.renderVersionId) {
            await attachCleanVideoToPendingRenderVersion({
              renderVersionId: pendingRender.renderVersionId,
              cleanVideoUrl: cleanUrl,
            }).catch(() => undefined);
          }
          await prisma.animationExport.update({
            where: { id: exportRow.id },
            data: {
              status: "failed_overlay",
              progress: 75,
              errorMessage: safeMessage,
              outputVideoUrl: null,
            },
          });
          await prisma.animationProject.update({
            where: { id: projectId },
            data: {
              status: "failed_overlay",
              lastOverlayError: safeMessage,
              failureReason: "overlay_failed",
              instantWorkerJobStatus: "failed",
            },
          });
          logFinalExportFailed({
            projectId,
            exportId: exportRow.id,
            provider: exportProvider,
            stage: "poster_compositing",
            failureReason: "overlay_failed",
            failureMessage: safeMessage,
            workerError: safeMessage,
          });
          return;
        }
      }
      const probedMerged = await probeVideoSegment(mergedPath);
      const mergedDims = resolveInstantVideoDimensions(project.aspectRatio, project.viduResolution);
      const voiceExportSettings = readMotionAudioExportFromHandoffJson(project.studioHandoffJson);
      if (voiceExportSettings) {
        setFinalExportStage(projectId, "overlay", { exportId: exportRow.id });
        const voiceResult = await applyStudioVoiceExportToMergedVideo({
          projectId,
          mergedVideoPath: mergedPath,
          workDir,
          studioHandoffJson: project.studioHandoffJson,
          width: probedMerged?.width ?? mergedDims.width,
          height: probedMerged?.height ?? mergedDims.height,
        });
        mergedPath = voiceResult.outputVideoPath;
        if (voiceResult.warning) {
          await prisma.animationProject.update({
            where: { id: projectId },
            data: { lastOverlayError: sanitizeOverlayError(voiceResult.warning) },
          });
          console.warn("[hc-instant-premium]", {
            projectId,
            phase: "studioVoiceExportPartial",
            warning: voiceResult.warning,
            audioMuxed: voiceResult.audioMuxed,
            subtitleBurned: voiceResult.subtitleBurned,
          });
        }
      }

      const perfResult = await applyStudioCharacterPerformanceExportToMergedVideo({
        projectId,
        mergedVideoPath: mergedPath,
        workDir,
        studioHandoffJson: project.studioHandoffJson,
        width: probedMerged?.width ?? mergedDims.width,
        height: probedMerged?.height ?? mergedDims.height,
      });
      mergedPath = perfResult.outputVideoPath;
      if (perfResult.warning) {
        const perfWarning = sanitizeOverlayError(perfResult.warning);
        await prisma.animationProject.update({
          where: { id: projectId },
          data: { lastOverlayError: perfWarning },
        });
        console.warn("[hc-instant-premium]", {
          projectId,
          phase: "studioPerformanceExportPartial",
          warning: perfResult.warning,
          performanceApplied: perfResult.performanceApplied,
        });
      }

      const stat = await fs.stat(mergedPath).catch(() => null);
      if (!stat || stat.size <= 0) {
        throw new Error("Final merged video is empty.");
      }
      if (mergedPath !== finalAbs) {
        await fs.copyFile(mergedPath, finalAbs);
      }

      let rebuildFinalize: Awaited<ReturnType<typeof finalizeRebuildOutput>> | null = null;
      if (isFinalRebuild && rebuildId) {
        const finalOutputHash = await hashFileSha256(mergedPath);
        rebuildFinalize = await finalizeRebuildOutput({
          projectId,
          rebuildId,
          finalOutputPath: mergedPath,
          finalOutputHash,
          previousFinalHash,
          expectedSegmentCount: expectedAssemblySegments,
          perSegmentDurationSec,
        });
        if (rebuildFinalize.identicalOutputDetected) {
          console.warn("[hc-instant-premium]", {
            projectId,
            phase: "rebuildIdenticalOutputWarning",
            identicalOutputDetected: true,
            validationOk: rebuildFinalize.validationOk,
            rebuildCandidateUrl: rebuildFinalize.rebuildCandidateUrl,
            plainConcatSafeMode: rebuildFinalize.plainConcatSafeMode,
          });
        }
      }

      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { progress: 85, status: "rendering" },
      });
      setFinalExportStage(projectId, "upload", { exportId: exportRow.id });
      const isRebuild = isTextRebuild;
      const nextRebuildCount = isRebuild ? project.instantFinalRebuildCount + 1 : 0;
      const previousFinalUrl =
        project.instantPreviousFinalVideoUrl?.trim() ??
        latestExport?.outputVideoUrl?.trim() ??
        null;
      const finalUrl = await uploadMergedVideoToBlob(projectId, mergedPath, {
        rebuildVersion: finalBlobVersion,
        previousFinalUrl,
      });
      await commitInstantPremiumFinalVideoExport({
        projectId,
        exportId: exportRow.id,
        finalUrl,
        cleanVideoUrl: cleanUrl,
        lockedLayers,
        isRebuild,
        previousFinalUrl,
        nextRebuildCount,
        segmentCount: orderedSegments.length,
        rebuildCandidateUrl: rebuildFinalize?.rebuildCandidateUrl ?? null,
        identicalOutputDetected: rebuildFinalize?.identicalOutputDetected ?? false,
        validationOk: rebuildFinalize?.validationOk ?? true,
      });
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "mergeComplete",
        mergeOutputBytes: stat.size,
        finalVideoUrl: finalUrl,
        completed: true,
        rebuildCount: isRebuild ? nextRebuildCount : undefined,
      });
    } catch (error) {
      const uploadCode = classifyExportBlobFailure(error);
      const blobAuthFailed = uploadCode === "EXPORT_UPLOAD_AUTH_FAILED";
      const timedOut = isTimeoutLikeError(error);
      const validationFailed =
        error instanceof RebuildOutputValidationError ||
        (error instanceof Error &&
          error.message.includes(REBUILD_OUTPUT_VALIDATION_FAILED));
      const staleRebuild =
        !validationFailed &&
        (error instanceof StaleRebuildOutputError ||
          (error instanceof Error && error.message.includes(STALE_REBUILD_OUTPUT)));
      const failedTrace = getRebuildAssemblyTrace(projectId);
      const failedCandidateUrl = failedTrace?.rebuildCandidateUrl ?? null;
      const message =
        validationFailed
          ? error instanceof Error
            ? error.message
            : `[${REBUILD_OUTPUT_VALIDATION_FAILED}] Rebuild validation failed.`
          : staleRebuild
          ? error instanceof Error
            ? error.message
            : `[${STALE_REBUILD_OUTPUT}] Rebuild produced stale final output.`
          : timedOut && isFinalRebuild
          ? `[${REBUILD_FAILED_TIMEOUT}] ${
              error instanceof Error ? error.message : "Final export timed out."
            }`
          : error instanceof FinalSegmentSourceError
          ? error.message
          : error instanceof ProviderVideoPipelineError
          ? error.message
          : error instanceof FinalAssemblyTransitionCountMismatchError
          ? error.message
          : error instanceof SegmentTrimTooAggressiveError
          ? error.message
          : error instanceof MergeSegmentsValidationError
          ? error.message
          : error instanceof InvalidSegmentMappingError
          ? error.message
          : error instanceof ExportBlobUploadError
            ? exportBlobErrorMessage(error.code)
            : blobAuthFailed
              ? exportBlobErrorMessage("EXPORT_UPLOAD_AUTH_FAILED")
              : sanitizeOverlayError(
                  error instanceof Error ? error.message : "Instant merge failed."
                );
      if (blobAuthFailed) {
        logExportBlobUploadFailure(error, {
          phase: "merge-final-upload",
          projectId,
          uploadTarget: finalBlobPathname(projectId),
          provider: FINAL_BLOB_PROVIDER,
        });
      }
      const failureReason = blobAuthFailed ? "export_upload_auth_failed" : "merge_failed";
      const failedProgress = blobAuthFailed ? 85 : 70;
      const failedStage = blobAuthFailed ? "upload_storage" : "merge_clips";
      if (isFinalRebuild && rebuildPreviousFinalUrl) {
        await markInstantPremiumFinalRebuildFailed({
          projectId,
          exportId: exportRow.id,
          previousFinalUrl: rebuildPreviousFinalUrl,
          segmentCount: orderedSegments.length,
          rebuildCount: project.instantFinalRebuildCount + 1,
          message,
          failureReason,
          provider: exportProvider,
          failedStage,
          rebuildCandidateUrl: failedCandidateUrl,
          validationErrors: validationFailed
            ? failedTrace?.validationErrors ?? []
            : [],
        });
      } else {
        await prisma.animationExport.update({
          where: { id: exportRow.id },
          data: {
            status: "failed",
            progress: failedProgress,
            errorMessage: message,
            outputVideoUrl: null,
          },
        });
        await prisma.animationProject.update({
          where: { id: projectId },
          data: {
            status: "failed",
            failureReason,
            lastOverlayError: null,
            instantWorkerJobStatus: "failed",
          },
        });
        await markFullRerenderFailedIfRunning(projectId, message);
        logFinalExportFailed({
          projectId,
          exportId: exportRow.id,
          provider: exportProvider,
          stage: failedStage,
          failureReason,
          failureMessage: message,
          workerError: message,
        });
      }
      console.info("[hc-instant-premium]", {
        projectId,
        phase: "failed",
        error: message,
        uploadCode: blobAuthFailed ? "EXPORT_UPLOAD_AUTH_FAILED" : undefined,
      });
    } finally {
      clearFinalExportStage(projectId);
      if (isFinalRebuild) {
        await removeRebuildWorkspace(workDir);
        await purgeStaleProjectMergeArtifacts(projectId).catch(() => undefined);
      } else {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  });
}
