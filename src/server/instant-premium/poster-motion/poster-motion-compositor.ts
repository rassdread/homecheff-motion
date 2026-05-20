import fs from "node:fs/promises";
import path from "node:path";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import {
  buildPosterMotionBlendFilterComplex,
  buildPosterMotionBlendFilterSimple,
  logPosterNormalize,
  normalizeOverlayToPosterCanvas,
} from "@/lib/poster-motion-normalize";
import {
  parsePosterMotionSettings,
  resolvePosterMotionBlendStrength,
  type PosterMotionSettings,
} from "@/lib/poster-motion-preserve";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";
import type { FinalAssemblyMode } from "@/server/instant-premium/final-assembly";
import {
  allowsPlainSegmentPassthrough,
  isPosterCompositeAssemblyMode,
  logFinalAssembly,
} from "@/server/instant-premium/final-assembly";
import {
  probeImageFileDimensions,
  probeVideoDurationSeconds,
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
  /** 0-based segment index for merge logs */
  segmentIndex?: number;
  finalAssemblyMode?: FinalAssemblyMode;
  sourceSegmentUrl?: string;
  posterImageId?: string | null;
  blendStrength?: number;
};

export type CompositePosterMotionResult = {
  outputPath: string;
  motionBlendApplied: boolean;
  usedStaticFallback: boolean;
  usedPassthroughFallback: boolean;
};

export type PosterMotionSegmentCompositeInput = {
  segmentPath: string;
  baseImageUrl: string;
  segmentIndex: number;
  sourceSegmentUrl: string;
  posterImageId: string | null;
};

export type CompositePosterMotionSegmentsInput = {
  projectId: string;
  workDir: string;
  segments: PosterMotionSegmentCompositeInput[];
  segmentDurationSec: number;
  maxWidth: number;
  posterMotionSettings?: unknown;
  finalAssemblyMode: FinalAssemblyMode;
  segmentCount: number;
  blendStrength: number;
};

export type CompositePosterMotionSegmentsResult = {
  segmentPaths: string[];
  motionBlendAppliedCount: number;
  passthroughFallbackCount: number;
  staticFallbackCount: number;
  compositorAppliedCount: number;
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

  let chain: string;
  if (settings.cinematicCameraMotion) {
    chain = [
      normalized.baseFilter,
      `zoompan=z='min(zoom+0.00035,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${normalized.posterWidth}x${normalized.posterHeight}:fps=${fps}`,
    ].join(",");
  } else {
    chain = `${normalized.baseFilter},fps=${fps}`;
  }

  if (settings.particlesGlow) {
    chain = `${chain},eq=brightness=0.03:saturation=1.08:gamma=1.02`;
  }

  return chain;
}

async function runFfmpegToOutput(
  ffmpeg: string,
  args: string[]
): Promise<{ ok: boolean; output: string }> {
  const result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 180_000 });
  return { ok: result.code === 0, output: result.output };
}

async function passthroughOverlayVideo(params: {
  ffmpeg: string;
  overlayPath: string;
  outputVideoPath: string;
  durationSec: number;
  maxWidth: number;
  fps: number;
}): Promise<boolean> {
  const duration = Math.max(1, Math.round(params.durationSec));
  const vf = `scale=w='if(gt(iw,${params.maxWidth}),${params.maxWidth},iw)':h=-2,format=yuv420p`;
  const args = [
    "-y",
    "-i",
    params.overlayPath,
    "-vf",
    vf,
    "-t",
    String(duration),
    "-r",
    String(params.fps),
    "-c:v",
    "libx264",
    "-preset",
    FINAL_MERGE_VIDEO_PRESET,
    "-crf",
    String(FINAL_MERGE_VIDEO_CRF),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    params.outputVideoPath,
  ];
  const result = await runFfmpegToOutput(params.ffmpeg, args);
  if (!result.ok) {
    console.warn("[hc-instant-premium]", {
      phase: "posterMotionPassthroughFailed",
      tail: result.output.slice(-400),
    });
  }
  return result.ok;
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

async function applyStaticPosterMotionFallback(params: {
  ffmpeg: string;
  input: CompositePosterMotionInput;
  settings: PosterMotionSettings;
  duration: number;
  fps: number;
  basePath: string;
  posterWidth: number;
  posterHeight: number;
  reason: string;
}): Promise<CompositePosterMotionResult> {
  const staticOk = await renderStaticPosterOnly({
    ffmpeg: params.ffmpeg,
    basePath: params.basePath,
    outputVideoPath: params.input.outputVideoPath,
    posterWidth: params.posterWidth,
    posterHeight: params.posterHeight,
    settings: params.settings,
    durationSec: params.duration,
    fps: params.fps,
  });
  console.warn("[hc-instant-premium]", {
    projectId: params.input.projectId,
    segmentIndex: params.input.segmentIndex,
    phase: "posterMotionStaticSegmentFallback",
    reason: params.reason,
    staticOk,
  });
  if (!staticOk && isPosterCompositeAssemblyMode(params.input.finalAssemblyMode ?? "poster_composite_segments")) {
    const passthroughOk = await passthroughOverlayVideo({
      ffmpeg: params.ffmpeg,
      overlayPath: params.input.mergedViduPath,
      outputVideoPath: params.input.outputVideoPath,
      durationSec: params.duration,
      maxWidth: params.input.maxWidth,
      fps: params.fps,
    });
    if (passthroughOk) {
      return {
        outputPath: params.input.outputVideoPath,
        motionBlendApplied: false,
        usedStaticFallback: false,
        usedPassthroughFallback: true,
      };
    }
  }

  return {
    outputPath: params.input.outputVideoPath,
    motionBlendApplied: false,
    usedStaticFallback: staticOk,
    usedPassthroughFallback: false,
  };
}

async function applyPosterMotionFallback(params: {
  ffmpeg: string;
  input: CompositePosterMotionInput;
  settings: PosterMotionSettings;
  duration: number;
  fps: number;
  basePath: string;
  posterWidth: number;
  posterHeight: number;
  reason: string;
}): Promise<CompositePosterMotionResult> {
  const assemblyMode = params.input.finalAssemblyMode ?? "poster_composite_segments";

  if (
    assemblyMode === "static_poster_motion" ||
    isPosterCompositeAssemblyMode(assemblyMode)
  ) {
    return applyStaticPosterMotionFallback(params);
  }

  if (allowsPlainSegmentPassthrough(assemblyMode)) {
    const passthroughOk = await passthroughOverlayVideo({
      ffmpeg: params.ffmpeg,
      overlayPath: params.input.mergedViduPath,
      outputVideoPath: params.input.outputVideoPath,
      durationSec: params.duration,
      maxWidth: params.input.maxWidth,
      fps: params.fps,
    });
    if (passthroughOk) {
      console.warn("[hc-instant-premium]", {
        projectId: params.input.projectId,
        segmentIndex: params.input.segmentIndex,
        phase: "posterMotionPassthroughFallback",
        reason: params.reason,
      });
      return {
        outputPath: params.input.outputVideoPath,
        motionBlendApplied: false,
        usedStaticFallback: false,
        usedPassthroughFallback: true,
      };
    }
  }

  return applyStaticPosterMotionFallback(params);
}

/**
 * DeeVid-style composite: static poster base + Vidu motion overlay on the same canvas.
 */
export async function compositePosterMotionPreserve(
  input: CompositePosterMotionInput
): Promise<CompositePosterMotionResult> {
  const settings: PosterMotionSettings = parsePosterMotionSettings(input.posterMotionSettings);
  const assemblyMode = input.finalAssemblyMode ?? "poster_composite_segments";
  const ffmpeg = (await resolveFfmpegForTextOverlay().catch(() => null)) ?? ffmpegBinary();
  const basePath = path.join(
    input.workDir,
    input.segmentIndex != null ? `poster-base-${input.segmentIndex}.jpg` : "poster-base.jpg"
  );
  await downloadToFile(input.baseImageUrl, basePath);

  const probedDuration = await probeVideoDurationSeconds(input.mergedViduPath);
  const duration = Math.max(
    1,
    Math.round(probedDuration ?? input.durationSec)
  );
  const fps = 30;

  if (assemblyMode === "static_poster_motion") {
    const posterDims = await probeImageFileDimensions(basePath);
    const posterWidth = posterDims?.width ?? Math.max(360, input.maxWidth);
    const posterHeight =
      posterDims?.height ?? Math.round((Math.max(360, input.maxWidth) * 16) / 9);
    return applyStaticPosterMotionFallback({
      ffmpeg,
      input,
      settings,
      duration,
      fps,
      basePath,
      posterWidth,
      posterHeight,
      reason: "static_poster_motion_mode",
    });
  }

  const posterDims = await probeImageFileDimensions(basePath);
  const overlayDims = await probeVideoFileDimensions(input.mergedViduPath);

  if (!posterDims) {
    console.warn("[hc-instant-premium]", {
      projectId: input.projectId,
      segmentIndex: input.segmentIndex,
      phase: "posterMotionProbeFailed",
      reason: "poster_dimensions_unavailable",
    });
    return applyPosterMotionFallback({
      ffmpeg,
      input,
      settings,
      duration,
      fps,
      basePath,
      posterWidth: Math.max(360, input.maxWidth),
      posterHeight: Math.round((Math.max(360, input.maxWidth) * 16) / 9),
      reason: "poster_dimensions_unavailable",
    });
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
    return applyPosterMotionFallback({
      ffmpeg,
      input,
      settings,
      duration,
      fps,
      basePath,
      posterWidth,
      posterHeight,
      reason: "overlay_dimensions_unavailable",
    });
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
  const blendStrength = resolvePosterMotionBlendStrength(settings);
  const blendInput = {
    baseFilter,
    overlayFilter: normalized.overlayFilter,
    blendStrength,
  };
  const blendFilterCandidates = [
    { mode: "luminance_highlight_lighten", graph: buildPosterMotionBlendFilterComplex(blendInput) },
    {
      mode: "lighten_desaturated",
      graph: buildPosterMotionBlendFilterSimple({
        ...blendInput,
        blendStrength: Math.min(blendStrength, 0.15),
      }),
    },
  ];

  let blendResult: { ok: boolean; output: string } = { ok: false, output: "" };
  let appliedBlendMode = "none";

  for (const candidate of blendFilterCandidates) {
    const blendArgs = [
      "-y",
      "-loop",
      "1",
      "-i",
      basePath,
      "-i",
      input.mergedViduPath,
      "-filter_complex",
      candidate.graph,
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
    blendResult = await runFfmpegToOutput(ffmpeg, blendArgs);
    if (blendResult.ok) {
      appliedBlendMode = candidate.mode;
      break;
    }
    console.warn("[hc-instant-premium]", {
      projectId: input.projectId,
      phase: "posterMotionBlendAttemptFailed",
      blendMode: candidate.mode,
      tail: blendResult.output.slice(-300),
    });
  }

  if (blendResult.ok) {
    console.info("[hc-instant-premium]", {
      projectId: input.projectId,
      segmentIndex: input.segmentIndex,
      phase: "posterMotionCompositeComplete",
      cinematicCamera: settings.cinematicCameraMotion,
      particlesGlow: settings.particlesGlow,
      blendStrength,
      blendMode: appliedBlendMode,
      canvas: `${normalized.posterWidth}x${normalized.posterHeight}`,
    });
    return {
      outputPath: input.outputVideoPath,
      motionBlendApplied: true,
      usedStaticFallback: false,
      usedPassthroughFallback: false,
    };
  }

  console.warn("[hc-instant-premium]", {
    projectId: input.projectId,
    segmentIndex: input.segmentIndex,
    phase: "posterMotionBlendFailed",
    tail: blendResult.output.slice(-500),
    action:
      assemblyMode === "concat_segments_only"
        ? "overlay_passthrough_fallback"
        : "static_poster_segment_fallback",
  });

  return applyPosterMotionFallback({
    ffmpeg,
    input,
    settings,
    duration,
    fps,
    basePath,
    posterWidth: normalized.posterWidth,
    posterHeight: normalized.posterHeight,
    reason: "blend_failed",
  });
}

/** Composite each segment with its start-frame poster, then return paths ready for concat. */
export async function compositePosterMotionPreserveSegments(
  input: CompositePosterMotionSegmentsInput
): Promise<CompositePosterMotionSegmentsResult> {
  const segmentDurationSec = Math.max(1, Math.round(input.segmentDurationSec));
  const segmentPaths: string[] = [];
  let motionBlendAppliedCount = 0;
  let passthroughFallbackCount = 0;
  let staticFallbackCount = 0;
  let compositorAppliedCount = 0;

  for (const segment of input.segments) {
    const outputVideoPath = path.join(
      input.workDir,
      `poster-segment-${segment.segmentIndex}.mp4`
    );
    const result = await compositePosterMotionPreserve({
      projectId: input.projectId,
      workDir: input.workDir,
      mergedViduPath: segment.segmentPath,
      outputVideoPath,
      baseImageUrl: segment.baseImageUrl,
      durationSec: segmentDurationSec,
      maxWidth: input.maxWidth,
      posterMotionSettings: input.posterMotionSettings,
      segmentIndex: segment.segmentIndex,
      finalAssemblyMode: input.finalAssemblyMode,
      sourceSegmentUrl: segment.sourceSegmentUrl,
      posterImageId: segment.posterImageId,
      blendStrength: input.blendStrength,
    });
    segmentPaths.push(result.outputPath);

    const compositorApplied = result.motionBlendApplied || result.usedStaticFallback;
    if (compositorApplied) {
      compositorAppliedCount += 1;
    }
    if (result.motionBlendApplied) {
      motionBlendAppliedCount += 1;
    } else if (result.usedPassthroughFallback) {
      passthroughFallbackCount += 1;
    } else if (result.usedStaticFallback) {
      staticFallbackCount += 1;
    }

    const compositorDetail = result.motionBlendApplied
      ? "blend"
      : result.usedStaticFallback
        ? "static_poster"
        : result.usedPassthroughFallback
          ? "passthrough"
          : "skipped";

    logFinalAssembly({
      projectId: input.projectId,
      mode: input.finalAssemblyMode,
      segmentCount: input.segmentCount,
      processedSegmentCount: segmentPaths.length,
      compositorApplied,
      blendStrength: input.blendStrength,
      segmentIndex: segment.segmentIndex,
      posterImageId: segment.posterImageId,
      sourceSegmentUrl: segment.sourceSegmentUrl,
      processedSegmentPath: result.outputPath,
      compositorDetail,
      phase: "segment",
    });
  }

  return {
    segmentPaths,
    motionBlendAppliedCount,
    passthroughFallbackCount,
    staticFallbackCount,
    compositorAppliedCount,
  };
}
