import type { ShowcaseMediaType } from "@/types/studio-showcase-item";

export const SHOWCASE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SHOWCASE_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const SHOWCASE_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const SHOWCASE_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type ShowcaseUploadSlot = "media" | "thumbnail" | "poster";

export function showcaseMimeForMediaType(mediaType: ShowcaseMediaType): readonly string[] {
  return mediaType === "video" ? SHOWCASE_VIDEO_MIME_TYPES : SHOWCASE_IMAGE_MIME_TYPES;
}

export function validateShowcaseUpload(params: {
  mimeType: string;
  sizeBytes: number;
  slot: ShowcaseUploadSlot;
}): { ok: true } | { ok: false; errorKey: string } {
  const { mimeType, sizeBytes, slot } = params;
  const allowed =
    slot === "media" ?
      [...SHOWCASE_IMAGE_MIME_TYPES, ...SHOWCASE_VIDEO_MIME_TYPES]
    : [...SHOWCASE_IMAGE_MIME_TYPES];

  if (!allowed.includes(mimeType as (typeof allowed)[number])) {
    return { ok: false, errorKey: "admin.showcase.errors.invalidMediaType" };
  }

  const isVideo = (SHOWCASE_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
  const maxBytes = isVideo ? SHOWCASE_MAX_VIDEO_BYTES : SHOWCASE_MAX_IMAGE_BYTES;
  if (sizeBytes > maxBytes) {
    return { ok: false, errorKey: "admin.showcase.errors.fileTooLarge" };
  }

  return { ok: true };
}

export function validateShowcaseItemInput(input: {
  title?: string;
  description?: string;
  mediaType?: string;
  mediaUrl?: string;
}): { ok: true } | { ok: false; errorKey: string } {
  if (!input.title?.trim()) {
    return { ok: false, errorKey: "admin.showcase.errors.titleRequired" };
  }
  if (!input.description?.trim()) {
    return { ok: false, errorKey: "admin.showcase.errors.descriptionRequired" };
  }
  if (!input.mediaType || (input.mediaType !== "image" && input.mediaType !== "video")) {
    return { ok: false, errorKey: "admin.showcase.errors.invalidMediaType" };
  }
  if (!input.mediaUrl?.trim()) {
    return { ok: false, errorKey: "admin.showcase.errors.mediaRequired" };
  }
  return { ok: true };
}
