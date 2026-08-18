import { compositionDuration, type PhotoVideoComposition } from "@/lib/photo-video/composition";
import { buildPhotoVideoClips, playheadAt } from "@/lib/photo-video/timeline";

export function wrapCompositionTime(timeSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return ((timeSeconds % totalSeconds) + totalSeconds) % totalSeconds;
}

export function activePhotoIdAt(
  composition: PhotoVideoComposition,
  timeSeconds: number,
  context: "studio" | "homecheff-item" = "studio"
): string | null {
  const head = playheadAt(composition, timeSeconds, context);
  if (head.to && head.timeSeconds >= head.to.startSeconds) return head.to.photo.id;
  return head.from?.photo.id ?? null;
}

export function seekTimeForPhoto(
  composition: PhotoVideoComposition,
  photoId: string,
  context: "studio" | "homecheff-item" = "studio"
): number {
  const clip = buildPhotoVideoClips(composition, context).find((entry) => entry.photo.id === photoId);
  return clip?.startSeconds ?? 0;
}

/** Seek ~0.5s before the first overlap using the existing preview clock. */
export function firstTransitionSeekTime(
  composition: PhotoVideoComposition,
  context: "studio" | "homecheff-item" = "studio"
): number {
  const clips = buildPhotoVideoClips(composition, context);
  const next = clips[1];
  if (!next) return 0;
  return Math.max(0, next.startSeconds - 0.5);
}

export function compositionClockDuration(
  composition: PhotoVideoComposition,
  context: "studio" | "homecheff-item" = "studio"
): number {
  return compositionDuration(composition, context).totalSeconds;
}
