import type { HomeCheffExample } from "@/lib/homecheff-examples";
import { resolvePlayableVideoSrc } from "@/lib/playable-media-url";

export function spaceGalleryCardSrc(example: HomeCheffExample): string {
  return example.thumbnailUrl;
}

export function spaceGalleryModalSrc(example: HomeCheffExample): string {
  if (example.mediaKind === "video") {
    const video = resolvePlayableVideoSrc(example.mediaUrl) ?? resolvePlayableVideoSrc(example.thumbnailUrl);
    if (video) {
      return video;
    }
  }
  return example.mediaUrl?.trim() || example.thumbnailUrl;
}

export function spaceGalleryCardVideoSrc(example: HomeCheffExample): string | null {
  if (example.mediaKind !== "video") {
    return null;
  }
  if (example.posterUrl || example.thumbnailUrl !== example.mediaUrl) {
    return null;
  }
  return resolvePlayableVideoSrc(example.mediaUrl) ?? resolvePlayableVideoSrc(example.thumbnailUrl);
}
