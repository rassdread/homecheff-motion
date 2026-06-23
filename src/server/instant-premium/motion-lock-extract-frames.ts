/**
 * Sprint G/H — dense segment frame extraction via FFmpeg.
 */

import { spawn } from "node:child_process";
import {
  getResolvedFfmpegPathSync,
  mapSpawnError,
  resolveFfmpegBinaries,
} from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import fs from "node:fs/promises";
import {
  MOTION_LOCK_SAMPLE_POINTS,
  resolveSampleTimes,
} from "@/lib/motion-lock-dense-sampling";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const MOTION_LOCK_FRAME_EXTRACT_CONCURRENCY = 3;

export type RepresentativeSegmentFrames = {
  start: Buffer;
  middle: Buffer;
  end: Buffer;
  width: number;
  height: number;
  durationSec: number;
};

export type DenseSegmentFrameSample = {
  percent: number;
  buffer: Buffer;
};

export type DenseSegmentFrames = {
  samples: DenseSegmentFrameSample[];
  width: number;
  height: number;
  durationSec: number;
};

function ffmpegBinary(): string {
  return getResolvedFfmpegPathSync();
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
    child.on("error", (err) => mapSpawnError(err, "ffmpeg"));
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr, stdout: Buffer.concat(chunks) });
    });
  });
}

async function extractPngFrame(filePath: string, timeSec: number): Promise<Buffer | null> {
  const result = await runCapture(ffmpegBinary(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    timeSec.toFixed(4),
    "-i",
    filePath,
    "-frames:v",
    "1",
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "-",
  ]);
  if (result.code !== 0 || result.stdout.length < 64) {
    return null;
  }
  return result.stdout;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current]!, current);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function extractDenseSegmentFrames(
  filePath: string,
  options?: { concurrency?: number }
): Promise<DenseSegmentFrames | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  await resolveFfmpegBinaries();
  const probed = await probeVideoSegment(filePath);
  if (!probed || probed.durationSec <= 0) {
    return null;
  }

  const durationSec = probed.durationSec;
  const fps = probed.fps > 0 ? probed.fps : 30;
  const times = resolveSampleTimes(durationSec, fps);
  const concurrency = options?.concurrency ?? MOTION_LOCK_FRAME_EXTRACT_CONCURRENCY;

  const buffers = await mapWithConcurrency(times, concurrency, (timeSec) =>
    extractPngFrame(filePath, timeSec)
  );

  const samples: DenseSegmentFrameSample[] = [];
  for (let i = 0; i < MOTION_LOCK_SAMPLE_POINTS.length; i += 1) {
    const buffer = buffers[i];
    const percent = MOTION_LOCK_SAMPLE_POINTS[i]!;
    if (!buffer) {
      return null;
    }
    samples.push({ percent, buffer });
  }

  const sharp = (await import("sharp")).default;
  const meta = await sharp(samples[0]!.buffer).metadata();
  const width = meta.width ?? 720;
  const height = meta.height ?? 1280;

  return { samples, width, height, durationSec };
}

/** @deprecated Sprint G alias — derived from dense 0% / 50% / 100% samples. */
export async function extractRepresentativeSegmentFrames(
  filePath: string
): Promise<RepresentativeSegmentFrames | null> {
  const dense = await extractDenseSegmentFrames(filePath);
  if (!dense || dense.samples.length < 3) {
    return null;
  }

  const start = dense.samples.find((s) => s.percent === 0)?.buffer;
  const middle = dense.samples.find((s) => s.percent === 0.5)?.buffer;
  const end = dense.samples.find((s) => s.percent === 1)?.buffer;
  if (!start || !middle || !end) {
    return null;
  }

  return {
    start,
    middle,
    end,
    width: dense.width,
    height: dense.height,
    durationSec: dense.durationSec,
  };
}
