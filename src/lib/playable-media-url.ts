import { isValidHttpUrl } from "@/lib/is-valid-http-url";

/** Relative demo paths that 404 in production — never use as video src. */
export function isBrokenRelativeFinalVideoPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return false;
  }
  return trimmed.endsWith("/final.mp4") || trimmed.endsWith("final.mp4");
}

/**
 * Returns a URL safe for <video src> — https/blob only.
 * Blocks relative /generated/.../final.mp4 placeholders and empty values.
 */
export function resolvePlayableVideoSrc(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || isBrokenRelativeFinalVideoPath(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (isValidHttpUrl(trimmed)) {
    return trimmed;
  }
  return null;
}
