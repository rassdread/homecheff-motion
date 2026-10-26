/**
 * Burns a user-selected logo onto the closing scene.
 * The image is scaled with its original aspect ratio and PNG alpha. It is not sent to the video provider.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

const execFileAsync = promisify(execFile);

export type ClosingLogoWindow = {
  imageUrl: string;
  startSeconds: number;
  endSeconds: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readClosingLogoFromHandoff(studioHandoffJson: unknown): ClosingLogoWindow | null {
  if (!isPlainObject(studioHandoffJson)) {
    return null;
  }
  const logo = studioHandoffJson.closingLogo;
  if (!isPlainObject(logo)) {
    return null;
  }
  const imageUrl = typeof logo.imageUrl === "string" ? logo.imageUrl.trim() : "";
  const startSeconds = Number(logo.startSeconds);
  const endSeconds = Number(logo.endSeconds);
  if (!imageUrl || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
    return null;
  }
  return { imageUrl, startSeconds, endSeconds };
}

export function readFinishRequirementsFromHandoff(studioHandoffJson: unknown): {
  voiceRequested: boolean;
  musicRequested: boolean;
} | null {
  if (!isPlainObject(studioHandoffJson)) {
    return null;
  }
  const finish = studioHandoffJson.finishRequirements;
  if (!isPlainObject(finish)) {
    return null;
  }
  return {
    voiceRequested: finish.voiceRequested === true,
    musicRequested: finish.musicRequested === true,
  };
}

async function clearConnectedEdgeBackground(logoPath: string, ffmpeg: string): Promise<string | null> {
  const probe = await execFileAsync(ffmpeg.replace(/ffmpeg$/, "ffprobe"), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    logoPath,
  ]).catch(() => null);
  const size = probe?.stdout.trim() ?? "";
  const [widthRaw, heightRaw] = size.split("x");
  const width = Number(widthRaw);
  const height = Number(heightRaw);
  if (!width || !height) {
    return null;
  }
  const rawPath = path.join(os.tmpdir(), `hc-logo-${width}x${height}.rgba`);
  const outPath = path.join(os.tmpdir(), `hc-logo-${width}x${height}.overlay.png`);
  await execFileAsync(ffmpeg, ["-y", "-i", logoPath, "-f", "rawvideo", "-pix_fmt", "rgba", rawPath]);
  const raw = await readFile(rawPath);
  if (raw.length < width * height * 4) {
    return null;
  }
  const pixels = Buffer.from(raw.subarray(0, width * height * 4));
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const nearWhite = (index: number) => {
    const o = index * 4;
    return pixels[o]! > 245 && pixels[o + 1]! > 245 && pixels[o + 2]! > 245;
  };
  const push = (index: number) => {
    if (index < 0 || index >= width * height || seen[index] || !nearWhite(index)) {
      return;
    }
    seen[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  let cleared = 0;
  while (stack.length > 0) {
    const index = stack.pop()!;
    pixels[index * 4 + 3] = 0;
    cleared += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) push(index - 1);
    if (x + 1 < width) push(index + 1);
    if (y > 0) push(index - width);
    if (y + 1 < height) push(index + width);
  }
  if (cleared < 16) {
    return null;
  }
  await writeFile(rawPath, pixels);
  await execFileAsync(ffmpeg, [
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${width}x${height}`,
    "-i",
    rawPath,
    outPath,
  ]);
  return outPath;
}

export type ClosingLogoPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/** Unset placement keeps the existing upper-center closing mark. */
export function closingLogoOverlayGeometry(params: {
  placement?: ClosingLogoPlacement;
  videoWidth: number;
  widthFraction?: number;
}): { width: number; x: string; y: string } {
  const fraction = params.placement
    ? Math.max(0.08, Math.min(0.28, params.widthFraction ?? 0.16))
    : 0.28;
  const rawLogoWidth = Math.max(64, Math.round(Math.max(1, params.videoWidth) * fraction));
  const width = rawLogoWidth % 2 === 0 ? rawLogoWidth : rawLogoWidth + 1;
  if (!params.placement) {
    return { width, x: "(main_w-overlay_w)/2", y: "main_h*0.22" };
  }
  const insetX = "main_w*0.05";
  const top = "main_h*0.06";
  const bottom = "main_h-overlay_h-main_h*0.16";
  if (params.placement === "top-left") return { width, x: insetX, y: top };
  if (params.placement === "top-right") return { width, x: `main_w-overlay_w-${insetX}`, y: top };
  if (params.placement === "bottom-left") return { width, x: insetX, y: bottom };
  if (params.placement === "bottom-right") return { width, x: `main_w-overlay_w-${insetX}`, y: bottom };
  return { width, x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" };
}

/** Keep the closing mark inside the real video, including a short probed file. */
export function closingLogoWindow(params: {
  startSeconds: number;
  endSeconds: number;
  videoDurationSeconds: number;
}): { startSeconds: number; endSeconds: number } {
  const videoEnd = Math.max(0.2, params.videoDurationSeconds);
  let start = Math.max(0, params.startSeconds);
  let end = Math.max(start + 0.2, params.endSeconds);
  if (start >= videoEnd - 0.2) {
    const span = Math.min(6, Math.max(1.5, end - start));
    start = Math.max(0, videoEnd - span);
    end = videoEnd;
  } else if (end > videoEnd) {
    end = videoEnd;
  }
  return { startSeconds: start, endSeconds: end };
}

export async function burnClosingLogoOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  logoPath: string;
  startSeconds: number;
  endSeconds: number;
  videoDurationSeconds: number;
  videoWidth: number;
  placement?: ClosingLogoPlacement;
  widthFraction?: number;
  opacity?: number;
}): Promise<void> {
  const binary = await resolveFfmpegForTextOverlay();
  const preparedLogo = await clearConnectedEdgeBackground(params.logoPath, binary);
  const logoInput = preparedLogo ?? params.logoPath;
  const start = Math.max(0, params.startSeconds);
  const end = Math.max(start + 0.2, params.endSeconds);
  const duration = Math.max(end, params.videoDurationSeconds);
  const geometry = closingLogoOverlayGeometry({
    placement: params.placement,
    videoWidth: params.videoWidth,
    widthFraction: params.widthFraction,
  });
  const opacity = Math.max(0.15, Math.min(1, params.opacity ?? 1));
  const opacityFilter = opacity < 0.999 ? `,colorchannelmixer=aa=${opacity.toFixed(2)}` : "";
  const enable = `between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})`;
  const filter = [
    `[1:v]scale=${geometry.width}:-2:flags=lanczos,format=rgba${opacityFilter}[lg]`,
    `[0:v][lg]overlay=x='${geometry.x}':y='${geometry.y}':enable='${enable}':format=auto[vout]`,
  ].join(";");
  const args = [
    "-y",
    "-i",
    path.resolve(params.inputVideoPath),
    "-loop",
    "1",
    "-i",
    path.resolve(logoInput),
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-t",
    duration.toFixed(3),
    "-movflags",
    "+faststart",
    path.resolve(params.outputVideoPath),
  ];
  const result = await runFfmpegCapture(binary, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    throw new Error(result.output?.slice(-500) || "Closing logo overlay failed.");
  }
}
