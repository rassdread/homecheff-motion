import type { HomeCheffExample } from "@/lib/homecheff-examples";

export function spaceGalleryCardSrc(example: HomeCheffExample): string {
  return example.thumbnailUrl;
}

export function spaceGalleryModalSrc(example: HomeCheffExample): string {
  if (example.mediaKind === "video" && example.mediaUrl?.trim()) {
    return example.mediaUrl.trim();
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
  return example.mediaUrl?.trim() || example.thumbnailUrl;
}
