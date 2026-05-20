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

export type PosterMotionBlendFilterInput = {
  baseFilter: string;
  overlayFilter: string;
  /** 0.05–0.30 */
  blendStrength: number;
};

/**
 * Lightweight fallback: desaturated lighten only (no screen / no full-frame wash).
 */
export function buildPosterMotionBlendFilterSimple(input: PosterMotionBlendFilterInput): string {
  const strength = Math.min(0.3, Math.max(0.05, input.blendStrength));
  const lift = strength.toFixed(3);

  return [
    `[0:v]${input.baseFilter},format=yuv420p[base]`,
    `[1:v]${input.overlayFilter},format=yuv420p,eq=saturation=0.25:brightness=0.02[fg]`,
    `[base][fg]blend=all_mode=lighten:all_opacity=${lift}:shortest=1[out]`,
  ].join(";");
}

/**
 * Subtle highlight-only composite: poster stays dominant, motion adds light/glow only.
 * Luminance mask limits overlay to areas brighter than the base (reduces ghost duplicate).
 */
export function buildPosterMotionBlendFilterComplex(input: PosterMotionBlendFilterInput): string {
  const strength = Math.min(0.3, Math.max(0.05, input.blendStrength));
  const lift = strength.toFixed(3);
  const lumThresh = Math.round(8 + strength * 40);

  return [
    `[0:v]${input.baseFilter},format=yuv420p[base]`,
    `[1:v]${input.overlayFilter},format=yuv420p,eq=saturation=0.28:contrast=1.02:brightness=0.02[fg]`,
    `[base]split=2[base_main][base_y]`,
    `[fg]extractplanes=y,format=yuv400p[fg_y]`,
    `[base_y]extractplanes=y,format=yuv400p[base_l]`,
    `[fg_y][base_l]blend=all_mode=difference,format=yuv400p[diff]`,
    `[diff]geq=lum='if(gt(lum(X,Y),${lumThresh}),lum(X,Y),0)'[mask]`,
    `[fg][mask]alphamerge[fg_hi]`,
    `[base_main][fg_hi]blend=all_mode=lighten:all_opacity=${lift}:shortest=1[out]`,
  ].join(";");
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
