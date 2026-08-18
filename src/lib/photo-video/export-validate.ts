import type { PhotoVideoContext } from "@/lib/photo-video/constants";
import { photoVideoMaxSeconds } from "@/lib/photo-video/constants";
import { compositionDuration, includedPhotos, type PhotoVideoComposition } from "@/lib/photo-video/composition";
import {
  PHOTO_VIDEO_EXPORT_ACCEPT,
  PHOTO_VIDEO_EXPORT_MAX_BYTES,
  canAttemptPhotoVideoExport,
} from "@/lib/photo-video/export-handoff";
import { PHOTO_VIDEO_EXPORT_CONTAINER, PHOTO_VIDEO_EXPORT_FILENAME } from "@/lib/photo-video/export-muxer";
import { PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS } from "@/lib/photo-video/export-settings";

export type PhotoVideoExportFailReason =
  | "duration"
  | "size"
  | "encode"
  | "unsupported"
  | "cancelled"
  | "handoff"
  | "empty"
  | "busy";

export type PhotoVideoExportValidation =
  | { ok: true; durationSeconds: number; photoCount: number }
  | { ok: false; reason: PhotoVideoExportFailReason };

export function isSafeExportFilename(name: string): boolean {
  return name === PHOTO_VIDEO_EXPORT_FILENAME;
}

export function isExpectedExportMime(mimeType: string | null | undefined): boolean {
  const mime = (mimeType ?? "").trim().toLowerCase();
  if (!mime) return false;
  return PHOTO_VIDEO_EXPORT_ACCEPT.some((allowed) => mime === allowed || mime.startsWith(`${allowed};`));
}

export function looksLikeMp4Bytes(bytes: ArrayBuffer | Uint8Array): boolean {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < 12) return false;
  const box = String.fromCharCode(view[4]!, view[5]!, view[6]!, view[7]!);
  return box === "ftyp";
}

export function validatePhotoVideoExportComposition(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext
): PhotoVideoExportValidation {
  if (!canAttemptPhotoVideoExport(composition, context)) {
    return { ok: false, reason: "duration" };
  }
  const duration = compositionDuration(composition, context);
  const photoCount = includedPhotos(composition).length;
  if (duration.totalSeconds > photoVideoMaxSeconds(context)) {
    return { ok: false, reason: "duration" };
  }
  if (context === "homecheff-item" && duration.totalSeconds > 30) {
    return { ok: false, reason: "duration" };
  }
  return { ok: true, durationSeconds: duration.totalSeconds, photoCount };
}

export function validatePhotoVideoExportFile(input: {
  file: File | Blob | null | undefined;
  durationSeconds: number;
  context: PhotoVideoContext;
  filename?: string;
}): PhotoVideoExportValidation {
  const file = input.file;
  if (!file || file.size <= 0) return { ok: false, reason: "empty" };
  if (file.size > PHOTO_VIDEO_EXPORT_MAX_BYTES) return { ok: false, reason: "size" };
  if ("type" in file && file.type && !isExpectedExportMime(file.type)) return { ok: false, reason: "encode" };
  if (input.durationSeconds <= 0) return { ok: false, reason: "duration" };
  if (input.durationSeconds > photoVideoMaxSeconds(input.context) + 0.35) return { ok: false, reason: "duration" };
  if (input.context === "homecheff-item" && input.durationSeconds > 30 + 0.35) {
    return { ok: false, reason: "duration" };
  }
  if (input.filename && !isSafeExportFilename(input.filename)) return { ok: false, reason: "encode" };
  return { ok: true, durationSeconds: input.durationSeconds, photoCount: 0 };
}

export function studioExportIsCertifiedDuration(durationSeconds: number): boolean {
  return durationSeconds <= PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS + 0.01;
}

export function toPhotoVideoExportFile(blob: Blob, filename = PHOTO_VIDEO_EXPORT_FILENAME): File {
  const type = blob.type || PHOTO_VIDEO_EXPORT_CONTAINER;
  return new File([blob], filename, { type, lastModified: Date.now() });
}
