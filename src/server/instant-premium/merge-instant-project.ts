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
  validateMergeSegmentsBeforeExport,
} from "@/server/instant-premium/merge-segments";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { parseBakedTextBlockRecords } from "@/lib/baked-text-detection";
import {
  buildLockedTextRegionsFromBlocks,
  resolveTextLockMode,
} from "@/lib/hard-text-lock";
import { buildSegmentJoinPlansForProject } from "@/server/instant-premium/build-segment-join-plans";
import {
  concatMotionSegmentsWithTransitions,
} from "@/server/instant-premium/segment-transition";
import { applyMinimalPolishToVideo } from "@/server/instant-premium/apply-minimal-polish";
import { applyBestTextOverlayForProject } from "@/server/instant-premium/hybrid-overlay/text-patch-compositor";
import { isExportMergeStuck } from "@/server/instant-premium/finalize-repair";
import { finalBlobPathname } from "@/lib/final-video-storage";
import {
  commitInstantPremiumFinalVideoExport,
  markInstantPremiumFinalRebuildFailed,
} from "@/server/instant-premium/final-video-export-commit";
import { replaceFinalVideoBlobSafely } from "@/server/instant-premium/replace-final-video-blob";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";

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

async function resolveTransitionVideoToSegment(
  url: string,
  workDir: string,
  index: number
): Promise<string> {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    if (!(await pathExists(abs))) {
      throw new Error(`Missing local segment: ${trimmed}`);
    }
    return abs;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const response = await fetch(trimmed, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw new Error(`Could not download segment URL ${trimmed} (HTTP ${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      throw new Error(`Downloaded empty segment for ${trimmed}`);
    }
    const dest = path.join(workDir, `segment-${index}.mp4`);
    await fs.writeFile(dest, buffer);
    return dest;
  }
  throw new Error(`Unsupported segment URL: ${trimmed}`);
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

    const completed = project.transitions.filter(
      (t) => t.status === "completed" && t.outputVideoUrl?.trim()
    );
    if (completed.length !== project.transitions.length || completed.length === 0) {
      return;
    }

    const isFinalRebuild = project.instantFinalRebuildStatus === "running";
    const rebuildPreviousFinalUrl =
      project.instantPreviousFinalVideoUrl?.trim() ??
      latestExport?.outputVideoUrl?.trim() ??
      null;
    const mergeStartProgress = isFinalRebuild ? 70 : 10;
    const clearOutputOnRestart = !isFinalRebuild;
    const exportRow =
      latestExport?.status === "failed" || latestExport?.status === "failed_overlay"
        ? await prisma.animationExport.update({
            where: { id: latestExport.id },
            data: {
              status: "rendering",
              progress: mergeStartProgress,
              errorMessage: null,
              ...(clearOutputOnRestart ? { outputVideoUrl: null } : {}),
            },
          })
        : latestExport
          ? await prisma.animationExport.update({
              where: { id: latestExport.id },
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

    const mergeTextRenderMode = normalizeTextRenderMode(project.instantTextRenderMode);
    const mergeAssemblyMode = resolveFinalAssemblyMode(
      mergeTextRenderMode,
      project.instantPosterMotionSettings
    );
    console.info("[hc-instant-premium]", {
      projectId,
      phase: "mergeStart",
      mergeStart: true,
      segmentCount: completed.length,
      exportProvider,
      finalAssemblyMode: mergeAssemblyMode,
    });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-instant-merge-${projectId}-`));
    const outDir = absolutePublicPath("generated", "animations", "projects", projectId);
    await ensureDir(outDir);
    const finalAbs = path.join(outDir, "final.mp4");
    try {
      const lockedLayers = parseLockedTextLayersJson(project.instantLockedTextLayers);
      const textRenderMode = normalizeTextRenderMode(project.instantTextRenderMode);
      const overlayStyle = normalizeOverlayStyle(project.instantHybridOverlayStyle);
      const finalAssemblyMode = resolveFinalAssemblyMode(
        textRenderMode,
        project.instantPosterMotionSettings
      );
      const runSegmentCompositor = shouldRunSegmentCompositor(finalAssemblyMode);
      const blendStrength = resolvePosterMotionBlendStrength(
        parsePosterMotionSettings(project.instantPosterMotionSettings)
      );
      const expectedDurationSec = project.instantOutputDurationSeconds ?? 8;
      const perSegmentDurationSec = project.viduDurationSeconds ?? null;
      const polishProfile = resolvePremiumPolishProfile(project.instantPosterMotionSettings);
      const segmentTransitionType = polishProfile.segmentTransitionType;
      const assemblyLogBase = buildFinalAssemblyLogBase({
        projectId,
        assemblyMode: finalAssemblyMode,
        segmentCount: completed.length,
        transitionType: segmentTransitionType,
        blendStrength,
      });
      const imageById = new Map(project.images.map((img) => [img.id, img]));

      const segmentPaths: string[] = [];
      const segmentUrls: string[] = [];
      for (let i = 0; i < completed.length; i += 1) {
        const segmentUrl = completed[i].outputVideoUrl!.trim();
        segmentUrls.push(segmentUrl);
        logMergeSegment({
          projectId,
          segmentCount: completed.length,
          segmentIndex: i,
          segmentUrl,
          duration: perSegmentDurationSec,
          mode: textRenderMode,
        });
        segmentPaths.push(await resolveTransitionVideoToSegment(segmentUrl, workDir, i));
      }

      validateMergeSegmentsBeforeExport({
        projectId,
        segmentCount: completed.length,
        concatInputCount: segmentPaths.length,
        expectedDurationSec,
        perSegmentDurationSec,
        segmentUrls,
      });

      console.info("[merge-segments]", {
        projectId,
        segmentCount: completed.length,
        phase: "concatReady",
        segmentUrls,
        duration: perSegmentDurationSec,
        mode: textRenderMode,
        expectedDurationSec,
      });

      let pathsToConcat = segmentPaths;
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
        const posterSegments = completed
          .map((transition, segmentIndex) => {
            const startImage = imageById.get(transition.startImageId);
            const baseUrl = startImage?.previewUrl?.trim();
            if (!baseUrl) {
              return null;
            }
            const blocks = parseBakedTextBlockRecords(startImage?.bakedTextBlocksJson);
            const lockedTextRegions = buildLockedTextRegionsFromBlocks(blocks, textLockMode);
            return {
              segmentPath: segmentPaths[segmentIndex]!,
              baseImageUrl: baseUrl,
              segmentIndex,
              sourceSegmentUrl: segmentUrls[segmentIndex]!,
              posterImageId: startImage?.id ?? transition.startImageId,
              lockedTextRegions,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (posterSegments.length !== completed.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Missing poster base image for one or more segments (${posterSegments.length}/${completed.length}).`
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
          segmentCount: completed.length,
          blendStrength,
        });
        if (posterComposite.segmentPaths.length !== segmentPaths.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Poster compositor returned ${posterComposite.segmentPaths.length} segments; expected ${segmentPaths.length}.`
          );
        }
        if (posterComposite.compositorAppliedCount < completed.length) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Poster compositor did not apply to all segments (${posterComposite.compositorAppliedCount}/${completed.length}).`
          );
        }
        if (posterComposite.passthroughFallbackCount > 0) {
          throw new MergeSegmentsValidationError(
            `[${projectId}] Plain segment passthrough is not allowed for ${finalAssemblyMode} (${posterComposite.passthroughFallbackCount} segments).`
          );
        }
        pathsToConcat = posterComposite.segmentPaths;
        console.info("[hc-instant-premium]", {
          projectId,
          phase: "posterMotionSegmentsCompositeApplied",
          finalAssemblyMode,
          segmentCount: completed.length,
          motionBlendAppliedCount: posterComposite.motionBlendAppliedCount,
          compositorAppliedCount: posterComposite.compositorAppliedCount,
          passthroughFallbackCount: posterComposite.passthroughFallbackCount,
          staticFallbackCount: posterComposite.staticFallbackCount,
          blendStrength,
        });
      }

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
      const sortedCompleted = [...completed].sort((a, b) => a.order - b.order);
      const joinPlans = await buildSegmentJoinPlansForProject({
        transitions: sortedCompleted.map((t) => {
          const startImg = imageById.get(t.startImageId);
          const endImg = imageById.get(t.endImageId);
          return {
            order: t.order,
            startImageId: t.startImageId,
            endImageId: t.endImageId,
            startPreviewUrl: startImg?.previewUrl ?? null,
            endPreviewUrl: endImg?.previewUrl ?? null,
          };
        }),
        transitionType: segmentTransitionType,
      });
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

      if (polishProfile.minimalCompositorPolish) {
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

      const needsOverlay =
        shouldApplyOcrTextOverlay(textRenderMode) &&
        textRenderMode !== "none" &&
        project.instantLockedTextMode &&
        lockedLayers.length > 0 &&
        lockedLayers.some((layer) => layer.text.trim().length > 0);
      if (needsOverlay) {
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
            segmentCount: completed.length,
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
      const stat = await fs.stat(mergedPath).catch(() => null);
      if (!stat || stat.size <= 0) {
        throw new Error("Final merged video is empty.");
      }
      if (mergedPath !== finalAbs) {
        await fs.copyFile(mergedPath, finalAbs);
      }
      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { progress: 85, status: "rendering" },
      });
      const isRebuild = project.instantFinalRebuildStatus === "running";
      const nextRebuildCount = isRebuild ? project.instantFinalRebuildCount + 1 : 0;
      const previousFinalUrl =
        project.instantPreviousFinalVideoUrl?.trim() ??
        latestExport?.outputVideoUrl?.trim() ??
        null;
      const finalUrl = await uploadMergedVideoToBlob(projectId, mergedPath, {
        rebuildVersion: nextRebuildCount,
        previousFinalUrl,
      });
      await commitInstantPremiumFinalVideoExport({
        projectId,
        exportId: exportRow.id,
        finalUrl,
        lockedLayers,
        isRebuild,
        previousFinalUrl,
        nextRebuildCount,
        segmentCount: completed.length,
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
      const message =
        error instanceof ExportBlobUploadError
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
          segmentCount: completed.length,
          rebuildCount: project.instantFinalRebuildCount + 1,
          message,
          failureReason,
          provider: exportProvider,
          failedStage,
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
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}
