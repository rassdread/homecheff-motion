/**
 * Canonical PX.4A duration calculator.
 *
 * total = n × hold − (n − 1) × overlap + endCard
 *
 * Transition overlap is subtracted because adjacent clips share the fade.
 * Do not add overlap on top of hold.
 */

import {
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MAX_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACE_HOLD_SECONDS,
  type PhotoVideoPace,
} from "@/lib/photo-video/constants";

export type PhotoVideoDurationInput = {
  photoCount: number;
  holdSeconds: number;
  overlapSeconds: number;
  endCardSeconds?: number;
};

export type PhotoVideoDurationResult = {
  photoCount: number;
  holdSeconds: number;
  overlapSeconds: number;
  endCardSeconds: number;
  totalSeconds: number;
  remainingSeconds: number;
  exceedsMax: boolean;
  withinPhotoLimits: boolean;
};

export function clampOverlap(holdSeconds: number, overlapSeconds: number): number {
  if (!Number.isFinite(holdSeconds) || holdSeconds <= 0) return 0;
  if (!Number.isFinite(overlapSeconds) || overlapSeconds < 0) return 0;
  return Math.min(overlapSeconds, holdSeconds * 0.85);
}

export function calculatePhotoVideoDuration(input: PhotoVideoDurationInput): PhotoVideoDurationResult {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  const holdSeconds = Math.max(0, input.holdSeconds);
  const endCardSeconds = Math.max(0, input.endCardSeconds ?? 0);
  const overlapSeconds = clampOverlap(holdSeconds, input.overlapSeconds);
  const transitionCount = Math.max(0, photoCount - 1);
  const totalSeconds =
    photoCount <= 0 ? endCardSeconds : photoCount * holdSeconds - transitionCount * overlapSeconds + endCardSeconds;
  const remainingSeconds = PHOTO_VIDEO_MAX_SECONDS - totalSeconds;
  return {
    photoCount,
    holdSeconds,
    overlapSeconds,
    endCardSeconds,
    totalSeconds,
    remainingSeconds,
    exceedsMax: totalSeconds > PHOTO_VIDEO_MAX_SECONDS + 1e-9,
    withinPhotoLimits: photoCount >= PHOTO_VIDEO_MIN_PHOTOS && photoCount <= PHOTO_VIDEO_MAX_PHOTOS,
  };
}

export function holdSecondsForPace(pace: PhotoVideoPace): number {
  return PHOTO_VIDEO_PACE_HOLD_SECONDS[pace];
}

export function wouldExceedMaxDuration(input: PhotoVideoDurationInput): boolean {
  return calculatePhotoVideoDuration(input).exceedsMax;
}

export function maxPhotosFitting(input: Omit<PhotoVideoDurationInput, "photoCount">): number {
  let n = PHOTO_VIDEO_MAX_PHOTOS;
  while (n >= PHOTO_VIDEO_MIN_PHOTOS) {
    if (!calculatePhotoVideoDuration({ ...input, photoCount: n }).exceedsMax) {
      return n;
    }
    n -= 1;
  }
  return 0;
}

export function formatPhotoVideoDuration(totalSeconds: number, locale: "nl" | "en" = "nl"): string {
  const rounded = Math.round(totalSeconds * 10) / 10;
  const text = locale === "nl" ? rounded.toFixed(1).replace(".", ",") : rounded.toFixed(1);
  return locale === "nl" ? `${text} sec` : `${text} sec`;
}
