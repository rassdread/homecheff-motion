/** PX.4A.1 photo-video composer constants. Single source for limits. */

import { HOMECHEFF_BRAND_ICON_SOURCE } from "@/lib/homecheff-brand-icon";
import { HOMECHEFF_VIDEO_MAX_SECONDS } from "@/lib/photo-video/encode-capability";

export const PHOTO_VIDEO_MIN_PHOTOS = 2;
export const PHOTO_VIDEO_MAX_PHOTOS = 12;
export const PHOTO_VIDEO_MAX_SECONDS = HOMECHEFF_VIDEO_MAX_SECONDS;
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

export const PHOTO_VIDEO_DEFAULT_PACE: PhotoVideoPace = "normaal";
export const PHOTO_VIDEO_DEFAULT_STYLE: PhotoVideoStyle = "auto";
export const PHOTO_VIDEO_DEFAULT_RATIO: PhotoVideoRatio = "9:16";
/** HomeCheff listing surfaces are landscape-first (feed/detail aspect-video). */
export const PHOTO_VIDEO_ITEM_DEFAULT_RATIO: PhotoVideoRatio = "16:9";
export const PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS = 0;

export const PHOTO_VIDEO_PACE_HOLD_SECONDS: Record<PhotoVideoPace, number> = {
  kort: 1.5,
  normaal: 2,
  rustig: 2.5,
};
