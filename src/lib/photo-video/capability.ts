/** Architectural capability classes — not shown as product labels in 4A.2. */

export const PHOTO_VIDEO_CAPABILITY = {
  FREE_LOCAL: "FREE_LOCAL",
  PROVIDER_CREDIT: "PROVIDER_CREDIT",
} as const;

export type PhotoVideoCapabilityClass = (typeof PHOTO_VIDEO_CAPABILITY)[keyof typeof PHOTO_VIDEO_CAPABILITY];

/** Local compositor capabilities. Zero credits, zero providers. */
export const PHOTO_VIDEO_FREE_LOCAL_ACTIONS = [
  "photo_composition",
  "transitions",
  "deterministic_motion",
  "text_overlays",
  "own_music",
  "no_music",
  "preview",
  "watermark",
] as const;

/** Must not run on the free photo-video critical path. */
export const PHOTO_VIDEO_PROVIDER_CREDIT_ACTIONS = [
  "generative_image",
  "generative_animation",
  "generative_video",
  "ai_music",
  "paid_provider",
] as const;

export function photoVideoActionClass(
  action: (typeof PHOTO_VIDEO_FREE_LOCAL_ACTIONS)[number] | (typeof PHOTO_VIDEO_PROVIDER_CREDIT_ACTIONS)[number]
): PhotoVideoCapabilityClass {
  if ((PHOTO_VIDEO_PROVIDER_CREDIT_ACTIONS as readonly string[]).includes(action)) {
    return PHOTO_VIDEO_CAPABILITY.PROVIDER_CREDIT;
  }
  return PHOTO_VIDEO_CAPABILITY.FREE_LOCAL;
}
