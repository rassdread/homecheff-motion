/**
 * App / Vercel ffmpeg resolution: env paths and system PATH only (no ffmpeg-static bundle).
 */

import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import {
  FFMPEG_BINARY_MISSING,
  FFPROBE_BINARY_MISSING,
  VideoToolsMissingError,
} from "@/lib/ffmpeg/ffmpeg-binary-errors";

export {
  FFMPEG_BINARY_MISSING,
  FFPROBE_BINARY_MISSING,
  VideoToolsMissingError,
  isSpawnEnoent,
  sanitizeSpawnErrorMessage,
  classifySpawnToolFromBinary,
  mapSpawnError,
  VIDEO_TOOLS_USER_MESSAGE_EN,
  VIDEO_TOOLS_USER_MESSAGE_NL,
} from "@/lib/ffmpeg/ffmpeg-binary-errors";

const FFMPEG_SYSTEM_CANDIDATES = [
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
] as const;

const FFPROBE_SYSTEM_CANDIDATES = [
  "/usr/bin/ffprobe",
  "/usr/local/bin/ffprobe",
  "/opt/homebrew/bin/ffprobe",
  "/opt/homebrew/opt/ffmpeg-full/bin/ffprobe",
] as const;

export type ResolvedFfmpegBinaries = {
  ffmpegPath: string;
  ffprobePath: string;
  ffmpegExists: boolean;
  ffprobeExists: boolean;
  runtime: string;
};

let resolvedCache: ResolvedFfmpegBinaries | null = null;
let startupLogged = false;

export function buildFfmpegCandidatePaths(): string[] {
  const ordered: string[] = [];
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    ordered.push(fromEnv);
  }
  for (const candidate of FFMPEG_SYSTEM_CANDIDATES) {
    ordered.push(candidate);
  }
  ordered.push("ffmpeg");
  return [...new Set(ordered)];
}

export function buildFfprobeCandidatePaths(): string[] {
  const ordered: string[] = [];
  const fromEnv = process.env.FFPROBE_PATH?.trim();
  if (fromEnv) {
    ordered.push(fromEnv);
  }
  for (const candidate of FFPROBE_SYSTEM_CANDIDATES) {
    ordered.push(candidate);
  }
  ordered.push("ffprobe");
  return [...new Set(ordered)];
}

async function probeBinaryVersion(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(binary, ["-version"], { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(false);
    }, 10_000);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function binaryExists(binary: string): Promise<boolean> {
  if (binary.includes("/")) {
    try {
      await access(binary, constants.X_OK);
      return true;
    } catch {
      try {
        await access(binary, constants.R_OK);
        return true;
      } catch {
        return false;
      }
    }
  }
  return probeBinaryVersion(binary);
}

async function pickExistingBinary(candidates: string[]): Promise<{
  path: string;
  exists: boolean;
}> {
  for (const candidate of candidates) {
    if (await binaryExists(candidate)) {
      return { path: candidate, exists: true };
    }
  }
  return { path: candidates[0] ?? "ffmpeg", exists: false };
}

export function logFfmpegBinariesStartup(report: ResolvedFfmpegBinaries): void {
  if (startupLogged) {
    return;
  }
  startupLogged = true;
  console.info("[ffmpeg-binaries]", {
    ffmpegPath: report.ffmpegPath,
    ffprobePath: report.ffprobePath,
    ffmpegExists: report.ffmpegExists,
    ffprobeExists: report.ffprobeExists,
    runtime: report.runtime,
  });
}

export async function resolveFfmpegBinaries(
  options?: { force?: boolean }
): Promise<ResolvedFfmpegBinaries> {
  if (resolvedCache && !options?.force) {
    return resolvedCache;
  }

  const ffmpegCandidates = buildFfmpegCandidatePaths();
  const ffprobeCandidates = buildFfprobeCandidatePaths();
  const [ffmpeg, ffprobe] = await Promise.all([
    pickExistingBinary(ffmpegCandidates),
    pickExistingBinary(ffprobeCandidates),
  ]);

  const report: ResolvedFfmpegBinaries = {
    ffmpegPath: ffmpeg.path,
    ffprobePath: ffprobe.path,
    ffmpegExists: ffmpeg.exists,
    ffprobeExists: ffprobe.exists,
    runtime: process.env.VERCEL ? "vercel" : process.env.RAILWAY_ENVIRONMENT ? "railway" : "node",
  };

  resolvedCache = report;
  logFfmpegBinariesStartup(report);
  return report;
}

export function getCachedFfmpegBinaries(): ResolvedFfmpegBinaries | null {
  return resolvedCache;
}

export function getResolvedFfmpegPathSync(): string {
  if (resolvedCache?.ffmpegExists) {
    return resolvedCache.ffmpegPath;
  }
  return buildFfmpegCandidatePaths()[0] ?? "ffmpeg";
}

export function getResolvedFfprobePathSync(): string {
  if (resolvedCache?.ffprobeExists) {
    return resolvedCache.ffprobePath;
  }
  return buildFfprobeCandidatePaths()[0] ?? "ffprobe";
}

export async function requireFfmpegPath(): Promise<string> {
  const report = await resolveFfmpegBinaries();
  if (!report.ffmpegExists) {
    throw new VideoToolsMissingError(FFMPEG_BINARY_MISSING);
  }
  return report.ffmpegPath;
}

export async function requireFfprobePath(): Promise<string> {
  const report = await resolveFfmpegBinaries();
  if (!report.ffprobeExists) {
    throw new VideoToolsMissingError(FFPROBE_BINARY_MISSING);
  }
  return report.ffprobePath;
}

export type VideoToolsRuntimeStatus = {
  ffmpeg: boolean;
  ffprobe: boolean;
  ffmpegPath: string;
  ffprobePath: string;
  ffmpegExists: boolean;
  ffprobeExists: boolean;
  runtime: string;
};

export async function getVideoToolsRuntimeStatus(): Promise<VideoToolsRuntimeStatus> {
  const report = await resolveFfmpegBinaries();
  return {
    ffmpeg: report.ffmpegExists,
    ffprobe: report.ffprobeExists,
    ffmpegPath: report.ffmpegPath,
    ffprobePath: report.ffprobePath,
    ffmpegExists: report.ffmpegExists,
    ffprobeExists: report.ffprobeExists,
    runtime: report.runtime,
  };
}
