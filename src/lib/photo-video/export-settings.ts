import type { PhotoVideoContext, PhotoVideoRatio } from "@/lib/photo-video/constants";
import { PHOTO_VIDEO_PREVIEW_FPS, PHOTO_VIDEO_PREVIEW_MAX_EDGE, photoVideoMaxSeconds } from "@/lib/photo-video/constants";
import { canvasSizeForRatio } from "@/lib/photo-video/layout";
import { HOMECHEFF_VIDEO_MAX_BYTES } from "@/lib/photo-video/encode-capability";

export const PHOTO_VIDEO_EXPORT_FPS = PHOTO_VIDEO_PREVIEW_FPS;
export const PHOTO_VIDEO_EXPORT_720_EDGE = PHOTO_VIDEO_PREVIEW_MAX_EDGE;
export const PHOTO_VIDEO_EXPORT_1080_EDGE = 1080;
export const PHOTO_VIDEO_EXPORT_BITRATE_720 = 2_000_000;
export const PHOTO_VIDEO_EXPORT_BITRATE_1080 = 3_500_000;
export const PHOTO_VIDEO_EXPORT_AUDIO_BITRATE = 128_000;
export const PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS = 30;

export type PhotoVideoExportStage = "prepare" | "frames" | "music" | "mux" | "attach";

export type PhotoVideoExportMaxEdge = typeof PHOTO_VIDEO_EXPORT_720_EDGE | typeof PHOTO_VIDEO_EXPORT_1080_EDGE;

export type PhotoVideoExportSettings = {
  width: number;
  height: number;
  maxEdge: PhotoVideoExportMaxEdge;
  fps: number;
  videoBitrate: number;
  audioBitrate: number;
  maxSeconds: number;
  maxBytes: number;
  certified: boolean;
};

export function detectPhotoVideoExportDevice(input?: {
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  userAgent?: string;
}): { hardwareConcurrency: number; deviceMemoryGb: number; isMobile: boolean } {
  const ua = input?.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const nav = typeof navigator === "undefined" ? null : navigator;
  const cores = input?.hardwareConcurrency ?? nav?.hardwareConcurrency ?? 4;
  const mem =
    input?.deviceMemoryGb ??
    (nav && "deviceMemory" in nav ? Number((nav as Navigator & { deviceMemory?: number }).deviceMemory) : 4);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return {
    hardwareConcurrency: Number.isFinite(cores) ? cores : 4,
    deviceMemoryGb: Number.isFinite(mem) && mem > 0 ? mem : 4,
    isMobile,
  };
}

export function photoVideoExportMaxEdge(input: {
  durationSeconds: number;
  photoCount: number;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  isMobile?: boolean;
}): PhotoVideoExportMaxEdge {
  const device = detectPhotoVideoExportDevice({
    hardwareConcurrency: input.hardwareConcurrency,
    deviceMemoryGb: input.deviceMemoryGb,
  });
  const mobile = input.isMobile ?? device.isMobile;
  const cores = input.hardwareConcurrency ?? device.hardwareConcurrency;
  const mem = input.deviceMemoryGb ?? device.deviceMemoryGb;
  if (mobile) return PHOTO_VIDEO_EXPORT_720_EDGE;
  if (input.durationSeconds > PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS) return PHOTO_VIDEO_EXPORT_720_EDGE;
  if (input.photoCount >= 12 && input.durationSeconds >= 20) return PHOTO_VIDEO_EXPORT_720_EDGE;
  if (cores >= 8 && mem >= 8 && input.durationSeconds <= 15) return PHOTO_VIDEO_EXPORT_1080_EDGE;
  return PHOTO_VIDEO_EXPORT_720_EDGE;
}

export function photoVideoExportBitrate(maxEdge: PhotoVideoExportMaxEdge): number {
  return maxEdge >= PHOTO_VIDEO_EXPORT_1080_EDGE ? PHOTO_VIDEO_EXPORT_BITRATE_1080 : PHOTO_VIDEO_EXPORT_BITRATE_720;
}

export function photoVideoExportSettings(input: {
  ratio: PhotoVideoRatio;
  durationSeconds: number;
  photoCount: number;
  context: PhotoVideoContext;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  isMobile?: boolean;
}): PhotoVideoExportSettings {
  const maxEdge = photoVideoExportMaxEdge(input);
  const size = canvasSizeForRatio(input.ratio, maxEdge);
  const maxSeconds = photoVideoMaxSeconds(input.context);
  return {
    width: size.width,
    height: size.height,
    maxEdge,
    fps: PHOTO_VIDEO_EXPORT_FPS,
    videoBitrate: photoVideoExportBitrate(maxEdge),
    audioBitrate: PHOTO_VIDEO_EXPORT_AUDIO_BITRATE,
    maxSeconds,
    maxBytes: HOMECHEFF_VIDEO_MAX_BYTES,
    certified:
      input.context === "homecheff-item" ||
      input.durationSeconds <= PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS,
  };
}

export function estimatedExportBytes(settings: PhotoVideoExportSettings, durationSeconds: number, hasAudio: boolean): number {
  const videoBits = settings.videoBitrate * durationSeconds;
  const audioBits = hasAudio ? settings.audioBitrate * durationSeconds : 0;
  return Math.ceil((videoBits + audioBits) / 8) + 64 * 1024;
}
