/**
 * Canonical PX.4A duration calculator.
 *
 * Fixed mode: total duration is selected independently; hold per photo is derived:
 *   hold = (contentSeconds + (n − 1) × overlap) / n
 *   contentSeconds = durationSeconds − endCard
 *   total = n × hold − (n − 1) × overlap + endCard
 *
 * Auto mode: legacy pace×photo recommendation is resolved once, then uses the same
 * distribution path as fixed mode.
 *
 * Transition overlap is subtracted because adjacent clips share the fade.
 */

import {
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MIN_HOLD_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACE_HOLD_SECONDS,
  PHOTO_VIDEO_MAX_SECONDS,
  type PhotoVideoContext,
  type PhotoVideoDurationMode,
  type PhotoVideoPace,
  photoVideoMaxSeconds,
} from "@/lib/photo-video/constants";

export type PhotoVideoDurationInput = {
  photoCount: number;
  /** Selected total duration including end card. */
  durationSeconds: number;
  durationMode: PhotoVideoDurationMode;
  holdSeconds: number;
  overlapSeconds: number;
  endCardSeconds?: number;
  maxSeconds?: number;
};

export type PhotoVideoDurationResult = {
  photoCount: number;
  durationSeconds: number;
  durationMode: PhotoVideoDurationMode;
  /** Per-photo hold after distributing the target timeline. */
  holdSeconds: number;
  overlapSeconds: number;
  endCardSeconds: number;
  totalSeconds: number;
  averageSecondsPerPhoto: number;
  remainingSeconds: number;
  exceedsMax: boolean;
  withinPhotoLimits: boolean;
  holdTooShort: boolean;
};

export function clampOverlap(holdSeconds: number, overlapSeconds: number): number {
  if (!Number.isFinite(holdSeconds) || holdSeconds <= 0) return 0;
  if (!Number.isFinite(overlapSeconds) || overlapSeconds < 0) return 0;
  return Math.min(overlapSeconds, holdSeconds * 0.85);
}

export function holdSecondsForPace(pace: PhotoVideoPace): number {
  return PHOTO_VIDEO_PACE_HOLD_SECONDS[pace];
}

/** Legacy photo-count-derived total (auto recommendation only). */
export function legacyDurationFromPhotoCount(input: {
  photoCount: number;
  holdSeconds: number;
  overlapSeconds: number;
  endCardSeconds?: number;
}): number {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  const holdSeconds = Math.max(0, input.holdSeconds);
  const endCardSeconds = Math.max(0, input.endCardSeconds ?? 0);
  const overlapSeconds = clampOverlap(holdSeconds, input.overlapSeconds);
  const transitionCount = Math.max(0, photoCount - 1);
  if (photoCount <= 0) return endCardSeconds;
  return photoCount * holdSeconds - transitionCount * overlapSeconds + endCardSeconds;
}

export function resolveAutoDurationSeconds(input: {
  photoCount: number;
  pace: PhotoVideoPace;
  overlapSeconds: number;
  endCardSeconds?: number;
  maxSeconds: number;
}): number {
  const raw = legacyDurationFromPhotoCount({
    photoCount: input.photoCount,
    holdSeconds: holdSecondsForPace(input.pace),
    overlapSeconds: input.overlapSeconds,
    endCardSeconds: input.endCardSeconds,
  });
  return Math.min(Math.max(1, raw), input.maxSeconds);
}

function distributeHoldPerPhoto(input: {
  photoCount: number;
  durationSeconds: number;
  overlapSeconds: number;
  endCardSeconds: number;
}): number {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  if (photoCount <= 0) return 0;
  const contentSeconds = Math.max(0, input.durationSeconds - input.endCardSeconds);
  const overlap = clampOverlap(contentSeconds / photoCount, input.overlapSeconds);
  if (photoCount === 1) return contentSeconds;
  return (contentSeconds + (photoCount - 1) * overlap) / photoCount;
}

export function calculatePhotoVideoDuration(input: PhotoVideoDurationInput): PhotoVideoDurationResult {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  const endCardSeconds = Math.max(0, input.endCardSeconds ?? 0);
  const maxSeconds = input.maxSeconds ?? PHOTO_VIDEO_MAX_SECONDS;
  let durationSeconds = Math.max(endCardSeconds, input.durationSeconds);

  if (input.durationMode === "auto" && photoCount > 0) {
    durationSeconds = resolveAutoDurationSeconds({
      photoCount,
      pace: paceFromLegacyHold(input.holdSeconds),
      overlapSeconds: input.overlapSeconds,
      endCardSeconds,
      maxSeconds,
    });
  }

  durationSeconds = Math.min(durationSeconds, maxSeconds);
  const overlapSeconds = clampOverlap(
    photoCount > 0 ? durationSeconds / photoCount : 0,
    input.overlapSeconds
  );
  const holdSeconds =
    photoCount <= 0
      ? 0
      : distributeHoldPerPhoto({ photoCount, durationSeconds, overlapSeconds, endCardSeconds });

  const transitionCount = Math.max(0, photoCount - 1);
  const rawTotalSeconds =
    photoCount <= 0
      ? endCardSeconds
      : photoCount * holdSeconds - transitionCount * overlapSeconds + endCardSeconds;
  const totalSeconds =
    input.durationMode === "fixed" && photoCount > 0 ? durationSeconds : rawTotalSeconds;

  const averageSecondsPerPhoto = photoCount > 0 ? Math.max(0, totalSeconds - endCardSeconds) / photoCount : 0;

  return {
    photoCount,
    durationSeconds,
    durationMode: input.durationMode,
    holdSeconds,
    overlapSeconds,
    endCardSeconds,
    totalSeconds,
    averageSecondsPerPhoto,
    remainingSeconds: maxSeconds - totalSeconds,
    exceedsMax: totalSeconds > maxSeconds + 1e-9,
    withinPhotoLimits: photoCount >= PHOTO_VIDEO_MIN_PHOTOS && photoCount <= PHOTO_VIDEO_MAX_PHOTOS,
    holdTooShort: photoCount > 0 && holdSeconds < PHOTO_VIDEO_MIN_HOLD_SECONDS,
  };
}

function paceFromLegacyHold(holdSeconds: number): PhotoVideoPace {
  const entries = Object.entries(PHOTO_VIDEO_PACE_HOLD_SECONDS) as [PhotoVideoPace, number][];
  let best: PhotoVideoPace = "normaal";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const [pace, hold] of entries) {
    const delta = Math.abs(hold - holdSeconds);
    if (delta < bestDelta) {
      best = pace;
      bestDelta = delta;
    }
  }
  return best;
}

export function wouldExceedMaxDuration(input: PhotoVideoDurationInput): boolean {
  return calculatePhotoVideoDuration(input).exceedsMax;
}

export function formatPhotoVideoDuration(totalSeconds: number, locale: "nl" | "en" = "nl"): string {
  const rounded = Math.round(totalSeconds);
  return locale === "nl" ? `${rounded} sec` : `${rounded} sec`;
}

export function formatAveragePerPhoto(seconds: number, locale: "nl" | "en" = "nl"): string {
  const rounded = Math.round(seconds * 10) / 10;
  const text = locale === "nl" ? rounded.toFixed(1).replace(".", ",") : rounded.toFixed(1);
  return locale === "nl" ? `ongeveer ${text} sec per foto` : `about ${text} sec per photo`;
}

export function durationInputForContext(
  input: Omit<PhotoVideoDurationInput, "maxSeconds">,
  context: PhotoVideoContext = "studio"
): PhotoVideoDurationInput {
  return { ...input, maxSeconds: photoVideoMaxSeconds(context) };
}
