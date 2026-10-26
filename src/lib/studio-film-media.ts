/**
 * Film-project video files reuse the photo-video limits and the existing
 * production blob prefix written by the orchestrator upload route.
 */

import { classifyLocalVideoFile } from "@/lib/photo-video/media-clip";
import { PHOTO_VIDEO_MAX_VIDEO_SOURCE_SECONDS } from "@/lib/photo-video/constants";

export { classifyLocalVideoFile as classifyFilmVideoFile, PHOTO_VIDEO_MAX_VIDEO_SOURCE_SECONDS };

export function isOwnedProductionBlobUrl(ownerId: string, value: string): boolean {
  if (!ownerId.trim()) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  const blobHost = host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
  if (!blobHost) return false;
  const marker = `/production/${ownerId}/`;
  return url.pathname.includes(marker);
}

export function filmVideoDurationAllowed(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0 && seconds <= PHOTO_VIDEO_MAX_VIDEO_SOURCE_SECONDS;
}
