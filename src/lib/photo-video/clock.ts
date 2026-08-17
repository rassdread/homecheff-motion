import { compositionDuration, type PhotoVideoComposition } from "@/lib/photo-video/composition";
import { buildPhotoVideoClips, playheadAt } from "@/lib/photo-video/timeline";

export function wrapCompositionTime(timeSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return ((timeSeconds % totalSeconds) + totalSeconds) % totalSeconds;
}

export function activePhotoIdAt(composition: PhotoVideoComposition, timeSeconds: number): string | null {
  const head = playheadAt(composition, timeSeconds);
  if (head.to && head.timeSeconds >= head.to.startSeconds) return head.to.photo.id;
  return head.from?.photo.id ?? null;
}

export function seekTimeForPhoto(composition: PhotoVideoComposition, photoId: string): number {
  const clip = buildPhotoVideoClips(composition).find((entry) => entry.photo.id === photoId);
  return clip?.startSeconds ?? 0;
}

export function compositionClockDuration(composition: PhotoVideoComposition): number {
  return compositionDuration(composition).totalSeconds;
}
