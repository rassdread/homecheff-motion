/**
 * PX.4A.5 — HomeCheff listing video attach contract.
 * Local export yields a File; binary never travels in query/SSO/HMAC/cookies.
 * HMAC carries only an HTTPS blob URL after authenticated upload.
 */

import type { PhotoVideoContext } from "@/lib/photo-video/constants";
import { HOMECHEFF_VIDEO_MAX_BYTES } from "@/lib/photo-video/encode-capability";
import { photoVideoMaxSeconds } from "@/lib/photo-video/constants";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { compositionDuration } from "@/lib/photo-video/composition";

export const PHOTO_VIDEO_EXPORT_MAX_BYTES = HOMECHEFF_VIDEO_MAX_BYTES;
export const PHOTO_VIDEO_EXPORT_ACCEPT = ["video/mp4", "video/quicktime", "video/x-m4v"] as const;
/** Temporary Studio Blob lifetime for the HMAC handoff URL. Not the listing copy. */
export const PHOTO_VIDEO_EXPORT_BLOB_TTL_SEC = 20 * 60;

export type PhotoVideoExportStatus = "ready" | "failed";

export type PhotoVideoExportRequest = {
  composition: PhotoVideoComposition;
  durationSeconds: number;
  target: {
    maxSeconds: number;
    maxBytes: typeof PHOTO_VIDEO_EXPORT_MAX_BYTES;
    mime: "video/mp4";
    codec: "avc1";
    watermark: "homecheff-studio-lockup";
  };
};

export type ListingVideoRef = {
  url: string;
  thumbnail?: string | null;
  duration?: number | null;
};

export function photoVideoExportRequestFrom(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "homecheff-item"
): PhotoVideoExportRequest {
  const duration = compositionDuration(composition, context);
  return {
    composition,
    durationSeconds: duration.totalSeconds,
    target: {
      maxSeconds: photoVideoMaxSeconds(context),
      maxBytes: PHOTO_VIDEO_EXPORT_MAX_BYTES,
      mime: "video/mp4",
      codec: "avc1",
      watermark: "homecheff-studio-lockup",
    },
  };
}

export function canAttemptPhotoVideoExport(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "homecheff-item"
): boolean {
  const duration = compositionDuration(composition, context);
  return !duration.exceedsMax && duration.totalSeconds > 0;
}

/**
 * Transactional one-video replace: old video stays until the generated file
 * is validated and the HomeCheff handoff succeeds.
 */
export function nextListingVideoAfterExport(input: {
  existing: ListingVideoRef | null;
  cancelled: boolean;
  exportOk: boolean;
  generated: ListingVideoRef | null;
}): ListingVideoRef | null {
  if (input.cancelled || !input.exportOk || !input.generated?.url) return input.existing;
  return input.generated;
}

export function exportBusyGuard(busy: boolean): "ok" | "busy" {
  return busy ? "busy" : "ok";
}
