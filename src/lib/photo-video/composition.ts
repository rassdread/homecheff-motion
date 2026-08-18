import {
  PHOTO_VIDEO_DEFAULT_DURATION_MODE,
  PHOTO_VIDEO_DEFAULT_DURATION_SECONDS,
  PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS,
  PHOTO_VIDEO_DEFAULT_MOVEMENT_MODE,
  PHOTO_VIDEO_DEFAULT_PACE,
  PHOTO_VIDEO_DEFAULT_RATIO,
  PHOTO_VIDEO_DEFAULT_STYLE,
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MIN_PHOTOS,
  defaultPhotoVideoDurationSeconds,
  photoVideoDurationPresets,
  photoVideoMaxSeconds,
  type PhotoVideoContext,
  type PhotoVideoDurationMode,
  type PhotoVideoMovementMode,
  type PhotoVideoPace,
  type PhotoVideoPhotoSource,
  type PhotoVideoRatio,
  type PhotoVideoStyle,
} from "@/lib/photo-video/constants";
import {
  calculatePhotoVideoDuration,
  durationInputForContext,
  holdSecondsForPace,
  legacyDurationFromPhotoCount,
  resolveAutoDurationSeconds,
  type PhotoVideoDurationResult,
} from "@/lib/photo-video/duration";
import { styleRecipe } from "@/lib/photo-video/styles";
import type { PhotoVideoUserMotionKind } from "@/lib/photo-video/styles";
import {
  clampOwnMusicToVideo,
  setOwnMusicStart,
  setOwnMusicVolume,
  type PhotoVideoAudio,
} from "@/lib/photo-video/audio";
import {
  clampOverlayPosition,
  createTextOverlay,
  PHOTO_VIDEO_MAX_OVERLAYS,
  PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO,
  PHOTO_VIDEO_TEXT_MAX_CHARS,
  PHOTO_VIDEO_TEXT_SIZE_MAX,
  PHOTO_VIDEO_TEXT_SIZE_MIN,
  type PhotoVideoAlign,
  type PhotoVideoFontId,
  type PhotoVideoTextBackground,
  type PhotoVideoTextOverlay,
} from "@/lib/photo-video/text-overlay";

export type { PhotoVideoAudio, PhotoVideoTextOverlay };

export type PhotoVideoPhoto = {
  id: string;
  source: PhotoVideoPhotoSource;
  previewUrl: string;
  included: boolean;
  naturalWidth: number;
  naturalHeight: number;
  /** Listing HTTPS original; never mutated onto the listing in 4A.1. */
  listingUrl?: string;
  /** Per-photo movement override; null clears override. */
  motionKind?: PhotoVideoUserMotionKind | null;
};

export type PhotoVideoComposition = {
  photos: PhotoVideoPhoto[];
  ratio: PhotoVideoRatio;
  pace: PhotoVideoPace;
  style: PhotoVideoStyle;
  overlays: PhotoVideoTextOverlay[];
  audio: PhotoVideoAudio;
  endCardSeconds: number;
  durationMode: PhotoVideoDurationMode;
  /** Total selected duration including end card. */
  durationSeconds: number;
  movementMode: PhotoVideoMovementMode;
};

export function createPhotoVideoComposition(
  partial?: Partial<PhotoVideoComposition>,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const base: PhotoVideoComposition = {
    photos: [],
    ratio: PHOTO_VIDEO_DEFAULT_RATIO,
    pace: PHOTO_VIDEO_DEFAULT_PACE,
    style: PHOTO_VIDEO_DEFAULT_STYLE,
    overlays: [],
    endCardSeconds: PHOTO_VIDEO_DEFAULT_END_CARD_SECONDS,
    durationMode: PHOTO_VIDEO_DEFAULT_DURATION_MODE,
    durationSeconds: defaultPhotoVideoDurationSeconds(context),
    movementMode: PHOTO_VIDEO_DEFAULT_MOVEMENT_MODE,
    audio: { kind: "none" },
    ...partial,
  };
  return migrateComposition(base, context);
}

export type PhotoVideoCompositionDraft = Omit<
  PhotoVideoComposition,
  "durationMode" | "durationSeconds" | "movementMode"
> & {
  durationMode?: PhotoVideoDurationMode;
  durationSeconds?: number;
  movementMode?: PhotoVideoMovementMode;
};

/** Backfill duration/movement fields for pre-4A.4B drafts and in-memory restores. */
export function migrateComposition(
  composition: PhotoVideoCompositionDraft,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const hasDuration =
    typeof composition.durationSeconds === "number" &&
    typeof composition.durationMode === "string" &&
    typeof composition.movementMode === "string";

  if (hasDuration) {
    return {
      ...composition,
      audio: composition.audio ?? { kind: "none" },
      durationMode: composition.durationMode ?? PHOTO_VIDEO_DEFAULT_DURATION_MODE,
      durationSeconds: composition.durationSeconds ?? defaultPhotoVideoDurationSeconds(context),
      movementMode: composition.movementMode ?? PHOTO_VIDEO_DEFAULT_MOVEMENT_MODE,
    };
  }

  const photoCount = includedPhotos(composition).length;
  const recipe = styleRecipe(composition.style);
  const legacyTotal = legacyDurationFromPhotoCount({
    photoCount,
    holdSeconds: holdSecondsForPace(composition.pace),
    overlapSeconds: recipe.overlapSeconds,
    endCardSeconds: composition.endCardSeconds ?? 0,
  });
  const presets = photoVideoDurationPresets(context);
  const nearest = presets.reduce(
    (best, value) => (Math.abs(value - legacyTotal) < Math.abs(best - legacyTotal) ? value : best),
    presets[0] ?? PHOTO_VIDEO_DEFAULT_DURATION_SECONDS
  );
  const maxSeconds = photoVideoMaxSeconds(context);

  return {
    ...composition,
    durationMode: "fixed",
    durationSeconds: Math.min(nearest, maxSeconds),
    movementMode: PHOTO_VIDEO_DEFAULT_MOVEMENT_MODE,
    audio: composition.audio ?? { kind: "none" },
  };
}

export function includedPhotos(composition: { photos: PhotoVideoPhoto[] }): PhotoVideoPhoto[] {
  return composition.photos.filter((photo) => photo.included);
}

export function compositionDurationInput(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "studio"
) {
  const recipe = styleRecipe(composition.style);
  return durationInputForContext(
    {
      photoCount: includedPhotos(composition).length,
      durationSeconds: composition.durationSeconds,
      durationMode: composition.durationMode,
      holdSeconds: holdSecondsForPace(composition.pace),
      overlapSeconds: recipe.overlapSeconds,
      endCardSeconds: composition.endCardSeconds,
    },
    context
  );
}

export function compositionDuration(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "studio"
): PhotoVideoDurationResult {
  return calculatePhotoVideoDuration(compositionDurationInput(composition, context));
}

export function canAddPhoto(composition: PhotoVideoComposition, sourceCount = 1): boolean {
  return includedPhotos(composition).length + sourceCount <= PHOTO_VIDEO_MAX_PHOTOS;
}

export function isCompositionPreviewReady(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "studio"
): boolean {
  const n = includedPhotos(composition).length;
  const duration = compositionDuration(composition, context);
  return (
    n >= PHOTO_VIDEO_MIN_PHOTOS &&
    n <= PHOTO_VIDEO_MAX_PHOTOS &&
    !duration.exceedsMax &&
    duration.totalSeconds > 0
  );
}

export function canRemoveIncludedPhoto(composition: PhotoVideoComposition): boolean {
  return includedPhotos(composition).length > 0;
}

function withDurationSync(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  let next = composition;
  if (next.durationMode === "auto") {
    const resolved = resolveAutoDurationSeconds({
      photoCount: includedPhotos(next).length,
      pace: next.pace,
      overlapSeconds: styleRecipe(next.style).overlapSeconds,
      endCardSeconds: next.endCardSeconds,
      maxSeconds: photoVideoMaxSeconds(context),
    });
    next = { ...next, durationSeconds: resolved };
  }
  return syncAudioWindow(next, context);
}

export function addPhotos(
  composition: PhotoVideoComposition,
  photos: PhotoVideoPhoto[],
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const nextPhotos = composition.photos.slice();
  for (const photo of photos) {
    const trial: PhotoVideoComposition = { ...composition, photos: [...nextPhotos, photo] };
    if (photo.included && includedPhotos(trial).length > PHOTO_VIDEO_MAX_PHOTOS) continue;
    nextPhotos.push(photo);
  }
  return withDurationSync({ ...composition, photos: nextPhotos }, context);
}

export function excludePhoto(
  composition: PhotoVideoComposition,
  photoId: string,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target?.included) return composition;
  if (!canRemoveIncludedPhoto(composition)) return composition;
  return withDurationSync(
    {
      ...composition,
      photos: composition.photos.map((photo) =>
        photo.id === photoId ? { ...photo, included: false } : photo
      ),
    },
    context
  );
}

export function includePhoto(
  composition: PhotoVideoComposition,
  photoId: string,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target || target.included) return composition;
  if (!canAddPhoto(composition, 1)) return composition;
  return withDurationSync(
    {
      ...composition,
      photos: composition.photos.map((photo) =>
        photo.id === photoId ? { ...photo, included: true } : photo
      ),
    },
    context
  );
}

export function removePhoto(
  composition: PhotoVideoComposition,
  photoId: string,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const target = composition.photos.find((photo) => photo.id === photoId);
  if (!target) return composition;
  if (target.included && !canRemoveIncludedPhoto(composition)) return composition;
  return withDurationSync(
    {
      ...composition,
      photos: composition.photos.filter((photo) => photo.id !== photoId),
      overlays: composition.overlays.filter((overlay) => overlay.photoId !== photoId),
    },
    context
  );
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

function syncAudioWindow(
  composition: PhotoVideoComposition,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  if (composition.audio.kind !== "ownMusic") return composition;
  return {
    ...composition,
    audio: clampOwnMusicToVideo(composition.audio, compositionDuration(composition, context).totalSeconds),
  };
}

export function setDurationSeconds(
  composition: PhotoVideoComposition,
  seconds: number,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  return syncAudioWindow(
    { ...composition, durationMode: "fixed", durationSeconds: Math.max(1, seconds) },
    context
  );
}

export function setDurationMode(
  composition: PhotoVideoComposition,
  mode: PhotoVideoDurationMode,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const next = { ...composition, durationMode: mode };
  return withDurationSync(next, context);
}

export function setMovementMode(
  composition: PhotoVideoComposition,
  mode: PhotoVideoMovementMode
): PhotoVideoComposition {
  return { ...composition, movementMode: mode };
}

export function setPhotoMotionKind(
  composition: PhotoVideoComposition,
  photoId: string,
  motion: PhotoVideoUserMotionKind | null
): PhotoVideoComposition {
  return {
    ...composition,
    photos: composition.photos.map((photo) =>
      photo.id === photoId ? { ...photo, motionKind: motion } : photo
    ),
  };
}

export function setPace(
  composition: PhotoVideoComposition,
  pace: PhotoVideoPace,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const next = { ...composition, pace };
  return withDurationSync(next, context);
}

export function setStyle(
  composition: PhotoVideoComposition,
  style: PhotoVideoStyle,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  const next = { ...composition, style };
  return withDurationSync(next, context);
}

export function setRatio(composition: PhotoVideoComposition, ratio: PhotoVideoRatio): PhotoVideoComposition {
  return { ...composition, ratio };
}

export function overlaysForPhoto(composition: PhotoVideoComposition, photoId: string): PhotoVideoTextOverlay[] {
  return composition.overlays.filter((overlay) => overlay.photoId === photoId);
}

export function canAddOverlay(composition: PhotoVideoComposition, photoId: string): boolean {
  if (composition.overlays.length >= PHOTO_VIDEO_MAX_OVERLAYS) return false;
  return overlaysForPhoto(composition, photoId).length < PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO;
}

export function addTextOverlay(
  composition: PhotoVideoComposition,
  overlay: PhotoVideoTextOverlay
): PhotoVideoComposition {
  if (!canAddOverlay(composition, overlay.photoId)) return composition;
  if (!composition.photos.some((photo) => photo.id === overlay.photoId)) return composition;
  const pos = clampOverlayPosition(overlay.x, overlay.y);
  return {
    ...composition,
    overlays: [...composition.overlays, { ...overlay, ...pos, text: overlay.text.slice(0, PHOTO_VIDEO_TEXT_MAX_CHARS) }],
  };
}

export function addTextForPhoto(
  composition: PhotoVideoComposition,
  input: { id: string; photoId: string; text?: string }
): PhotoVideoComposition {
  const count = overlaysForPhoto(composition, input.photoId).length;
  const y = clampOverlayPosition(0.5, 0.2 + count * 0.12).y;
  return addTextOverlay(composition, createTextOverlay({ ...input, y }));
}

export function updateTextOverlay(
  composition: PhotoVideoComposition,
  overlayId: string,
  patch: Partial<Omit<PhotoVideoTextOverlay, "id" | "photoId">>
): PhotoVideoComposition {
  return {
    ...composition,
    overlays: composition.overlays.map((overlay) => {
      if (overlay.id !== overlayId) return overlay;
      const next = { ...overlay, ...patch };
      if (patch.text !== undefined) next.text = patch.text.slice(0, PHOTO_VIDEO_TEXT_MAX_CHARS);
      if (patch.size !== undefined) {
        next.size = Math.max(PHOTO_VIDEO_TEXT_SIZE_MIN, Math.min(PHOTO_VIDEO_TEXT_SIZE_MAX, patch.size));
      }
      if (patch.x !== undefined || patch.y !== undefined) {
        const pos = clampOverlayPosition(next.x, next.y);
        next.x = pos.x;
        next.y = pos.y;
      }
      return next;
    }),
  };
}

export function moveTextOverlay(
  composition: PhotoVideoComposition,
  overlayId: string,
  x: number,
  y: number
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { x, y });
}

export function removeTextOverlay(composition: PhotoVideoComposition, overlayId: string): PhotoVideoComposition {
  return { ...composition, overlays: composition.overlays.filter((overlay) => overlay.id !== overlayId) };
}

export function setOverlayFont(
  composition: PhotoVideoComposition,
  overlayId: string,
  font: PhotoVideoFontId
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { font });
}

export function setOverlayColor(
  composition: PhotoVideoComposition,
  overlayId: string,
  color: string
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { color });
}

export function setOverlaySize(
  composition: PhotoVideoComposition,
  overlayId: string,
  size: number
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { size });
}

export function setOverlayAlign(
  composition: PhotoVideoComposition,
  overlayId: string,
  align: PhotoVideoAlign
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { align });
}

export function setOverlayBackground(
  composition: PhotoVideoComposition,
  overlayId: string,
  background: PhotoVideoTextBackground
): PhotoVideoComposition {
  return updateTextOverlay(composition, overlayId, { background });
}

export function setAudio(
  composition: PhotoVideoComposition,
  audio: PhotoVideoAudio,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  if (audio.kind === "none") return { ...composition, audio };
  return syncAudioWindow({ ...composition, audio }, context);
}

export function setMusicStart(
  composition: PhotoVideoComposition,
  startSeconds: number,
  context: PhotoVideoContext = "studio"
): PhotoVideoComposition {
  if (composition.audio.kind !== "ownMusic") return composition;
  return setAudio(
    composition,
    setOwnMusicStart(composition.audio, startSeconds, compositionDuration(composition, context).totalSeconds),
    context
  );
}

export function setMusicVolume(composition: PhotoVideoComposition, volume: number): PhotoVideoComposition {
  if (composition.audio.kind !== "ownMusic") return composition;
  return { ...composition, audio: setOwnMusicVolume(composition.audio, volume) };
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
