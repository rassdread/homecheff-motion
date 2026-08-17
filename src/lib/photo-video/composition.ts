import {
  PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS,
  PHOTO_VIDEO_DEFAULT_PACE,
  PHOTO_VIDEO_DEFAULT_RATIO,
  PHOTO_VIDEO_DEFAULT_STYLE,
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MIN_PHOTOS,
  type PhotoVideoPace,
  type PhotoVideoPhotoSource,
  type PhotoVideoRatio,
  type PhotoVideoStyle,
} from "@/lib/photo-video/constants";
import {
  calculatePhotoVideoDuration,
  holdSecondsForPace,
  type PhotoVideoDurationResult,
} from "@/lib/photo-video/duration";
import { styleRecipe } from "@/lib/photo-video/styles";

export type PhotoVideoAudio =
  | { kind: "none" }
  | {
      kind: "ownMusic";
      /** 4A.2 — start of the video-length window on the track. */
      startSeconds: number;
      /** 4A.2 — equals current video duration when set. */
      durationSeconds: number;
    };

export type PhotoVideoPhoto = {
  id: string;
  source: PhotoVideoPhotoSource;
  previewUrl: string;
  included: boolean;
  naturalWidth: number;
  naturalHeight: number;
  /** Listing HTTPS original; never mutated onto the listing in 4A.1. */
  listingUrl?: string;
};

export type PhotoVideoComposition = {
  photos: PhotoVideoPhoto[];
  ratio: PhotoVideoRatio;
  pace: PhotoVideoPace;
  style: PhotoVideoStyle;
  title: string;
  extraText: string;
  audio: PhotoVideoAudio;
  endCardSeconds: number;
};

export function createPhotoVideoComposition(
  partial?: Partial<PhotoVideoComposition>
): PhotoVideoComposition {
  return {
    photos: [],
    ratio: PHOTO_VIDEO_DEFAULT_RATIO,
    pace: PHOTO_VIDEO_DEFAULT_PACE,
    style: PHOTO_VIDEO_DEFAULT_STYLE,
    title: "",
    extraText: "",
    endCardSeconds: PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS,
    ...partial,
    audio: partial?.audio ?? { kind: "none" },
  };
}

export function includedPhotos(composition: PhotoVideoComposition): PhotoVideoPhoto[] {
  return composition.photos.filter((photo) => photo.included);
}

export function compositionDurationInput(composition: PhotoVideoComposition) {
  const recipe = styleRecipe(composition.style);
  return {
    photoCount: includedPhotos(composition).length,
    holdSeconds: holdSecondsForPace(composition.pace),
    overlapSeconds: recipe.overlapSeconds,
    endCardSeconds: composition.endCardSeconds,
  };
}

export function compositionDuration(composition: PhotoVideoComposition): PhotoVideoDurationResult {
  return calculatePhotoVideoDuration(compositionDurationInput(composition));
}

export function canAddPhoto(composition: PhotoVideoComposition, sourceCount = 1): boolean {
  const nextCount = includedPhotos(composition).length + sourceCount;
  if (nextCount > PHOTO_VIDEO_MAX_PHOTOS) return false;
  const input = compositionDurationInput(composition);
  return !calculatePhotoVideoDuration({ ...input, photoCount: nextCount }).exceedsMax;
}

export function isCompositionPreviewReady(composition: PhotoVideoComposition): boolean {
  const n = includedPhotos(composition).length;
  return n >= PHOTO_VIDEO_MIN_PHOTOS && n <= PHOTO_VIDEO_MAX_PHOTOS && !compositionDuration(composition).exceedsMax;
}

export function canRemoveIncludedPhoto(composition: PhotoVideoComposition): boolean {
  return includedPhotos(composition).length > 0;
}

export function addPhotos(
  composition: PhotoVideoComposition,
  photos: PhotoVideoPhoto[]
): PhotoVideoComposition {
  const nextPhotos = composition.photos.slice();
  for (const photo of photos) {
    const trial: PhotoVideoComposition = { ...composition, photos: [...nextPhotos, photo] };
    if (photo.included) {
      if (includedPhotos(trial).length > PHOTO_VIDEO_MAX_PHOTOS) continue;
      if (compositionDuration(trial).exceedsMax) continue;
    }
    nextPhotos.push(photo);
  }
  return { ...composition, photos: nextPhotos };
}

export function excludePhoto(composition: PhotoVideoComposition, photoId: string): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target?.included) return composition;
  if (!canRemoveIncludedPhoto(composition)) return composition;
  return {
    ...composition,
    photos: composition.photos.map((photo) =>
      photo.id === photoId ? { ...photo, included: false } : photo
    ),
  };
}

export function includePhoto(composition: PhotoVideoComposition, photoId: string): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target || target.included) return composition;
  if (!canAddPhoto(composition, 1)) return composition;
  return {
    ...composition,
    photos: composition.photos.map((photo) =>
      photo.id === photoId ? { ...photo, included: true } : photo
    ),
  };
}

export function removePhoto(composition: PhotoVideoComposition, photoId: string): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target) return composition;
  if (target.included && !canRemoveIncludedPhoto(composition)) return composition;
  return {
    ...composition,
    photos: composition.photos.filter((photo) => photo.id !== photoId),
  };
}

export function reorderPhotos(
  composition: PhotoVideoComposition,
  fromIndex: number,
  toIndex: number
): PhotoVideoComposition {
  if (fromIndex === toIndex) return composition;
  if (fromIndex < 0 || toIndex < 0) return composition;
  if (fromIndex >= composition.photos.length || toIndex >= composition.photos.length) {
    return composition;
  }
  const photos = composition.photos.slice();
  const [moved] = photos.splice(fromIndex, 1);
  if (!moved) return composition;
  photos.splice(toIndex, 0, moved);
  return { ...composition, photos };
}

export function movePhoto(composition: PhotoVideoComposition, photoId: string, delta: -1 | 1): PhotoVideoComposition {
  const index = composition.photos.findIndex((photo) => photo.id === photoId);
  if (index < 0) return composition;
  return reorderPhotos(composition, index, index + delta);
}

export function setPace(composition: PhotoVideoComposition, pace: PhotoVideoPace): PhotoVideoComposition {
  const next = { ...composition, pace };
  if (compositionDuration(next).exceedsMax) return composition;
  return next;
}

export function setStyle(composition: PhotoVideoComposition, style: PhotoVideoStyle): PhotoVideoComposition {
  const next = { ...composition, style };
  if (compositionDuration(next).exceedsMax) return composition;
  return next;
}

export function setRatio(composition: PhotoVideoComposition, ratio: PhotoVideoRatio): PhotoVideoComposition {
  return { ...composition, ratio };
}

export function setTitle(composition: PhotoVideoComposition, title: string): PhotoVideoComposition {
  return { ...composition, title: title.slice(0, 80) };
}

export function setExtraText(composition: PhotoVideoComposition, extraText: string): PhotoVideoComposition {
  return { ...composition, extraText: extraText.slice(0, 120) };
}

export function createLocalPhoto(input: {
  id: string;
  previewUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}): PhotoVideoPhoto {
  return {
    id: input.id,
    source: "LOCAL_UPLOAD",
    previewUrl: input.previewUrl,
    included: true,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
  };
}

export function createListingPhoto(input: {
  id: string;
  listingUrl: string;
  previewUrl?: string;
  naturalWidth: number;
  naturalHeight: number;
}): PhotoVideoPhoto {
  return {
    id: input.id,
    source: "HOME_CHEFF_LISTING",
    listingUrl: input.listingUrl,
    previewUrl: input.previewUrl ?? input.listingUrl,
    included: true,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
  };
}
