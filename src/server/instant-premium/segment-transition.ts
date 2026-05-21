import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  FINAL_MERGE_DISABLE_AUDIO,
  FINAL_MERGE_VIDEO_CRF,
  FINAL_MERGE_VIDEO_PRESET,
} from "@/lib/media-export-constants";
import { parsePosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { SegmentJoinPlan, SegmentJoinMode } from "@/lib/exact-frame-continuity";
import {
  applyIncomingSegmentExposureCorrection,
  computeExposureCorrectionFromDelta,
} from "@/server/instant-premium/join-exposure-normalize";
import {
  DEFAULT_SEGMENT_TRANSITION_TYPE,
  SEGMENT_TRANSITION_TYPES,
  normalizeSegmentTransitionType,
  type SegmentTransitionType,
} from "@/lib/segment-transition-types";
import { resolveFfmpegStageTimeoutMs } from "@/lib/export-timeout";
import { SegmentTrimTooAggressiveError } from "@/server/instant-premium/final-assembly-invariants";

export const MIN_SEGMENT_DURATION_AFTER_TRIM_SEC = 1;

export type { SegmentTransitionType };
export {
  SEGMENT_TRANSITION_TYPES,
  DEFAULT_SEGMENT_TRANSITION_TYPE,
  normalizeSegmentTransitionType,
};

export const MERGE_OUTPUT_FPS = 30;
export const CAPCUT_SMOOTH_FRAMES_DEFAULT = 8;
export const CAPCUT_SMOOTH_FRAMES_MIN = 6;
export const CAPCUT_SMOOTH_FRAMES_MAX = 10;
export const TRIM_OUTGOING_FRAMES = 2;
export const TRIM_INCOMING_FRAMES = 1;

export type SegmentTransitionLogEntry = {
  transitionType: SegmentTransitionType;
  segmentA: number;
  segmentB: number;
  transitionDurationFrames: number;
  usedOpticalBlend: boolean;
  trimmedFrames: { outgoing: number; incoming: number };
  normalizedFps: number;
  normalizedResolution: string;
};

export function logSegmentTransition(entry: SegmentTransitionLogEntry): void {
  console.info("[segment-transition]", entry);
}

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function ffprobeBinary(): string {
  return process.env.FFPROBE_PATH?.trim() || "ffprobe";
}

function runCapture(
  binary: string,
  args: string[],
  timeoutMs = resolveFfmpegStageTimeoutMs("concat")
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    }
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (timeout) clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export type ProbedVideoSegment = {
  durationSec: number;
  fps: number;
  width: number;
  height: number;
};

export async function probeVideoSegment(filePath: string): Promise<ProbedVideoSegment | null> {
  const result = await runCapture(
    ffprobeBinary(),
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      filePath,
    ],
    60_000
  );
  if (result.code !== 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout || "{}") as {
      streams?: Array<{
        width?: number;
        height?: number;
        r_frame_rate?: string;
        duration?: string;
      }>;
      format?: { duration?: string };
    };
    const stream = parsed.streams?.[0];
    const width = stream?.width ?? 0;
    const height = stream?.height ?? 0;
    if (width < 2 || height < 2) {
      return null;
    }
    const rate = stream?.r_frame_rate ?? "30/1";
    const [num, den] = rate.split("/").map((x) => Number.parseInt(x, 10));
    const fps =
      Number.isFinite(num) && Number.isFinite(den) && den > 0 ? num / den : MERGE_OUTPUT_FPS;
    const durationRaw = stream?.duration ?? parsed.format?.duration ?? "0";
    const durationSec = Number.parseFloat(String(durationRaw));
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return null;
    }
    return { durationSec, fps, width, height };
  } catch {
    return null;
  }
}

function readEnvSegmentTransitionOverride(): SegmentTransitionType | null {
  const raw = process.env.INSTANT_SEGMENT_TRANSITION_TYPE?.trim();
  if (!raw) {
    return null;
  }
  return SEGMENT_TRANSITION_TYPES.includes(raw as SegmentTransitionType)
    ? (raw as SegmentTransitionType)
    : null;
}

export function resolveSegmentTransitionType(posterMotionSettings?: unknown): SegmentTransitionType {
  const env = readEnvSegmentTransitionOverride();
  if (env) {
    return env;
  }
  const settings = parsePosterMotionSettings(posterMotionSettings);
  return normalizeSegmentTransitionType(settings.segmentTransitionType);
}

export function transitionDurationFrames(transitionType: SegmentTransitionType): number {
  switch (transitionType) {
    case "capcut_smooth":
      return CAPCUT_SMOOTH_FRAMES_DEFAULT;
    case "cinematic_blend":
      return 10;
    case "soft_crossfade":
      return 12;
    case "motion_blend":
      return 9;
    case "straight_cut":
      return 0;
    default:
      return CAPCUT_SMOOTH_FRAMES_DEFAULT;
  }
}

export function transitionDurationSeconds(transitionType: SegmentTransitionType): number {
  const frames = transitionDurationFrames(transitionType);
  if (frames <= 0) {
    return 0;
  }
  const clamped = Math.max(
    CAPCUT_SMOOTH_FRAMES_MIN,
    Math.min(CAPCUT_SMOOTH_FRAMES_MAX, frames)
  );
  return clamped / MERGE_OUTPUT_FPS;
}

export function getEdgeTrimFrames(
  segmentIndex: number,
  segmentCount: number,
  transitionType: SegmentTransitionType
): { outgoing: number; incoming: number } {
  return getEdgeTrimFramesForJoin(segmentIndex, segmentCount, transitionType);
}

export function getEdgeTrimFramesForJoin(
  segmentIndex: number,
  segmentCount: number,
  transitionType: SegmentTransitionType,
  joinBefore?: SegmentJoinPlan,
  joinAfter?: SegmentJoinPlan
): { outgoing: number; incoming: number } {
  if (segmentCount <= 1 || transitionType === "straight_cut") {
    return { outgoing: 0, incoming: 0 };
  }
  const isFirst = segmentIndex === 0;
  const isLast = segmentIndex === segmentCount - 1;
  let outgoing = isLast ? 0 : Math.min(TRIM_OUTGOING_FRAMES, 1);
  let incoming = isFirst ? 0 : Math.min(TRIM_INCOMING_FRAMES, 1);

  const softenIncoming = (mode: SegmentJoinMode | undefined) => {
    if (mode === "direct_micro_stitch") {
      incoming = 0;
    } else if (mode === "optical_micro_blend") {
      incoming = Math.min(incoming, 1);
    } else if (mode === "soft_continuation") {
      incoming = Math.min(incoming, 1);
    }
  };
  const softenOutgoing = (mode: SegmentJoinMode | undefined) => {
    if (mode === "direct_micro_stitch") {
      outgoing = isLast ? 0 : 1;
    } else if (mode === "optical_micro_blend") {
      outgoing = isLast ? 0 : 1;
    } else if (mode === "soft_continuation") {
      outgoing = isLast ? 0 : Math.min(outgoing, 1);
    }
  };

  softenIncoming(joinBefore?.joinMode);
  softenOutgoing(joinAfter?.joinMode);

  return { outgoing, incoming };
}

function xfadeTransitionName(transitionType: SegmentTransitionType): string {
  switch (transitionType) {
    case "capcut_smooth":
    case "motion_blend":
      return "fade";
    case "cinematic_blend":
      return "dissolve";
    case "soft_crossfade":
      return "fade";
    case "straight_cut":
      return "fade";
    default:
      return "fade";
  }
}

function usesOpticalBlend(transitionType: SegmentTransitionType): boolean {
  return transitionType !== "straight_cut";
}

export type PreparedSegment = {
  index: number;
  path: string;
  durationSec: number;
  width: number;
  height: number;
};

async function normalizeSegment(
  inputPath: string,
  outputPath: string,
  maxWidth: number
): Promise<ProbedVideoSegment> {
  const vf = [
    `fps=${MERGE_OUTPUT_FPS}`,
    `scale=w='if(gt(iw,${maxWidth}),${maxWidth},iw)':h=-2:flags=lanczos`,
    "setsar=1",
    "format=yuv420p",
  ].join(",");
  const args = [
    "-y",
    "-i",
    inputPath,
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
    "+faststart",
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    outputPath,
  ];
  const result = await runCapture(ffmpegBinary(), args);
  if (result.code !== 0) {
    throw new Error(
      `Segment normalize failed: ${(result.stderr || result.stdout).trim().slice(-2000)}`
    );
  }
  const probed = await probeVideoSegment(outputPath);
  if (!probed) {
    throw new Error(`Could not probe normalized segment: ${outputPath}`);
  }
  return probed;
}

async function trimSegmentEdges(
  inputPath: string,
  outputPath: string,
  durationSec: number,
  trim: { outgoing: number; incoming: number },
  fps: number
): Promise<number> {
  if (trim.incoming === 0 && trim.outgoing === 0) {
    await fs.copyFile(inputPath, outputPath);
    return durationSec;
  }
  const startSec = trim.incoming / fps;
  const endSec = Math.max(startSec + 1 / fps, durationSec - trim.outgoing / fps);
  const vf = `trim=start=${startSec.toFixed(6)}:end=${endSec.toFixed(6)},setpts=PTS-STARTPTS`;
  const args = [
    "-y",
    "-i",
    inputPath,
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
    "-r",
    String(MERGE_OUTPUT_FPS),
    "-movflags",
    "+faststart",
    ...(FINAL_MERGE_DISABLE_AUDIO ? ["-an"] : []),
    outputPath,
  ];
  const result = await runCapture(ffmpegBinary(), args);
  if (result.code !== 0) {
    throw new Error(`Segment trim failed: ${result.stderr.trim().slice(-2000)}`);
  }
  const probed = await probeVideoSegment(outputPath);
  return probed?.durationSec ?? Math.max(0.1, endSec - startSec);
}

export async function prepareMotionSegmentsForConcat(params: {
  workDir: string;
  segmentPaths: string[];
  maxWidth: number;
  transitionType: SegmentTransitionType;
  joinPlans?: SegmentJoinPlan[];
}): Promise<PreparedSegment[]> {
  const { workDir, segmentPaths, maxWidth, transitionType, joinPlans } = params;
  const prepared: PreparedSegment[] = [];

  for (let i = 0; i < segmentPaths.length; i += 1) {
    const normPath = path.join(workDir, `concat-seg-${i}-normalized.mp4`);
    let readyPath = path.join(workDir, `concat-seg-${i}-ready.mp4`);
    const probed = await normalizeSegment(segmentPaths[i]!, normPath, maxWidth);
    const joinBefore = joinPlans?.find((p) => p.segmentB === i);
    const joinAfter = joinPlans?.find((p) => p.segmentA === i);
    const trim = getEdgeTrimFramesForJoin(
      i,
      segmentPaths.length,
      transitionType,
      joinBefore,
      joinAfter
    );
    let durationSec = await trimSegmentEdges(normPath, readyPath, probed.durationSec, trim, MERGE_OUTPUT_FPS);

    if (joinBefore?.applyExposureCorrection) {
      const correction =
        joinBefore.exposureDelta != null ?
          computeExposureCorrectionFromDelta(joinBefore.exposureDelta)
        : null;
      if (correction?.shouldApply) {
        const correctedPath = path.join(workDir, `concat-seg-${i}-exposure.mp4`);
        try {
          await applyIncomingSegmentExposureCorrection(readyPath, correctedPath, correction);
          readyPath = correctedPath;
          const reprobe = await probeVideoSegment(readyPath);
          if (reprobe) {
            durationSec = reprobe.durationSec;
          }
          console.info("[join-exposure-normalize]", {
            segmentIndex: i,
            join: `${joinBefore.segmentA}→${joinBefore.segmentB}`,
            delta: correction.delta,
            brightness: correction.brightness,
            contrast: correction.contrast,
          });
        } catch (err) {
          console.warn("[join-exposure-normalize]", {
            segmentIndex: i,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const finalProbe = (await probeVideoSegment(readyPath)) ?? probed;
    if (durationSec < MIN_SEGMENT_DURATION_AFTER_TRIM_SEC) {
      throw new SegmentTrimTooAggressiveError(
        `Segment ${i} duration after trim ${durationSec.toFixed(3)}s < ${MIN_SEGMENT_DURATION_AFTER_TRIM_SEC}s (incoming=${trim.incoming} outgoing=${trim.outgoing} frames).`
      );
    }
    prepared.push({
      index: i,
      path: readyPath,
      durationSec,
      width: finalProbe.width,
      height: finalProbe.height,
    });
  }

  return prepared;
}

async function concatStraight(prepared: PreparedSegment[], outputFile: string, workDir: string): Promise<void> {
  const concatFile = path.join(workDir, "segments-concat.txt");
  const concatLines = prepared
    .map((p) => `file '${path.resolve(p.path).replace(/'/g, `'\\''`)}'`)
    .join("\n");
  await fs.writeFile(concatFile, `${concatLines}\n`, "utf8");
  const args = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFile,
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
    outputFile,
  ];
  const result = await runCapture(ffmpegBinary(), args);
  if (result.code !== 0) {
    throw new Error(`Straight segment concat failed: ${result.stderr.trim().slice(-3000)}`);
  }
}

async function concatWithXfade(
  prepared: PreparedSegment[],
  outputFile: string,
  transitionType: SegmentTransitionType,
  perJoinTransitionSec?: number[]
): Promise<void> {
  const defaultSec = transitionDurationSeconds(transitionType);
  const xfadeName = xfadeTransitionName(transitionType);
  const args = ["-y"];
  for (const seg of prepared) {
    args.push("-i", seg.path);
  }
  const filterParts: string[] = [];
  for (let i = 0; i < prepared.length; i += 1) {
    filterParts.push(`[${i}:v]settb=AVTB,format=yuv420p[v${i}]`);
  }
  let timelineSec = prepared[0]!.durationSec;
  let lastLabel = "v0";
  for (let i = 1; i < prepared.length; i += 1) {
    const joinIndex = i - 1;
    const transitionSec = perJoinTransitionSec?.[joinIndex] ?? defaultSec;
    const outLabel = `x${i}`;
    const offset = Math.max(0, timelineSec - transitionSec);
    filterParts.push(
      `[${lastLabel}][v${i}]xfade=transition=${xfadeName}:duration=${transitionSec.toFixed(4)}:offset=${offset.toFixed(4)}[${outLabel}]`
    );
    lastLabel = outLabel;
    timelineSec += prepared[i]!.durationSec - transitionSec;
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
  if (FINAL_MERGE_DISABLE_AUDIO) {
    args.push("-an");
  }
  args.push(outputFile);
  const result = await runCapture(ffmpegBinary(), args);
  if (result.code !== 0) {
    throw new Error(`Segment xfade concat failed: ${result.stderr.trim().slice(-3000)}`);
  }
}

export type ConcatMotionSegmentsInput = {
  workDir: string;
  segmentPaths: string[];
  outputFile: string;
  maxWidth: number;
  transitionType: SegmentTransitionType;
  /** Per join (segmentA→segmentB) from exact-frame continuity analysis. */
  joinPlans?: SegmentJoinPlan[];
};

export type TransitionPreviewMetadata = {
  transitionType: SegmentTransitionType;
  joins: Array<{
    segmentA: number;
    segmentB: number;
    durationFrames: number;
    trimmedOutgoing: number;
    trimmedIncoming: number;
    similarity?: number;
    continuityMode?: string;
    mergeDissolveRatio?: number;
    mergeType?: string;
    joinMode?: string;
    exposureDelta?: number;
    exposureCorrected?: boolean;
  }>;
  antiFlashGuard: boolean;
  normalizedFps: number;
  normalizedResolution: string;
};

export type ConcatMotionSegmentsResult = {
  transitionType: SegmentTransitionType;
  preparedCount: number;
  transitionDurationFrames: number;
  usedOpticalBlend: boolean;
  normalizedFps: number;
  normalizedResolution: string;
  transitionPreview: TransitionPreviewMetadata;
};

/** Normalize, trim edge frames, and join Vidu segments with seamless transitions. */
export async function concatMotionSegmentsWithTransitions(
  input: ConcatMotionSegmentsInput
): Promise<ConcatMotionSegmentsResult> {
  const { workDir, segmentPaths, outputFile, maxWidth, transitionType, joinPlans } = input;

  if (segmentPaths.length === 0) {
    throw new Error("No segments to concatenate.");
  }

  if (segmentPaths.length === 1) {
    const probed = await normalizeSegment(segmentPaths[0]!, outputFile, maxWidth);
    return {
      transitionType,
      preparedCount: 1,
      transitionDurationFrames: 0,
      usedOpticalBlend: false,
      normalizedFps: MERGE_OUTPUT_FPS,
      normalizedResolution: `${probed.width}x${probed.height}`,
      transitionPreview: {
        transitionType,
        joins: [],
        antiFlashGuard: true,
        normalizedFps: MERGE_OUTPUT_FPS,
        normalizedResolution: `${probed.width}x${probed.height}`,
      },
    };
  }

  const prepared = await prepareMotionSegmentsForConcat({
    workDir,
    segmentPaths,
    maxWidth,
    transitionType,
    joinPlans,
  });

  const frames = transitionDurationFrames(transitionType);
  const optical = usesOpticalBlend(transitionType);
  const joins: TransitionPreviewMetadata["joins"] = [];

  const perJoinTransitionSec: number[] = [];

  for (let i = 0; i < prepared.length - 1; i += 1) {
    const plan = joinPlans?.find((p) => p.segmentA === i && p.segmentB === i + 1);
    const trimA = getEdgeTrimFramesForJoin(i, prepared.length, transitionType, undefined, plan);
    const trimB = getEdgeTrimFramesForJoin(i + 1, prepared.length, transitionType, plan, undefined);
    const joinTransitionSec = plan?.transitionSec ?? transitionDurationSeconds(transitionType);
    const joinFrames = Math.max(0, Math.round(joinTransitionSec * MERGE_OUTPUT_FPS));
    perJoinTransitionSec.push(joinTransitionSec);

    joins.push({
      segmentA: i,
      segmentB: i + 1,
      durationFrames: joinFrames,
      trimmedOutgoing: trimA.outgoing,
      trimmedIncoming: trimB.incoming,
      similarity: plan?.similarity,
      continuityMode: plan?.mode,
      mergeDissolveRatio: plan?.mergeDissolveRatio,
      mergeType: plan?.mergeType,
      joinMode: plan?.joinMode,
      exposureDelta: plan?.exposureDelta,
      exposureCorrected: plan?.applyExposureCorrection ?? false,
    });
    logSegmentTransition({
      transitionType,
      segmentA: i,
      segmentB: i + 1,
      transitionDurationFrames: joinFrames,
      usedOpticalBlend: optical,
      trimmedFrames: {
        outgoing: trimA.outgoing,
        incoming: trimB.incoming,
      },
      normalizedFps: MERGE_OUTPUT_FPS,
      normalizedResolution: `${prepared[i]!.width}x${prepared[i]!.height}`,
    });
    console.info("[exact-frame-continuity]", {
      segmentA: i,
      segmentB: i + 1,
      similarity: plan?.similarity,
      mode: plan?.mode,
      joinMode: plan?.joinMode,
      mergeType: plan?.mergeType,
      mergeDissolveRatio: plan?.mergeDissolveRatio,
      transitionSec: joinTransitionSec,
      exposureDelta: plan?.exposureDelta,
      applyExposureCorrection: plan?.applyExposureCorrection,
    });
  }

  if (transitionType === "straight_cut") {
    await concatStraight(prepared, outputFile, workDir);
  } else {
    await concatWithXfade(prepared, outputFile, transitionType, perJoinTransitionSec);
  }

  const first = prepared[0]!;
  const transitionPreview: TransitionPreviewMetadata = {
    transitionType,
    joins,
    antiFlashGuard: transitionType !== "straight_cut",
    normalizedFps: MERGE_OUTPUT_FPS,
    normalizedResolution: `${first.width}x${first.height}`,
  };
  console.info("[segment-transition]", { phase: "preview_metadata", ...transitionPreview });

  return {
    transitionType,
    preparedCount: prepared.length,
    transitionDurationFrames: frames,
    usedOpticalBlend: optical,
    normalizedFps: MERGE_OUTPUT_FPS,
    normalizedResolution: `${first.width}x${first.height}`,
    transitionPreview,
  };
}
