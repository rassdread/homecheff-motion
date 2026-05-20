export type NormalizeOverlayToPosterCanvasInput = {
  posterWidth: number;
  posterHeight: number;
  overlayWidth: number;
  overlayHeight: number;
};

export type NormalizeOverlayToPosterCanvasResult = {
  /** FFmpeg filter chain for the overlay stream (no label prefix). */
  overlayFilter: string;
  /** FFmpeg filter chain for the poster/base stream (no label prefix). */
  baseFilter: string;
  posterWidth: number;
  posterHeight: number;
  overlayAfterWidth: number;
  overlayAfterHeight: number;
};

function clampDimension(value: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n) || n < 2) {
    return 2;
  }
  return n % 2 === 0 ? n : n + 1;
}

/**
 * Build FFmpeg filters so overlay matches the poster canvas exactly (aspect preserved, center crop).
 * Example: scale=1280:1920:force_original_aspect_ratio=increase,crop=1280:1920
 */
export function normalizeOverlayToPosterCanvas(
  input: NormalizeOverlayToPosterCanvasInput
): NormalizeOverlayToPosterCanvasResult {
  const posterWidth = clampDimension(input.posterWidth);
  const posterHeight = clampDimension(input.posterHeight);

  const overlayFilter = [
    `scale=${posterWidth}:${posterHeight}:force_original_aspect_ratio=increase`,
    `crop=${posterWidth}:${posterHeight}`,
  ].join(",");

  const baseFilter = [
    `scale=${posterWidth}:${posterHeight}:force_original_aspect_ratio=decrease`,
    `pad=${posterWidth}:${posterHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
  ].join(",");

  return {
    overlayFilter,
    baseFilter,
    posterWidth,
    posterHeight,
    overlayAfterWidth: posterWidth,
    overlayAfterHeight: posterHeight,
  };
}

export function logPosterNormalize(params: {
  posterWidth: number;
  posterHeight: number;
  overlayBeforeWidth: number;
  overlayBeforeHeight: number;
  overlayAfterWidth: number;
  overlayAfterHeight: number;
}): void {
  console.info("[poster-normalize]", {
    poster: `${params.posterWidth}x${params.posterHeight}`,
    overlay_before: `${params.overlayBeforeWidth}x${params.overlayBeforeHeight}`,
    overlay_after: `${params.overlayAfterWidth}x${params.overlayAfterHeight}`,
  });
}
