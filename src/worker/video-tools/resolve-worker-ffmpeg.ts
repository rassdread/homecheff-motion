/**
 * Worker-only ffmpeg resolution (may use ffmpeg-static / ffprobe-static).
 * Import only from worker/video-worker.ts — never from Next.js app routes.
 */

import { createRequire } from "node:module";
import { resolveFfmpegBinaries } from "@/lib/ffmpeg/resolve-app-ffmpeg";

const require = createRequire(import.meta.url);

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

/** Sets FFMPEG_PATH / FFPROBE_PATH from static packages when env is unset, then resolves binaries. */
export async function installWorkerFfmpegPaths(): Promise<void> {
  const ffmpeg = loadFfmpegStaticPath();
  const ffprobe = loadFfprobeStaticPath();
  if (ffmpeg && !process.env.FFMPEG_PATH?.trim()) {
    process.env.FFMPEG_PATH = ffmpeg;
  }
  if (ffprobe && !process.env.FFPROBE_PATH?.trim()) {
    process.env.FFPROBE_PATH = ffprobe;
  }
  await resolveFfmpegBinaries({ force: true });
}
