/**
 * PX.4A.1 — client encode feasibility (no export UI yet).
 *
 * Distinguishes MediaRecorder.isTypeSupported (API claim) from a real
 * canvas capture Blob type. HomeCheff listing/dish upload requires MP4.
 */

export const HOMECHEFF_VIDEO_MAX_SECONDS = 30;
export const HOMECHEFF_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Listing forms use uploadContext="dish" — MP4/MOV/M4V only. */
export const HOMECHEFF_LISTING_VIDEO_MIME_PREFIXES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
] as const;

export const PHOTO_VIDEO_RECORDER_MIME_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export const PHOTO_VIDEO_WECODECS_AVC_CONFIG = {
  codec: "avc1.42001f",
  width: 640,
  height: 360,
  bitrate: 1_000_000,
  framerate: 30,
} as const;

export type RecorderMimeClaim = {
  mimeType: string;
  claimed: boolean;
};

export type EncodePathId =
  | "mediarecorder-mp4"
  | "webcodecs-avc-mp4"
  | "mediarecorder-webm-not-homecheff"
  | "unsupported";

export type ClientEncodePlan = {
  path: EncodePathId;
  recorderMime: string | null;
  homecheffListingCompatible: boolean;
  notes: string;
};

export function isHomecheffListingVideoMime(mimeType: string | null | undefined): boolean {
  const mime = (mimeType ?? "").trim().toLowerCase();
  if (!mime) return false;
  return HOMECHEFF_LISTING_VIDEO_MIME_PREFIXES.some(
    (prefix) => mime === prefix || mime.startsWith(`${prefix};`)
  );
}

export function claimedRecorderMimes(
  isTypeSupported: ((type: string) => boolean) | null | undefined
): RecorderMimeClaim[] {
  if (!isTypeSupported) {
    return PHOTO_VIDEO_RECORDER_MIME_CANDIDATES.map((mimeType) => ({
      mimeType,
      claimed: false,
    }));
  }
  return PHOTO_VIDEO_RECORDER_MIME_CANDIDATES.map((mimeType) => {
    try {
      return { mimeType, claimed: Boolean(isTypeSupported(mimeType)) };
    } catch {
      return { mimeType, claimed: false };
    }
  });
}

export function firstClaimedMime(claims: readonly RecorderMimeClaim[]): string | null {
  return claims.find((row) => row.claimed)?.mimeType ?? null;
}

export function firstClaimedHomecheffMime(claims: readonly RecorderMimeClaim[]): string | null {
  return claims.find((row) => row.claimed && isHomecheffListingVideoMime(row.mimeType))?.mimeType ?? null;
}

/**
 * Plan 4A.5 export from probe evidence. Does not pull a wasm encoder or a worker.
 */
export function planClientEncode(input: {
  hasMediaRecorder: boolean;
  actualBlobMime: string | null;
  actualBlobSize?: number;
  claimedMp4: boolean;
  webCodecsAvcSupported: boolean | null;
}): ClientEncodePlan {
  const actual = input.actualBlobMime?.trim() || null;
  const size = input.actualBlobSize ?? 0;
  if (actual && isHomecheffListingVideoMime(actual) && size > 0) {
    return {
      path: "mediarecorder-mp4",
      recorderMime: actual,
      homecheffListingCompatible: true,
      notes: "Real MediaRecorder Blob is MP4 — use this path in PX.4A.5.",
    };
  }
  if (input.claimedMp4 && size <= 0) {
    if (input.webCodecsAvcSupported) {
      return {
        path: "webcodecs-avc-mp4",
        recorderMime: actual,
        homecheffListingCompatible: false,
        notes:
          "MediaRecorder reported an MP4 MIME but the Blob was empty. Do not trust isTypeSupported. Smallest client fallback: WebCodecs AVC + local muxer in PX.4A.5.",
      };
    }
    return {
      path: "mediarecorder-mp4",
      recorderMime: actual ?? "video/mp4",
      homecheffListingCompatible: false,
      notes:
        "API claims MP4 but real export produced no bytes. PX.4A.5 must prove a non-empty Blob before HomeCheff attach.",
    };
  }
  if (input.webCodecsAvcSupported) {
    return {
      path: "webcodecs-avc-mp4",
      recorderMime: actual,
      homecheffListingCompatible: false,
      notes:
        "MediaRecorder did not yield a proven MP4 Blob. Smallest client fallback: WebCodecs AVC + local muxer in PX.4A.5 (no worker, no wasm encoder bundle).",
    };
  }
  if (actual && actual.toLowerCase().includes("webm")) {
    return {
      path: "mediarecorder-webm-not-homecheff",
      recorderMime: actual,
      homecheffListingCompatible: false,
      notes:
        "Real Blob is WebM. HomeCheff dish/listing uploader rejects WebM. Do not attach without an approved MP4 path.",
    };
  }
  if (!input.hasMediaRecorder) {
    return {
      path: "unsupported",
      recorderMime: null,
      homecheffListingCompatible: false,
      notes: "No MediaRecorder. PX.4A.5 needs an explicit unsupported-device message — do not add paid render without approval.",
    };
  }
  return {
    path: "unsupported",
    recorderMime: actual,
    homecheffListingCompatible: false,
    notes: "No proven MP4 or WebCodecs AVC path. Stop before assuming HomeCheff-compatible export.",
  };
}
