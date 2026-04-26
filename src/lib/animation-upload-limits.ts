/** Max original file size before client rejects (browser preprocess runs first). */
export const MAX_RAW_ANIMATION_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Max bytes per optimized working / thumbnail file after preprocess.
 * Must match API upload validation (`/api/uploads/images`).
 */
export const MAX_OPTIMIZED_IMAGE_BYTES = 2 * 1024 * 1024;
