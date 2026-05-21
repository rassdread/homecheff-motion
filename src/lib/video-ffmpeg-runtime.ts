import { isVideoRenderWorkerMode, isVideoWorkerConfigured } from "@/lib/video-render-mode";

export function isVercelServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/** True when this process may spawn ffmpeg/ffprobe (local dev without worker mode). */
export function shouldRunFfmpegLocally(): boolean {
  if (isVercelServerless()) {
    return false;
  }
  if (isVideoRenderWorkerMode()) {
    return false;
  }
  return true;
}

export function assertVideoWorkerConfiguredForRender(): void {
  if (isVideoWorkerConfigured()) {
    return;
  }
  throw new Error(
    "VIDEO_WORKER_BASE_URL and VIDEO_WORKER_SECRET must be set for language export rendering."
  );
}
