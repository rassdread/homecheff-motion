import type { PhotoVideoComposition, PhotoVideoPhoto } from "@/lib/photo-video/composition";
import { isVideoPhoto } from "@/lib/photo-video/media-clip";
import type { PhotoVideoMovementMode } from "@/lib/photo-video/constants";
import {
  motionKindForIndex,
  type PhotoVideoMotionKind,
  type PhotoVideoUserMotionKind,
  userMotionToKind,
} from "@/lib/photo-video/styles";

export function motionKindForPhoto(
  composition: PhotoVideoComposition,
  photo: PhotoVideoPhoto,
  photoIndex: number
): PhotoVideoMotionKind {
  if (isVideoPhoto(photo)) return "none";
  if (composition.movementMode === "none") return "none";
  if (photo.motionKind && photo.motionKind !== "auto") {
    const mapped = userMotionToKind(photo.motionKind as PhotoVideoUserMotionKind);
    if (mapped) return mapped;
    if (photo.motionKind === "none") return "none";
  }
  if (composition.movementMode === "auto") {
    return motionKindForIndex(composition.style, photoIndex);
  }
  return "zoom-in";
}

export function setCompositionMovementMode(
  composition: PhotoVideoComposition,
  mode: PhotoVideoMovementMode
): PhotoVideoComposition {
  return { ...composition, movementMode: mode };
}

export function setPhotoMotion(
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
