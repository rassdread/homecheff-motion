import { spawn } from "node:child_process";
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
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
  getFinalMergeMaxWidthFromViduResolution,
} from "@/lib/media-export-constants";
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
  usesPosterBaseComposite,
} from "@/lib/hybrid-motion-overlay";
import { compositePosterMotionPreserve } from "@/server/instant-premium/poster-motion/poster-motion-compositor";
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

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
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

function runFfmpeg(
  binary: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number }
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs);
    }
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (timeout) clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

async function concatAndEncode(
  workDir: string,
  segmentPaths: string[],
  outputFile: string,
  maxWidth: number,
  segmentDurationSeconds?: number | null
) {
  const args = ["-y"];
  const canCrossfade =
    segmentPaths.length > 1 &&
    typeof segmentDurationSeconds === "number" &&
    Number.isFinite(segmentDurationSeconds) &&
    segmentDurationSeconds > 1;

  if (canCrossfade) {
    const perSegment = Number(segmentDurationSeconds);
    const crossfadeSeconds = Math.max(0.2, Math.min(0.5, perSegment / 4, 0.35));
    for (const seg of segmentPaths) {
      args.push("-i", seg);
    }
    const filterParts: string[] = [];
    for (let i = 0; i < segmentPaths.length; i += 1) {
      filterParts.push(
        `[${i}:v]settb=AVTB,scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p[v${i}]`
      );
    }
    let timelineSeconds = perSegment;
    let lastLabel = "v0";
    for (let i = 1; i < segmentPaths.length; i += 1) {
      const outLabel = `x${i}`;
      const offset = Math.max(0, timelineSeconds - crossfadeSeconds);
      filterParts.push(
        `[${lastLabel}][v${i}]xfade=transition=fade:duration=${crossfadeSeconds.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`
      );
      lastLabel = outLabel;
      timelineSeconds += perSegment - crossfadeSeconds;
    }
    args.push(
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      `[${lastLabel}]`,
      "-c:v",
      "libx264",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart"
    );
  } else {
    const concatFile = path.join(workDir, "concat.txt");
    const concatLines = segmentPaths
      .map((p) => `file '${path.resolve(p).replace(/'/g, `'\\''`)}'`)
      .join("\n");
    await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");
    const vf = `scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2,format=yuv420p`;
    args.push(
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      FINAL_MERGE_VIDEO_PRESET,
      "-crf",
      String(FINAL_MERGE_VIDEO_CRF),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart"
    );
  }
  if (FINAL_MERGE_DISABLE_AUDIO) {
    args.push("-an");
  } else {
    args.push("-c:a", "aac", "-b:a", "128k");
  }
  args.push(outputFile);
  const encoded = await runFfmpeg(ffmpegBinary(), args, { cwd: workDir, timeoutMs: 10 * 60 * 1000 });
  if (encoded.code !== 0) {
    throw new Error(`Instant merge ffmpeg failed: ${encoded.stderr.trim().slice(-3000)}`);
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

    console.info("[hc-instant-premium]", {
      projectId,
      phase: "mergeStart",
      mergeStart: true,
      segmentCount: completed.length,
      exportProvider,
    });

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-instant-merge-${projectId}-`));
    const outDir = absolutePublicPath("generated", "animations", "projects", projectId);
    await ensureDir(outDir);
    const finalAbs = path.join(outDir, "final.mp4");
    try {
      const segmentPaths: string[] = [];
      for (let i = 0; i < completed.length; i += 1) {
        segmentPaths.push(
          await resolveTransitionVideoToSegment(completed[i].outputVideoUrl!, workDir, i)
        );
      }
      await prisma.animationExport.update({
        where: { id: exportRow.id },
        data: { progress: 70, status: "rendering" },
      });
      await concatAndEncode(
        workDir,
        segmentPaths,
        finalAbs,
        getFinalMergeMaxWidthFromViduResolution(project.viduResolution),
        project.viduDurationSeconds ?? null
      );
      let mergedPath = finalAbs;
      const lockedLayers = parseLockedTextLayersJson(project.instantLockedTextLayers);
      const textRenderMode = normalizeTextRenderMode(project.instantTextRenderMode);
      const overlayStyle = normalizeOverlayStyle(project.instantHybridOverlayStyle);
      const posterMotionActive = usesPosterBaseComposite(textRenderMode);

      if (posterMotionActive) {
        const baseImage = project.images[0];
        const baseUrl = baseImage?.previewUrl?.trim();
        if (baseUrl) {
          const posterOut = path.join(workDir, "final-poster-composite.mp4");
          const durationSec = project.instantOutputDurationSeconds ?? 8;
          const posterComposite = await compositePosterMotionPreserve({
            projectId,
            workDir,
            mergedViduPath: finalAbs,
            outputVideoPath: posterOut,
            baseImageUrl: baseUrl,
            durationSec,
            maxWidth: getFinalMergeMaxWidthFromViduResolution(project.viduResolution),
            posterMotionSettings: project.instantPosterMotionSettings,
          });
          mergedPath = posterComposite.outputPath;
          console.info("[hc-instant-premium]", {
            projectId,
            phase: "posterMotionCompositeApplied",
            motionBlendApplied: posterComposite.motionBlendApplied,
            usedStaticFallback: posterComposite.usedStaticFallback,
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
            inputVideoPath: finalAbs,
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
