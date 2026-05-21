/**
 * Subtle pre-merge exposure matching between segment joins (ffmpeg EQ).
 */

import { spawn } from "node:child_process";
import {
  EXPOSURE_MISMATCH_FORCE_NORMALIZE,
  shouldForceExposureNormalize,
} from "@/lib/exact-frame-continuity";

export const EXPOSURE_APPLY_THRESHOLD = 0.03;
export const MAX_BRIGHTNESS_CORRECTION = 0.04;
export const MAX_CONTRAST_CORRECTION = 0.06;
export const MAX_SATURATION_CORRECTION = 0.05;

export type ExposureCorrection = {
  brightness: number;
  contrast: number;
  saturation: number;
  delta: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map luminance gap (A end → B start) to subtle EQ on incoming segment B. */
export function computeExposureCorrectionFromLuminance(
  luminanceEnd: number,
  luminanceStart: number
): ExposureCorrection & { shouldApply: boolean } {
  const end = clamp(luminanceEnd, 0, 1);
  const start = clamp(luminanceStart, 0, 1);
  const delta = Math.abs(end - start);
  const brightness = clamp(end - start, -MAX_BRIGHTNESS_CORRECTION, MAX_BRIGHTNESS_CORRECTION);
  const contrast = clamp(1 + (end - start) * 0.35, 1 - MAX_CONTRAST_CORRECTION, 1 + MAX_CONTRAST_CORRECTION);
  const saturation = clamp(1 + (end - start) * 0.2, 1 - MAX_SATURATION_CORRECTION, 1 + MAX_SATURATION_CORRECTION);
  const shouldApply =
    delta >= EXPOSURE_APPLY_THRESHOLD || shouldForceExposureNormalize(delta);
  return { brightness, contrast, saturation, delta, shouldApply };
}

export function computeExposureCorrectionFromDelta(
  exposureDelta: number | undefined
): (ExposureCorrection & { shouldApply: boolean }) | null {
  if (typeof exposureDelta !== "number" || !Number.isFinite(exposureDelta)) {
    return null;
  }
  const delta = Math.abs(exposureDelta);
  const sign = exposureDelta >= 0 ? 1 : -1;
  const brightness = clamp(sign * delta * 0.45, -MAX_BRIGHTNESS_CORRECTION, MAX_BRIGHTNESS_CORRECTION);
  const contrast = clamp(1 + sign * delta * 0.25, 1 - MAX_CONTRAST_CORRECTION, 1 + MAX_CONTRAST_CORRECTION);
  const saturation = clamp(1, 1 - MAX_SATURATION_CORRECTION, 1 + MAX_SATURATION_CORRECTION);
  const shouldApply =
    delta >= EXPOSURE_APPLY_THRESHOLD || delta > EXPOSURE_MISMATCH_FORCE_NORMALIZE;
  return { brightness, contrast, saturation, delta, shouldApply };
}

function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function runCapture(
  binary: string,
  args: string[],
  timeoutMs = 10 * 60 * 1000
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
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

/** Apply mild EQ to full segment so incoming edge matches prior segment luminance. */
export async function applyIncomingSegmentExposureCorrection(
  inputPath: string,
  outputPath: string,
  correction: ExposureCorrection
): Promise<void> {
  const b = correction.brightness.toFixed(4);
  const c = correction.contrast.toFixed(4);
  const s = correction.saturation.toFixed(4);
  const vf = `eq=brightness=${b}:contrast=${c}:saturation=${s}`;
  const args = [
    "-y",
    "-i",
    inputPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    outputPath,
  ];
  const result = await runCapture(ffmpegBinary(), args);
  if (result.code !== 0) {
    throw new Error(
      `Exposure normalize failed: ${result.stderr.trim().slice(-1500)}`
    );
  }
}
