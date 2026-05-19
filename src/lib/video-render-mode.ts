export type VideoRenderMode = "local" | "worker";

export function getVideoRenderMode(): VideoRenderMode {
  const raw = process.env.VIDEO_RENDER_MODE?.trim().toLowerCase();
  return raw === "worker" ? "worker" : "local";
}

export function isVideoRenderWorkerMode(): boolean {
  return getVideoRenderMode() === "worker";
}

export function getVideoWorkerBaseUrl(): string | null {
  const url = process.env.VIDEO_WORKER_BASE_URL?.trim();
  if (!url) {
    return null;
  }
  return url.replace(/\/+$/, "");
}

export function getVideoWorkerSecret(): string | null {
  const secret = process.env.VIDEO_WORKER_SECRET?.trim();
  return secret || null;
}

export function isVideoWorkerConfigured(): boolean {
  return Boolean(getVideoWorkerBaseUrl() && getVideoWorkerSecret());
}
