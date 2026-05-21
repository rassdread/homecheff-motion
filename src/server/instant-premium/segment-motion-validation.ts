/**
 * Detect near-static segment files before final concat (assembly source selection).
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import {
  FinalSegmentSourceError,
  SEGMENT_VIDEO_MISSING,
} from "@/server/instant-premium/final-segment-source";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const FROZEN_SEGMENT_DETECTED = "FROZEN_SEGMENT_DETECTED";

export class FrozenSegmentDetectedError extends Error {
  readonly code = FROZEN_SEGMENT_DETECTED;

  constructor(message: string) {
    super(message);
    this.name = "FrozenSegmentDetectedError";
  }
}

export const MIN_SEGMENT_DURATION_SEC = 0.25;
export const MIN_SEGMENT_FRAME_COUNT = 4;
/** Mean pixel diff (0–255) below this across samples → likely frozen. */
export const FROZEN_FRAME_DELTA_THRESHOLD = 3.5;
const MOTION_SAMPLE_SIZE = 32;

export type SegmentMotionProbe = {
  durationSec: number;
  frameCountEstimate: number;
  fps: number;
  motionScore: number;
  identicalFrameRatio: number;
  likelyFrozen: boolean;
  rejectedReason?: string;
};

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function runCapture(
  binary: string,
  args: string[]
): Promise<{ code: number; stderr: string; stdout: Buffer }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr, stdout: Buffer.concat(chunks) });
    });
  });
}

export function meanAbsDiffGrayscale(a: Buffer, b: Buffer): number {
  if (a.length === 0 || a.length !== b.length) {
    return 255;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  }
  return sum / a.length;
}

export function motionScoreFromSamples(samples: Buffer[]): {
  motionScore: number;
  identicalFrameRatio: number;
  likelyFrozen: boolean;
} {
  if (samples.length < 2) {
    return { motionScore: 0, identicalFrameRatio: 1, likelyFrozen: true };
  }
  const diffs: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    diffs.push(meanAbsDiffGrayscale(samples[i - 1]!, samples[i]!));
  }
  const motionScore = Math.max(...diffs);
  const frozenPairs = diffs.filter((d) => d < FROZEN_FRAME_DELTA_THRESHOLD).length;
  const identicalFrameRatio = frozenPairs / diffs.length;
  const likelyFrozen =
    motionScore < FROZEN_FRAME_DELTA_THRESHOLD ||
    identicalFrameRatio >= 0.85;
  return { motionScore, identicalFrameRatio, likelyFrozen };
}

async function sampleGrayscaleFrame(
  filePath: string,
  timeSec: number
): Promise<Buffer | null> {
  const t = Math.max(0, timeSec);
  const result = await runCapture(ffmpegBinary(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    t.toFixed(4),
    "-i",
    filePath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${MOTION_SAMPLE_SIZE}:${MOTION_SAMPLE_SIZE},format=gray`,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "gray",
    "-",
  ]);
  if (result.code !== 0 || result.stdout.length < MOTION_SAMPLE_SIZE * MOTION_SAMPLE_SIZE) {
    return null;
  }
  return result.stdout;
}

/** Probe file and sample frames for motion (ffmpeg required). */
export async function probeSegmentMotion(filePath: string): Promise<SegmentMotionProbe | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const probed = await probeVideoSegment(filePath);
  if (!probed) {
    return {
      durationSec: 0,
      frameCountEstimate: 0,
      fps: 30,
      motionScore: 0,
      identicalFrameRatio: 1,
      likelyFrozen: true,
      rejectedReason: "unprobeable",
    };
  }

  const durationSec = probed.durationSec;
  const fps = probed.fps > 0 ? probed.fps : 30;
  const frameCountEstimate = Math.max(1, Math.round(durationSec * fps));

  if (durationSec < MIN_SEGMENT_DURATION_SEC) {
    return {
      durationSec,
      frameCountEstimate,
      fps,
      motionScore: 0,
      identicalFrameRatio: 1,
      likelyFrozen: true,
      rejectedReason: "duration_too_short",
    };
  }

  if (frameCountEstimate < MIN_SEGMENT_FRAME_COUNT) {
    return {
      durationSec,
      frameCountEstimate,
      fps,
      motionScore: 0,
      identicalFrameRatio: 1,
      likelyFrozen: true,
      rejectedReason: "frame_count_too_low",
    };
  }

  const sampleTimes = [
    0,
    durationSec * 0.33,
    durationSec * 0.66,
    Math.max(0, durationSec - 1 / fps),
  ];
  const samples: Buffer[] = [];
  for (const t of sampleTimes) {
    const sample = await sampleGrayscaleFrame(filePath, t);
    if (sample) {
      samples.push(sample);
    }
  }

  if (samples.length < 2) {
    return {
      durationSec,
      frameCountEstimate,
      fps,
      motionScore: 0,
      identicalFrameRatio: 1,
      likelyFrozen: true,
      rejectedReason: "frame_sample_failed",
    };
  }

  const motion = motionScoreFromSamples(samples);
  return {
    durationSec,
    frameCountEstimate,
    fps,
    motionScore: motion.motionScore,
    identicalFrameRatio: motion.identicalFrameRatio,
    likelyFrozen: motion.likelyFrozen,
    rejectedReason: motion.likelyFrozen ? "low_frame_delta" : undefined,
  };
}

export async function isLikelyFrozenSegment(filePath: string): Promise<boolean> {
  const probe = await probeSegmentMotion(filePath);
  return probe?.likelyFrozen ?? true;
}

export type ConcatSegmentSourceType =
  | "animated_vidu"
  | "normalized"
  | "blended"
  | "repaired"
  | "static_fallback";

export type FinalConcatSourceLogEntry = {
  segmentIndex: number;
  selectedPath: string;
  sourceType: ConcatSegmentSourceType;
  durationSec: number;
  frameCount: number;
  motionScore: number;
  rejectedReason?: string;
  animatedViduPath?: string;
  processedPath?: string;
};

export function logFinalConcatSource(entry: FinalConcatSourceLogEntry): void {
  console.info("[final-concat-source]", entry);
}

export type ResolveConcatSegmentCandidate = {
  path: string;
  sourceType: ConcatSegmentSourceType;
  priority: number;
};

/**
 * Pick best concat path: never prefer frozen processed output over animated Vidu.
 */
export async function resolveConcatSegmentPath(params: {
  segmentIndex: number;
  animatedViduPath: string;
  candidates: ResolveConcatSegmentCandidate[];
  /** When true, reject frozen processed paths and require animated Vidu */
  requireAnimated?: boolean;
}): Promise<{
  path: string;
  sourceType: ConcatSegmentSourceType;
  probe: SegmentMotionProbe;
  rejectedReason?: string;
}> {
  const { segmentIndex, animatedViduPath, candidates, requireAnimated = false } = params;
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);

  const animatedProbe = await probeSegmentMotion(animatedViduPath);
  const animatedUsable = animatedProbe && !animatedProbe.likelyFrozen;

  for (const candidate of sorted) {
    if (candidate.sourceType === "static_fallback" && requireAnimated) {
      continue;
    }
    const probe = await probeSegmentMotion(candidate.path);
    if (!probe) {
      continue;
    }
    if (!probe.likelyFrozen) {
      logFinalConcatSource({
        segmentIndex,
        selectedPath: candidate.path,
        sourceType: candidate.sourceType,
        durationSec: probe.durationSec,
        frameCount: probe.frameCountEstimate,
        motionScore: probe.motionScore,
        animatedViduPath,
        processedPath: candidate.path !== animatedViduPath ? candidate.path : undefined,
      });
      return { path: candidate.path, sourceType: candidate.sourceType, probe };
    }
  }

  if (animatedUsable && animatedProbe) {
    logFinalConcatSource({
      segmentIndex,
      selectedPath: animatedViduPath,
      sourceType: "animated_vidu",
      durationSec: animatedProbe.durationSec,
      frameCount: animatedProbe.frameCountEstimate,
      motionScore: animatedProbe.motionScore,
      rejectedReason: "processed_output_frozen_using_vidu",
      animatedViduPath,
      processedPath: sorted[0]?.path,
    });
    return {
      path: animatedViduPath,
      sourceType: "animated_vidu",
      probe: animatedProbe,
      rejectedReason: "processed_output_frozen_using_vidu",
    };
  }

  if (requireAnimated) {
    throw new FinalSegmentSourceError(
      SEGMENT_VIDEO_MISSING,
      `Segment ${segmentIndex}: no animated provider video available (processed outputs frozen or static).`
    );
  }

  const fallbackProbe = animatedProbe ?? {
    durationSec: 0,
    frameCountEstimate: 0,
    fps: 30,
    motionScore: 0,
    identicalFrameRatio: 1,
    likelyFrozen: true,
    rejectedReason: "no_animated_source",
  };

  logFinalConcatSource({
    segmentIndex,
    selectedPath: animatedViduPath,
    sourceType: "animated_vidu",
    durationSec: fallbackProbe.durationSec,
    frameCount: fallbackProbe.frameCountEstimate,
    motionScore: fallbackProbe.motionScore,
    rejectedReason: fallbackProbe.rejectedReason ?? "all_candidates_frozen",
    animatedViduPath,
  });

  return {
    path: animatedViduPath,
    sourceType: "animated_vidu",
    probe: fallbackProbe,
    rejectedReason: fallbackProbe.rejectedReason,
  };
}

export async function assertSegmentsAnimatedBeforeConcat(params: {
  projectId: string;
  paths: string[];
  animatedViduPaths: string[];
}): Promise<void> {
  const failures: string[] = [];

  for (let i = 0; i < params.paths.length; i += 1) {
    const selected = params.paths[i]!;
    const probe = await probeSegmentMotion(selected);
    if (!probe || probe.durationSec < MIN_SEGMENT_DURATION_SEC) {
      failures.push(
        `segment ${i}: invalid duration (${probe?.durationSec ?? 0}s) path=${selected}`
      );
      continue;
    }
    if (probe.likelyFrozen) {
      console.warn("[final-concat-source]", {
        projectId: params.projectId,
        segmentIndex: i,
        warning: "low_motion_included",
        motionScore: probe.motionScore,
        selectedPath: selected,
        animatedViduPath: params.animatedViduPaths[i],
      });
    }
  }

  if (failures.length > 0) {
    throw new FrozenSegmentDetectedError(
      `[${params.projectId}] FROZEN_SEGMENT_DETECTED: ${failures.join("; ")}`
    );
  }
}
