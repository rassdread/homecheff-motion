/** PX.4A.1 photo-video composer constants. Single source for limits. */

import { HOMECHEFF_BRAND_ICON_SOURCE } from "@/lib/homecheff-brand-icon";
import { HOMECHEFF_VIDEO_MAX_SECONDS } from "@/lib/photo-video/encode-capability";

export const PHOTO_VIDEO_MIN_PHOTOS = 2;
export const PHOTO_VIDEO_MAX_PHOTOS = 12;
/** HomeCheff listing / contextual item journey hard max (unchanged contract). */
export const PHOTO_VIDEO_MAX_SECONDS = HOMECHEFF_VIDEO_MAX_SECONDS;
/** Standalone free Studio creator product max (encode not certified until PX.4A.5). */
export const PHOTO_VIDEO_STUDIO_MAX_SECONDS = 60;
export const PHOTO_VIDEO_PREVIEW_MAX_EDGE = 720;
export const PHOTO_VIDEO_PREVIEW_FPS = 30;
export const PHOTO_VIDEO_WATERMARK_SRC = HOMECHEFF_BRAND_ICON_SOURCE;
export const PHOTO_VIDEO_MAX_LOCAL_IMAGE_BYTES = 12 * 1024 * 1024;

export const PHOTO_VIDEO_PACES = ["kort", "normaal", "rustig"] as const;
export type PhotoVideoPace = (typeof PHOTO_VIDEO_PACES)[number];

export const PHOTO_VIDEO_STYLES = ["auto", "smooth", "calm", "energetic"] as const;
export type PhotoVideoStyle = (typeof PHOTO_VIDEO_STYLES)[number];

export const PHOTO_VIDEO_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type PhotoVideoRatio = (typeof PHOTO_VIDEO_RATIOS)[number];

export const PHOTO_VIDEO_PHOTO_SOURCES = ["HOME_CHEFF_LISTING", "LOCAL_UPLOAD"] as const;
export type PhotoVideoPhotoSource = (typeof PHOTO_VIDEO_PHOTO_SOURCES)[number];

export const PHOTO_VIDEO_DURATION_MODES = ["auto", "fixed"] as const;
export type PhotoVideoDurationMode = (typeof PHOTO_VIDEO_DURATION_MODES)[number];

export const PHOTO_VIDEO_MOVEMENT_MODES = ["auto", "none"] as const;
export type PhotoVideoMovementMode = (typeof PHOTO_VIDEO_MOVEMENT_MODES)[number];

export type PhotoVideoContext = "studio" | "homecheff-item";

/** HomeCheff item wizard contextual duration presets (seconds). */
export const PHOTO_VIDEO_ITEM_DURATION_PRESETS = [10, 15, 20, 30] as const;
/** Standalone free Studio duration presets (seconds). */
export const PHOTO_VIDEO_STUDIO_DURATION_PRESETS = [10, 15, 30, 45, 60] as const;

export const PHOTO_VIDEO_DEFAULT_PACE: PhotoVideoPace = "normaal";
export const PHOTO_VIDEO_DEFAULT_STYLE: PhotoVideoStyle = "auto";
export const PHOTO_VIDEO_DEFAULT_RATIO: PhotoVideoRatio = "9:16";
/** HomeCheff listing surfaces are landscape-first (feed/detail aspect-video). */
export const PHOTO_VIDEO_ITEM_DEFAULT_RATIO: PhotoVideoRatio = "16:9";
export const PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS = 0;
export const PHOTO_VIDEO_DEFAULT_DURATION_MODE: PhotoVideoDurationMode = "fixed";
export const PHOTO_VIDEO_DEFAULT_DURATION_SECONDS = 15;
export const PHOTO_VIDEO_DEFAULT_MOVEMENT_MODE: PhotoVideoMovementMode = "auto";

export const PHOTO_VIDEO_PACE_HOLD_SECONDS: Record<PhotoVideoPace, number> = {
  kort: 1.5,
  normaal: 2,
  rustig: 2.5,
};

/** Minimum per-photo visible hold when distributing a fixed target duration. */
export const PHOTO_VIDEO_MIN_HOLD_SECONDS = 0.45;

export function photoVideoMaxSeconds(context: PhotoVideoContext = "studio"): number {
  return context === "homecheff-item" ? PHOTO_VIDEO_MAX_SECONDS : PHOTO_VIDEO_STUDIO_MAX_SECONDS;
}

export function photoVideoDurationPresets(context: PhotoVideoContext): readonly number[] {
  return context === "homecheff-item"
    ? PHOTO_VIDEO_ITEM_DURATION_PRESETS
    : PHOTO_VIDEO_STUDIO_DURATION_PRESETS;
}

export function defaultPhotoVideoDurationSeconds(context: PhotoVideoContext): number {
  void context;
  return PHOTO_VIDEO_DEFAULT_DURATION_SECONDS;
}
