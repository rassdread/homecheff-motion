import { access, constants } from "node:fs/promises";
import { spawn } from "node:child_process";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import {
  isVideoRenderWorkerMode,
  isVideoWorkerConfigured,
} from "@/lib/video-render-mode";
import { fetchWorkerVideoHealth } from "@/lib/video-worker-client";

export const VIDEO_TEXT_RENDERING_UNAVAILABLE =
  "Video text rendering is not available on this server. Please contact support.";

export const FFMPEG_DRAWTEXT_REQUIRED_CODE = "VIDEO_RENDERING_UNAVAILABLE";

const FFMPEG_CANDIDATE_PATHS = [
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
  "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
] as const;

export type VideoFfmpegCapabilityReport = {
  ok: boolean;
  ffmpegPath: string | null;
  hasDrawtext: boolean;
  fontPath: string | null;
  fontReadable: boolean;
  errors: string[];
};

export type VideoHealthResponse = {
  ok: boolean;
  ffmpegPath: string | null;
  hasDrawtext: boolean;
  fontPath: string | null;
  fontReadable: boolean;
  errors: string[];
  mode?: string;
  worker?: VideoHealthResponse | null;
};

/** UI-safe + DB-safe overlay error (no secrets, no home paths). */
export function sanitizeOverlayError(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "[redacted]")
    .replace(/sk_[a-zA-Z0-9]+/g, "[redacted]")
    .replace(/\/Users\/[^\s:'"]+/g, "[path]")
    .replace(/\/home\/[^\s:'"]+/g, "[path]")
    .replace(/DATABASE_URL=\S+/gi, "[redacted]")
    .trim()
    .slice(0, 500);
}

export function isUnsafeVideoRenderingAllowed(): boolean {
  return process.env.ALLOW_UNSAFE_VIDEO_RENDERING === "true";
}

export function shouldEnforceLockedTextRenderingCheck(): boolean {
  if (getInstantPremiumMode() === "paid") {
    return true;
  }
  return !isUnsafeVideoRenderingAllowed();
}

export function resolveConfiguredFontPath(): string {
  const fromEnv = process.env.FFMPEG_FONT_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.platform === "darwin") {
    return "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
  }
  return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
}

/** Ordered FFmpeg binary candidates (deduped). */
export function resolveFfmpegCandidatePaths(): string[] {
  const ordered: string[] = [];
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    ordered.push(fromEnv);
  }
  for (const candidate of FFMPEG_CANDIDATE_PATHS) {
    ordered.push(candidate);
  }
  ordered.push("ffmpeg");
  return [...new Set(ordered)];
}

export function ffmpegFiltersOutputIncludesDrawtext(output: string): boolean {
  return /\bdrawtext\b/.test(output);
}

export async function runFfmpegCapture(
  binary: string,
  args: string[],
  options?: { timeoutMs?: number }
): Promise<{ code: number; output: string; spawnError?: string }> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (options?.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs);
    }
    let output = "";
    const append = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: 1, output, spawnError: err.message });
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, output });
    });
  });
}

async function fileIsReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function binaryExists(binary: string): Promise<boolean> {
  if (binary.includes("/")) {
    return fileIsReadable(binary);
  }
  const probe = await runFfmpegCapture(binary, ["-version"], { timeoutMs: 10_000 });
  return probe.code === 0 && !probe.spawnError;
}

async function probeFfmpegBinary(binary: string): Promise<{
  exists: boolean;
  versionOk: boolean;
  hasDrawtext: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const exists = await binaryExists(binary);
  if (!exists) {
    return { exists: false, versionOk: false, hasDrawtext: false, errors: ["ffmpeg binary not found"] };
  }

  const version = await runFfmpegCapture(binary, ["-version"], { timeoutMs: 15_000 });
  if (version.spawnError) {
    errors.push(`ffmpeg spawn failed: ${version.spawnError}`);
    return { exists: true, versionOk: false, hasDrawtext: false, errors };
  }
  if (version.code !== 0) {
    errors.push("ffmpeg -version exited non-zero");
    return { exists: true, versionOk: false, hasDrawtext: false, errors };
  }

  const filters = await runFfmpegCapture(binary, ["-filters"], { timeoutMs: 15_000 });
  if (filters.code !== 0) {
    errors.push("ffmpeg -filters exited non-zero");
    return { exists: true, versionOk: true, hasDrawtext: false, errors };
  }

  const hasDrawtext = ffmpegFiltersOutputIncludesDrawtext(filters.output);
  if (!hasDrawtext) {
    errors.push("ffmpeg -filters does not include drawtext (install ffmpeg with libfreetype)");
  }

  return { exists: true, versionOk: true, hasDrawtext, errors };
}

/** Full capability check for locked text overlay pipeline. */
export async function checkVideoFfmpegCapability(): Promise<VideoFfmpegCapabilityReport> {
  const errors: string[] = [];
  const fontPath = resolveConfiguredFontPath();
  const fontReadable = await fileIsReadable(fontPath);
  if (!fontReadable) {
    errors.push(`font not readable at ${fontPath}`);
  }

  let ffmpegPath: string | null = null;
  let hasDrawtext = false;

  for (const candidate of resolveFfmpegCandidatePaths()) {
    const probe = await probeFfmpegBinary(candidate);
    if (!probe.exists) {
      continue;
    }
    if (!probe.versionOk) {
      errors.push(`${candidate}: version check failed`);
      continue;
    }
    ffmpegPath = candidate;
    hasDrawtext = probe.hasDrawtext;
    if (!hasDrawtext) {
      errors.push(`${candidate}: missing drawtext filter`);
      ffmpegPath = null;
      continue;
    }
    break;
  }

  if (!ffmpegPath) {
    errors.push("no ffmpeg binary with drawtext support found");
  }

  const ok = Boolean(ffmpegPath && hasDrawtext && fontReadable);
  return {
    ok,
    ffmpegPath,
    hasDrawtext,
    fontPath,
    fontReadable,
    errors: [...new Set(errors)],
  };
}

export function toVideoHealthResponse(report: VideoFfmpegCapabilityReport): VideoHealthResponse {
  return {
    ok: report.ok,
    ffmpegPath: report.ffmpegPath,
    hasDrawtext: report.hasDrawtext,
    fontPath: report.fontPath,
    fontReadable: report.fontReadable,
    errors: report.errors,
  };
}

export async function resolveFfmpegForTextOverlay(): Promise<string> {
  const report = await checkVideoFfmpegCapability();
  if (report.ffmpegPath && report.hasDrawtext) {
    return report.ffmpegPath;
  }
  throw new Error(
    "FFmpeg with drawtext is required for locked text overlays. Set FFMPEG_PATH to a build with libfreetype and install fonts (FFMPEG_FONT_PATH)."
  );
}

export type AssertVideoRenderingResult =
  | { ok: true }
  | { ok: false; error: string; code: typeof FFMPEG_DRAWTEXT_REQUIRED_CODE };

export async function assertVideoRenderingReadyForLockedText(): Promise<AssertVideoRenderingResult> {
  if (!shouldEnforceLockedTextRenderingCheck()) {
    return { ok: true };
  }
  if (isVideoRenderWorkerMode()) {
    if (!isVideoWorkerConfigured()) {
      return {
        ok: false,
        error: VIDEO_TEXT_RENDERING_UNAVAILABLE,
        code: FFMPEG_DRAWTEXT_REQUIRED_CODE,
      };
    }
    const worker = await fetchWorkerVideoHealth();
    if (worker?.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: VIDEO_TEXT_RENDERING_UNAVAILABLE,
      code: FFMPEG_DRAWTEXT_REQUIRED_CODE,
    };
  }
  const report = await checkVideoFfmpegCapability();
  if (report.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    error: VIDEO_TEXT_RENDERING_UNAVAILABLE,
    code: FFMPEG_DRAWTEXT_REQUIRED_CODE,
  };
}

export function payloadRequiresLockedTextOverlay(payload: {
  lockedTextMode?: boolean;
  lockedTextLayers?: unknown;
}): boolean {
  if (payload.lockedTextMode === false) {
    return false;
  }
  if (!Array.isArray(payload.lockedTextLayers)) {
    return false;
  }
  return payload.lockedTextLayers.length > 0;
}
