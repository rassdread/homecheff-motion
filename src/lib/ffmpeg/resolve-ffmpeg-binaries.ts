/**
 * Resolve ffmpeg/ffprobe binaries for serverless (Vercel), Railway, and local Node.
 */

import { spawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const FFMPEG_BINARY_MISSING = "FFMPEG_BINARY_MISSING";
export const FFPROBE_BINARY_MISSING = "FFPROBE_BINARY_MISSING";

export const VIDEO_TOOLS_USER_MESSAGE_NL =
  "Video rendering tools ontbreken op de server.";
export const VIDEO_TOOLS_USER_MESSAGE_EN =
  "Video rendering tools are missing on the server.";

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

export class VideoToolsMissingError extends Error {
  readonly code: typeof FFMPEG_BINARY_MISSING | typeof FFPROBE_BINARY_MISSING;

  constructor(
    code: typeof FFMPEG_BINARY_MISSING | typeof FFPROBE_BINARY_MISSING,
    message: string = VIDEO_TOOLS_USER_MESSAGE_NL,
    cause?: unknown
  ) {
    super(message);
    this.name = "VideoToolsMissingError";
    this.code = code;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

let resolvedCache: ResolvedFfmpegBinaries | null = null;
let startupLogged = false;

function loadFfmpegStaticPath(): string | null {
  try {
    const value = require("ffmpeg-static") as string | null | undefined;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function loadFfprobeStaticPath(): string | null {
  try {
    const mod = require("ffprobe-static") as { path?: string } | string | null | undefined;
    if (typeof mod === "string" && mod.trim()) {
      return mod.trim();
    }
    if (mod && typeof mod === "object" && typeof mod.path === "string" && mod.path.trim()) {
      return mod.path.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function buildFfmpegCandidatePaths(): string[] {
  const ordered: string[] = [];
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    ordered.push(fromEnv);
  }
  const fromStatic = loadFfmpegStaticPath();
  if (fromStatic) {
    ordered.push(fromStatic);
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
  const fromStatic = loadFfprobeStaticPath();
  if (fromStatic) {
    ordered.push(fromStatic);
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

export function isSpawnEnoent(spawnError?: string | null): boolean {
  if (!spawnError) {
    return false;
  }
  return spawnError.includes("ENOENT") || /\benoent\b/i.test(spawnError);
}

export function sanitizeSpawnErrorMessage(spawnError?: string): string {
  if (!spawnError) {
    return "";
  }
  if (isSpawnEnoent(spawnError)) {
    return VIDEO_TOOLS_USER_MESSAGE_NL;
  }
  return spawnError;
}

export function classifySpawnToolFromBinary(binary: string): "ffmpeg" | "ffprobe" {
  return binary.toLowerCase().includes("ffprobe") ? "ffprobe" : "ffmpeg";
}

export function mapSpawnError(
  err: unknown,
  tool: "ffmpeg" | "ffprobe"
): never {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT" || message.includes("ENOENT")) {
    throw new VideoToolsMissingError(
      tool === "ffprobe" ? FFPROBE_BINARY_MISSING : FFMPEG_BINARY_MISSING,
      VIDEO_TOOLS_USER_MESSAGE_NL,
      err
    );
  }
  if (err instanceof Error) {
    throw err;
  }
  throw new Error(message);
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
