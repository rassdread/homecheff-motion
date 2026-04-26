import {
  BLOB_IMAGE_THUMB_MAX_BYTES,
  BLOB_IMAGE_WORKING_MAX_BYTES_USER,
  getMaxWorkingImageBytesForUploadRole,
} from "@/lib/media-export-constants";

/** Max original file size before client rejects (browser preprocess runs first). */
export const MAX_RAW_ANIMATION_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Legacy default: strictest working-image cap (normal users).
 * Prefer `getMaxWorkingImageBytesForUploadRole(role)` for role-aware limits.
 */
export const MAX_OPTIMIZED_IMAGE_BYTES = BLOB_IMAGE_WORKING_MAX_BYTES_USER;

export { BLOB_IMAGE_THUMB_MAX_BYTES, getMaxWorkingImageBytesForUploadRole };
