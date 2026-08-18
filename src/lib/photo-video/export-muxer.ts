/**
 * PX.4A.5 local MP4 muxer choice.
 *
 * Package: mediabunny
 * Version: 1.55.1 (see package.json)
 * License: MPL-2.0
 * Why: maintained WebCodecs-native writer, tree-shakable, client-only,
 * AVC + AAC in MP4, no extra wasm encoder. Loaded only when export starts.
 */

export const PHOTO_VIDEO_MUXER_PACKAGE = "mediabunny" as const;
export const PHOTO_VIDEO_MUXER_VERSION = "1.55.1" as const;
export const PHOTO_VIDEO_MUXER_LICENSE = "MPL-2.0" as const;
export const PHOTO_VIDEO_VIDEO_CODEC = "avc" as const;
export const PHOTO_VIDEO_AUDIO_CODEC = "aac" as const;
export const PHOTO_VIDEO_EXPORT_CONTAINER = "video/mp4" as const;
export const PHOTO_VIDEO_EXPORT_FILENAME = "homecheff-video.mp4" as const;
