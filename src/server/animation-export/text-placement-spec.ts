/**
 * HomeCheff video text rendering spec — safe area, no-go padding, spacing.
 * Central config (not hardcoded in UI components).
 */

/** Frame edge safe area — 8–10% margin (TikTok/Reels/Shorts). */
export const TEXT_SAFE_AREA_MARGIN_MIN = 0.08;
export const TEXT_SAFE_AREA_MARGIN_MAX = 0.1;
export const TEXT_SAFE_AREA_MARGIN = 0.09;

/** Extra padding around mascot/logo no-go zones (fraction of object height). */
export const NOGO_PADDING_HEIGHT_FRACTION_MIN = 0.12;
export const NOGO_PADDING_HEIGHT_FRACTION_MAX = 0.16;
export const NOGO_PADDING_HEIGHT_FRACTION = 0.14;

/** Vertical gap between stacked text blocks (fraction of frame height). */
export const TEXT_BLOCK_VERTICAL_GAP_MIN = 0.15;
export const TEXT_BLOCK_VERTICAL_GAP_MAX = 0.2;
export const TEXT_BLOCK_VERTICAL_GAP = 0.17;

/** Line-height multiplier for box estimation. */
export const TEXT_LINE_HEIGHT_MIN = 1.2;
export const TEXT_LINE_HEIGHT_MAX = 1.4;
export const TEXT_LINE_HEIGHT = 1.3;

/** Extra gap between lines as fraction of font size (normalized via frameH). */
export const TEXT_MULTILINE_GAP_FONT_FRACTION_MIN = 0.08;
export const TEXT_MULTILINE_GAP_FONT_FRACTION_MAX = 0.12;
export const TEXT_MULTILINE_GAP_FONT_FRACTION = 0.1;

/** Placement zone priority: top → mid → bottom (avoid bottom UI/logo band last). */
export const PLACEMENT_ZONE_ORDER = ["top", "mid", "bottom"] as const;

/** Bottom UI / logo band — avoid placing text here when possible. */
export const BOTTOM_NOGO_BAND_TOP = 0.82;

export type PlacementBandSpec = {
  id: string;
  y: number;
  alignment: number;
  priority: number;
  zone: "top" | "mid" | "bottom";
};

/** Relocation bands ordered per spec: top first, then mid, then bottom. */
export const SPEC_RELOCATION_BANDS: PlacementBandSpec[] = [
  { id: "top_safe", y: 0.1, alignment: 8, priority: 1, zone: "top" },
  { id: "upper_mid", y: 0.28, alignment: 8, priority: 2, zone: "mid" },
  { id: "center_mid", y: 0.45, alignment: 5, priority: 3, zone: "mid" },
  { id: "lower_mid", y: 0.62, alignment: 2, priority: 4, zone: "mid" },
  { id: "lower_third", y: 0.72, alignment: 2, priority: 5, zone: "bottom" },
  { id: "bottom_safe", y: 0.86, alignment: 2, priority: 6, zone: "bottom" },
];

export function clampToSafeArea(value: number, size: number): number {
  const margin = TEXT_SAFE_AREA_MARGIN;
  return Math.max(margin, Math.min(1 - margin - size, value));
}

export function lineHeightNormalized(fontSize: number, frameH: number): number {
  const base = (fontSize * TEXT_LINE_HEIGHT) / frameH;
  const extraGap = (fontSize * TEXT_MULTILINE_GAP_FONT_FRACTION) / frameH;
  return base + extraGap;
}
