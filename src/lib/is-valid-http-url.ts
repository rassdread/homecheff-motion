/**
 * Validate remote image URLs before fetch, OCR, or persistence.
 */

import { warnInvalidImageUrl } from "@/lib/instant-cache-diagnostics";

export function isValidHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Blob/object URLs from createObjectURL — valid for previews only. */
export function isBlobOrObjectUrl(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return trimmed.startsWith("blob:") || trimmed.startsWith("data:image/");
}

/** Safe for <Image unoptimized> / fetch — http(s) or local blob preview. */
export function isRenderableImageUrl(value: unknown): boolean {
  return isValidHttpUrl(value) || isBlobOrObjectUrl(value);
}

export function resolveRenderableImageSrc(
  ...candidates: Array<unknown>
): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const trimmed = candidate.trim();
    if (isRenderableImageUrl(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/** Remote URL suitable for server/render pipeline — never blob/data URLs. */
export function resolveRemoteImageSrc(
  ...candidates: Array<unknown>
): string | null {
  for (const candidate of candidates) {
    if (isValidHttpUrl(candidate)) {
      return (candidate as string).trim();
    }
  }
  return null;
}

export function urlOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function logInvalidImageUrl(context: string, details: Record<string, unknown>): void {
  warnInvalidImageUrl(context, details);
}
