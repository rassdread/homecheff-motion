import type { PhotoVideoComposition, PhotoVideoPhoto } from "@/lib/photo-video/composition";
import { compositionDuration, includedPhotos } from "@/lib/photo-video/composition";
import { motionKindForPhoto } from "@/lib/photo-video/movement";
import {
  boundaryTransitionKind,
  isPhotoVideoResolvedTransition,
  overlapSecondsForTransition,
  resolveTransitionKind,
  type PhotoVideoResolvedTransition,
} from "@/lib/photo-video/transition-kind";

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
  transition: PhotoVideoResolvedTransition;
  fromProgress: number;
  toProgress: number;
};

export function buildPhotoVideoClips(
  composition: PhotoVideoComposition,
  context: "studio" | "homecheff-item" = "studio"
): PhotoVideoClip[] {
  const photos = includedPhotos(composition);
  const hold = compositionDuration(composition, context).holdSeconds;
  const overlap = overlapSecondsForTransition(resolveTransitionKind(composition.transitionKind, composition.style));
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

export function playheadAt(
  composition: PhotoVideoComposition,
  timeSeconds: number,
  context: "studio" | "homecheff-item" = "studio"
): PhotoVideoPlayhead {
  const clips = buildPhotoVideoClips(composition, context);
  const totalSeconds = compositionDuration(composition, context).totalSeconds;
  const stored = resolveTransitionKind(composition.transitionKind, composition.style);
  if (clips.length === 0 || totalSeconds <= 0) {
    return {
      timeSeconds: 0,
      totalSeconds: 0,
      from: null,
      to: null,
      mix: 0,
      transition: stored === "auto" ? "fade" : stored,
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
  const override = composition.boundaryTransitions?.[from.index];
  const transition = isPhotoVideoResolvedTransition(override)
    ? override
    : boundaryTransitionKind(composition.transitionKind, composition.style, from.index);
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
  return motionKindForPhoto(composition, clip.photo, clip.index);
}
