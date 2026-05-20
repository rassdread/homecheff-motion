import fs from "node:fs/promises";
import path from "node:path";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import {
  logPosterNormalize,
  normalizeOverlayToPosterCanvas,
} from "@/lib/poster-motion-normalize";
import { parsePosterMotionSettings, type PosterMotionSettings } from "@/lib/poster-motion-preserve";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import {
  probeImageFileDimensions,
  probeVideoFileDimensions,
} from "@/server/instant-premium/poster-motion/probe-media-dimensions";

export type CompositePosterMotionInput = {
  projectId: string;
  workDir: string;
  mergedViduPath: string;
  outputVideoPath: string;
  baseImageUrl: string;
  durationSec: number;
  maxWidth: number;
  posterMotionSettings?: unknown;
};

export type CompositePosterMotionResult = {
  outputPath: string;
  motionBlendApplied: boolean;
  usedStaticFallback: boolean;
};

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Could not download base image (${res.status}).`);
  }
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function buildBaseStreamFilter(
  posterWidth: number,
  posterHeight: number,
  settings: PosterMotionSettings,
  durationSec: number,
  fps: number
): string {
  const frames = Math.max(1, Math.round(durationSec * fps));
  const normalized = normalizeOverlayToPosterCanvas({
    posterWidth,
    posterHeight,
    overlayWidth: posterWidth,
    overlayHeight: posterHeight,
  });

  if (settings.cinematicCameraMotion) {
    return [
      normalized.baseFilter,
      `zoompan=z='min(zoom+0.00035,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${normalized.posterWidth}x${normalized.posterHeight}:fps=${fps}`,
    ].join(",");
  }

  return `${normalized.baseFilter},fps=${fps}`;
}

async function runFfmpegToOutput(
  ffmpeg: string,
  args: string[]
): Promise<{ ok: boolean; output: string }> {
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 180_000 });
  return { ok: result.code === 0, output: result.output };
}

async function renderStaticPosterOnly(params: {
  ffmpeg: string;
  basePath: string;
  outputVideoPath: string;
  posterWidth: number;
  posterHeight: number;
  settings: PosterMotionSettings;
  durationSec: number;
  fps: number;
}): Promise<boolean> {
  const baseFilter = buildBaseStreamFilter(
    params.posterWidth,
    params.posterHeight,
    params.settings,
    params.durationSec,
    params.fps
  );
  const args = [
    "-y",
    "-loop",
    "1",
    "-i",
    params.basePath,
    "-filter_complex",
    `[0:v]${baseFilter},format=yuv420p[out]`,
    "-map",
    "[out]",
    "-t",
    String(Math.max(1, Math.round(params.durationSec))),
    "-r",
    String(params.fps),
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    params.outputVideoPath,
  ];
  const result = await runFfmpegToOutput(params.ffmpeg, args);
  if (!result.ok) {
    console.warn("[hc-instant-premium]", {
      phase: "posterMotionStaticFallbackFailed",
      tail: result.output.slice(-400),
    });
  }
  return result.ok;
}

/**
 * DeeVid-style final composite: static poster base + Vidu motion overlay on the same canvas.
 */
export async function compositePosterMotionPreserve(
  input: CompositePosterMotionInput
): Promise<CompositePosterMotionResult> {
  const settings: PosterMotionSettings = parsePosterMotionSettings(input.posterMotionSettings);
  const ffmpeg = (await resolveFfmpegForTextOverlay().catch(() => null)) ?? ffmpegBinary();
  const basePath = path.join(input.workDir, "poster-base.jpg");
  await downloadToFile(input.baseImageUrl, basePath);

  const duration = Math.max(1, Math.round(input.durationSec));
  const fps = 30;

  const posterDims = await probeImageFileDimensions(basePath);
  const overlayDims = await probeVideoFileDimensions(input.mergedViduPath);

  if (!posterDims) {
    console.warn("[hc-instant-premium]", {
      projectId: input.projectId,
      phase: "posterMotionProbeFailed",
      reason: "poster_dimensions_unavailable",
    });
    const ok = await renderStaticPosterOnly({
      ffmpeg,
      basePath,
      outputVideoPath: input.outputVideoPath,
      posterWidth: Math.max(360, input.maxWidth),
      posterHeight: Math.round((Math.max(360, input.maxWidth) * 16) / 9),
      settings,
      durationSec: duration,
      fps,
    });
    if (!ok) {
      await fs.copyFile(input.mergedViduPath, input.outputVideoPath).catch(() => undefined);
    }
    return {
      outputPath: input.outputVideoPath,
      motionBlendApplied: false,
      usedStaticFallback: true,
    };
  }

  const posterWidth = posterDims.width;
  const posterHeight = posterDims.height;

  if (!overlayDims) {
    logPosterNormalize({
      posterWidth,
      posterHeight,
      overlayBeforeWidth: 0,
      overlayBeforeHeight: 0,
      overlayAfterWidth: posterWidth,
      overlayAfterHeight: posterHeight,
    });
    await renderStaticPosterOnly({
      ffmpeg,
      basePath,
      outputVideoPath: input.outputVideoPath,
      posterWidth,
      posterHeight,
      settings,
      durationSec: duration,
      fps,
    });
    return {
      outputPath: input.outputVideoPath,
      motionBlendApplied: false,
      usedStaticFallback: true,
    };
  }

  const normalized = normalizeOverlayToPosterCanvas({
    posterWidth,
    posterHeight,
    overlayWidth: overlayDims.width,
    overlayHeight: overlayDims.height,
  });

  logPosterNormalize({
    posterWidth: normalized.posterWidth,
    posterHeight: normalized.posterHeight,
    overlayBeforeWidth: overlayDims.width,
    overlayBeforeHeight: overlayDims.height,
    overlayAfterWidth: normalized.overlayAfterWidth,
    overlayAfterHeight: normalized.overlayAfterHeight,
  });

  const baseFilter = buildBaseStreamFilter(
    normalized.posterWidth,
    normalized.posterHeight,
    settings,
    duration,
    fps
  );
  const motionOpacity = settings.particlesGlow ? 0.32 : 0.24;
  const filterComplex = [
    `[0:v]${baseFilter},format=yuv420p[base]`,
    `[1:v]${normalized.overlayFilter},format=yuv420p[fg]`,
    `[base][fg]blend=all_mode=screen:all_opacity=${motionOpacity}:shortest=1[out]`,
  ].join(";");

  const blendArgs = [
    "-y",
    "-loop",
    "1",
    "-i",
    basePath,
    "-i",
    input.mergedViduPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[out]",
    "-t",
    String(duration),
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    input.outputVideoPath,
  ];

  const blendResult = await runFfmpegToOutput(ffmpeg, blendArgs);
  if (blendResult.ok) {
    console.info("[hc-instant-premium]", {
      projectId: input.projectId,
      phase: "posterMotionCompositeComplete",
      cinematicCamera: settings.cinematicCameraMotion,
      particlesGlow: settings.particlesGlow,
      canvas: `${normalized.posterWidth}x${normalized.posterHeight}`,
    });
    return {
      outputPath: input.outputVideoPath,
      motionBlendApplied: true,
      usedStaticFallback: false,
    };
  }

  console.warn("[hc-instant-premium]", {
    projectId: input.projectId,
    phase: "posterMotionBlendFailed",
    tail: blendResult.output.slice(-500),
    action: "static_poster_fallback",
  });

  const fallbackOk = await renderStaticPosterOnly({
    ffmpeg,
    basePath,
    outputVideoPath: input.outputVideoPath,
    posterWidth: normalized.posterWidth,
    posterHeight: normalized.posterHeight,
    settings,
    durationSec: duration,
    fps,
  });

  if (!fallbackOk) {
    await fs.copyFile(input.mergedViduPath, input.outputVideoPath).catch(() => undefined);
  }

  return {
    outputPath: input.outputVideoPath,
    motionBlendApplied: false,
    usedStaticFallback: true,
  };
}
