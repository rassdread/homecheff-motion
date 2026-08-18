/**
 * PX.4A.4 / PX.4A.5 seam — HomeCheff listing video attach contract.
 * 4A.4 defines the types. 4A.5 owns certified MP4 production.
 *
 * HomeCheff VideoUploader already accepts { url, thumbnail, duration }.
 * Once 4A.5 yields a File, reuse the existing upload pipeline unchanged.
 */

import type { PhotoVideoContext } from "@/lib/photo-video/constants";
import { photoVideoMaxSeconds } from "@/lib/photo-video/constants";
import type { PhotoVideoComposition } from "@/lib/photo-video/composition";
import { compositionDuration } from "@/lib/photo-video/composition";

export const PHOTO_VIDEO_EXPORT_MAX_BYTES = 50 * 1024 * 1024;
export const PHOTO_VIDEO_EXPORT_ACCEPT = ["video/mp4", "video/quicktime", "video/x-m4v"] as const;

export type PhotoVideoExportStatus = "not_certified" | "ready" | "failed";

export type PhotoVideoExportRequest = {
  composition: PhotoVideoComposition;
  /** Canonical total duration for the future encoder. */
  durationSeconds: number;
  target: {
    maxSeconds: number;
    maxBytes: typeof PHOTO_VIDEO_EXPORT_MAX_BYTES;
    mime: "video/mp4";
    codec: "avc1";
    watermark: "homecheff-studio-lockup";
  };
};

export type PhotoVideoExportResult =
  | {
      ok: true;
      status: "ready";
      mimeType: "video/mp4";
      durationSeconds: number;
      byteLength: number;
      /** Present only after PX.4A.5 certification. */
      file?: File;
    }
  | {
      ok: false;
      status: "not_certified" | "failed";
      reason: "safari_mux_uncertified" | "duration" | "encode" | "unsupported";
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

/** 4A.4: never claim a Production-ready File. 4A.5 replaces this. */
export function featureGatedPhotoVideoExport(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "homecheff-item"
): PhotoVideoExportResult {
  if (!canAttemptPhotoVideoExport(composition, context)) {
    return { ok: false, status: "failed", reason: "duration" };
  }
  return { ok: false, status: "not_certified", reason: "safari_mux_uncertified" };
}
