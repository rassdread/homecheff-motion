import type { PhotoVideoComposition, PhotoVideoPhoto } from "@/lib/photo-video/composition";
import { includedPhotos, compositionDuration } from "@/lib/photo-video/composition";
import { holdSecondsForPace } from "@/lib/photo-video/duration";
import { motionKindForIndex, styleRecipe, type PhotoVideoTransitionKind } from "@/lib/photo-video/styles";

export type PhotoVideoClip = {
  photo: PhotoVideoPhoto;
  index: number;
  startSeconds: number;
  endSeconds: number;
  holdSeconds: number;
};

export type PhotoVideoPlayhead = {
  timeSeconds: number;
  totalSeconds: number;
  from: PhotoVideoClip | null;
  to: PhotoVideoClip | null;
  mix: number;
  transition: PhotoVideoTransitionKind;
  fromProgress: number;
  toProgress: number;
};

export function buildPhotoVideoClips(composition: PhotoVideoComposition): PhotoVideoClip[] {
  const photos = includedPhotos(composition);
  const hold = holdSecondsForPace(composition.pace);
  const overlap = styleRecipe(composition.style).overlapSeconds;
  const clips: PhotoVideoClip[] = [];
  let cursor = 0;
  for (const [index, photo] of photos.entries()) {
    const startSeconds = cursor;
    const endSeconds = startSeconds + hold;
    clips.push({ photo, index, startSeconds, endSeconds, holdSeconds: hold });
    cursor = endSeconds - (index < photos.length - 1 ? overlap : 0);
  }
  return clips;
}

export function playheadAt(composition: PhotoVideoComposition, timeSeconds: number): PhotoVideoPlayhead {
  const clips = buildPhotoVideoClips(composition);
  const totalSeconds = compositionDuration(composition).totalSeconds;
  const transition = styleRecipe(composition.style).transition;
  if (clips.length === 0 || totalSeconds <= 0) {
    return {
      timeSeconds: 0,
      totalSeconds: 0,
      from: null,
      to: null,
      mix: 0,
      transition,
      fromProgress: 0,
      toProgress: 0,
    };
  }
  const t = ((timeSeconds % totalSeconds) + totalSeconds) % totalSeconds;
  let from = clips[0]!;
  let to: PhotoVideoClip | null = null;
  let mix = 0;
  for (let i = 0; i < clips.length; i += 1) {
    const clip = clips[i]!;
    const next = clips[i + 1] ?? null;
    if (t >= clip.startSeconds && t <= clip.endSeconds) {
      from = clip;
      if (next && t >= next.startSeconds) {
        to = next;
        const overlap = clip.endSeconds - next.startSeconds;
        mix = overlap > 0 ? (t - next.startSeconds) / overlap : 0;
      }
      break;
    }
    if (next && t >= clip.endSeconds && t < next.startSeconds) {
      from = clip;
      break;
    }
    if (i === clips.length - 1) {
      from = clip;
    }
  }
  if (transition === "cut") {
    mix = 0;
    to = null;
    const active = clips.find((clip) => t >= clip.startSeconds && t < clip.endSeconds) ?? clips[clips.length - 1]!;
    from = active;
  }
  const fromProgress = from.holdSeconds > 0 ? (t - from.startSeconds) / from.holdSeconds : 0;
  const toProgress = to && to.holdSeconds > 0 ? (t - to.startSeconds) / to.holdSeconds : 0;
  return {
    timeSeconds: t,
    totalSeconds,
    from,
    to,
    mix: Math.max(0, Math.min(1, mix)),
    transition,
    fromProgress: Math.max(0, Math.min(1, fromProgress)),
    toProgress: Math.max(0, Math.min(1, toProgress)),
  };
}

export function motionKindForClip(composition: PhotoVideoComposition, clip: PhotoVideoClip) {
  return motionKindForIndex(composition.style, clip.index);
}
