/**
 * PX.4A.7 — generic visual clip helpers.
 * Image and video slots still live in `photos[]` for draft/reorder compatibility.
 * `PhotoVideoClip` in timeline.ts remains a timeline interval, not a source file.
 */

import {
  PHOTO_VIDEO_DEFAULT_VIDEO_CLIP_SECONDS,
  PHOTO_VIDEO_MAX_LOCAL_VIDEO_BYTES,
  PHOTO_VIDEO_MAX_VIDEO_SOURCE_SECONDS,
  PHOTO_VIDEO_MIN_VIDEO_CLIP_SECONDS,
  PHOTO_VIDEO_VIDEO_MIME_ALLOWLIST,
} from "@/lib/photo-video/constants";

export const PHOTO_VIDEO_MEDIA_KINDS = ["image", "video"] as const;
export type PhotoVideoMediaKind = (typeof PHOTO_VIDEO_MEDIA_KINDS)[number];

export const PHOTO_VIDEO_VIDEO_FITS = ["cover", "contain"] as const;
export type PhotoVideoVideoFit = (typeof PHOTO_VIDEO_VIDEO_FITS)[number];

export type PhotoVideoClipVideo = {
  /** Local object URL for the source file. Never serialized into draft JSON. */
  objectUrl: string;
  sourceDurationSeconds: number;
  trimStartSeconds: number;
  trimEndSeconds: number;
  audioEnabled: boolean;
  volume: number;
  fit: PhotoVideoVideoFit;
};

export type PhotoVideoMediaFields = {
  mediaKind?: PhotoVideoMediaKind;
  video?: PhotoVideoClipVideo;
};

export function isVideoPhoto(photo: PhotoVideoMediaFields | null | undefined): boolean {
  return photo?.mediaKind === "video" && Boolean(photo.video);
}

export function videoClipDuration(photo: PhotoVideoMediaFields | null | undefined): number {
  if (!isVideoPhoto(photo) || !photo?.video) return 0;
  return Math.max(0, photo.video.trimEndSeconds - photo.video.trimStartSeconds);
}

export function includedImageCount(photos: Array<{ included: boolean } & PhotoVideoMediaFields>): number {
  return photos.filter((photo) => photo.included && !isVideoPhoto(photo)).length;
}

export function includedVideoSeconds(photos: Array<{ included: boolean } & PhotoVideoMediaFields>): number {
  return photos.reduce((sum, photo) => {
    if (!photo.included || !isVideoPhoto(photo)) return sum;
    return sum + videoClipDuration(photo);
  }, 0);
}

export function classifyLocalVideoFile(file: File): "ok" | "type" | "size" {
  if (file.size > PHOTO_VIDEO_MAX_LOCAL_VIDEO_BYTES) return "size";
  const type = (file.type || "").trim().toLowerCase();
  if (PHOTO_VIDEO_VIDEO_MIME_ALLOWLIST.some((allowed) => type === allowed || type.startsWith(`${allowed};`))) {
    return "ok";
  }
  if (/\.(mp4|mov|m4v|webm)$/i.test(file.name)) return "ok";
  return "type";
}

export function clampVideoState(input: {
  sourceDurationSeconds: number;
  trimStartSeconds: number;
  trimEndSeconds: number;
  audioEnabled?: boolean;
  volume?: number;
  fit?: PhotoVideoVideoFit;
  objectUrl?: string;
}): PhotoVideoClipVideo {
  const source = Math.max(0, input.sourceDurationSeconds);
  const minClip = Math.min(PHOTO_VIDEO_MIN_VIDEO_CLIP_SECONDS, source || PHOTO_VIDEO_MIN_VIDEO_CLIP_SECONDS);
  let start = Number.isFinite(input.trimStartSeconds) ? input.trimStartSeconds : 0;
  let end = Number.isFinite(input.trimEndSeconds) ? input.trimEndSeconds : start + minClip;
  start = Math.max(0, Math.min(start, Math.max(0, source - minClip)));
  end = Math.max(start + minClip, Math.min(end, source || start + minClip));
  if (end - start < minClip && source >= minClip) {
    end = Math.min(source, start + minClip);
    start = Math.max(0, end - minClip);
  }
  const volume = Math.max(0, Math.min(1, Number.isFinite(input.volume) ? (input.volume as number) : 1));
  const fit = input.fit === "contain" ? "contain" : "cover";
  return {
    objectUrl: input.objectUrl ?? "",
    sourceDurationSeconds: source,
    trimStartSeconds: start,
    trimEndSeconds: end,
    audioEnabled: input.audioEnabled !== false,
    volume,
    fit,
  };
}

export function defaultVideoTrimEnd(sourceDurationSeconds: number): number {
  const source = Math.max(0, sourceDurationSeconds);
  if (source <= 0) return 0;
  return Math.min(source, PHOTO_VIDEO_DEFAULT_VIDEO_CLIP_SECONDS);
}

export function videoSourceTime(photo: PhotoVideoMediaFields, progress: number): number {
  if (!isVideoPhoto(photo) || !photo.video) return 0;
  const span = videoClipDuration(photo);
  const t = Math.max(0, Math.min(1, progress));
  const last = Math.max(photo.video.trimStartSeconds, photo.video.trimEndSeconds - 1 / 60);
  return Math.min(last, photo.video.trimStartSeconds + t * span);
}

export function sourceExceedsMax(sourceDurationSeconds: number): boolean {
  return sourceDurationSeconds > PHOTO_VIDEO_MAX_VIDEO_SOURCE_SECONDS + 1e-6;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const whole = Math.floor(safe + 1e-6);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatClipSeconds(seconds: number, locale: "nl" | "en" = "nl"): string {
  const rounded = Math.round(Math.max(0, seconds) * 10) / 10;
  const text = locale === "nl" ? rounded.toFixed(1).replace(".", ",") : rounded.toFixed(1);
  return `${text} sec`;
}

export function formatSecondsWhole(seconds: number): string {
  return String(Math.round(Math.max(0, seconds)));
}
