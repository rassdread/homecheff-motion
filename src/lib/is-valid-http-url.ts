/**
 * Validate remote image URLs before fetch, OCR, or persistence.
 */

import { warnInvalidImageUrl } from "@/lib/instant-cache-diagnostics";

export function isBlockedPreviewLiteral(value: unknown): boolean {
  if (typeof value !== "string") {
    return true;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "images" || lower === "/images") {
    return true;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  return false;
}

export function isValidDataImageUrl(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith("data:image/") && trimmed.length > 24;
}

export function isValidHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || isBlockedPreviewLiteral(value)) {
    return false;
  }
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Blob/data shape check only — use resolvePreviewSrc for wizard previews. */
export function isBlobOrObjectUrl(value: unknown): boolean {
  if (typeof value !== "string" || isBlockedPreviewLiteral(value)) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith("blob:") || isValidDataImageUrl(trimmed);
}

/** Prefer resolvePreviewSrc / SafePreviewImage for wizard UI. */
export function isRenderableImageUrl(value: unknown): boolean {
  if (typeof value !== "string" || isBlockedPreviewLiteral(value)) {
    return false;
  }
  const trimmed = value.trim();
  return isValidHttpUrl(trimmed) || isValidDataImageUrl(trimmed);
}

export function resolveRenderableImageSrc(
  ...candidates: Array<unknown>
): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || isBlockedPreviewLiteral(candidate)) {
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
