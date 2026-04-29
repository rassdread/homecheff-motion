/**
 * Tunable targets for Blob storage + final video export.
 * Adjust here to trade quality vs cost.
 */

// --- Client image preprocess + upload API (working vs thumbnail) ---

/** Default working image cap for normal users (after client-side/server-side compress). */
export const BLOB_IMAGE_WORKING_MAX_BYTES_USER = 4 * 1024 * 1024;

/** Higher cap for admin / power (optional). */
export const BLOB_IMAGE_WORKING_MAX_BYTES_POWER = 4 * 1024 * 1024;

/** Longest side (px) for the working image before byte-budget pass. */
export const BLOB_IMAGE_WORKING_MAX_LONGEST_SIDE_START = 1280;

/** Thumbnail byte budget (100–200KB range; upper bound). */
export const BLOB_IMAGE_THUMB_MAX_BYTES = 200 * 1024;

/** Thumbnail max width / longest side (UI list previews). */
export const BLOB_IMAGE_THUMB_MAX_LONGEST_SIDE = 400;

export function getMaxWorkingImageBytesForUploadRole(role: string): number {
  const r = role.trim().toLowerCase();
  return r === "admin" || r === "power"
    ? BLOB_IMAGE_WORKING_MAX_BYTES_POWER
    : BLOB_IMAGE_WORKING_MAX_BYTES_USER;
}

// --- Final merged MP4 (local FFmpeg export + merge worker) — do not use for Vidu segment generation ---

export const FINAL_MERGE_VIDEO_CRF = 25;

/** `veryfast` | `fast` — faster presets = slightly larger files at same CRF. */
export const FINAL_MERGE_VIDEO_PRESET = "veryfast";

export const FINAL_MERGE_DISABLE_AUDIO = true;

/** Max frame width before scaling down (preserves aspect; does not upscale). */
export function getFinalMergeMaxWidthFromViduResolution(
  viduResolution: string | null | undefined
): number {
  const s = (viduResolution ?? "").toLowerCase();
  if (s.includes("1080")) {
    return 1920;
  }
  if (s.includes("540")) {
    return 960;
  }
  if (s.includes("720")) {
    return 1280;
  }
  return 1280;
}

/**
 * TODO: Admin / cron — purge aged generated Blob assets (e.g. old `motion/*` working files,
 * stale `animations/merge/*`) under a retention policy. Keep finals + thumbnails until policy says otherwise.
 */
export const TODO_ADMIN_CLEANUP_OLD_GENERATED_ASSETS =
  "Implement admin or scheduled job to list/delete old Blob pathnames per retention; never delete without explicit policy + audit log.";
