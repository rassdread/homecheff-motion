/**
 * Vertical layout bands for Story Mode — keep multiple text layers visible in separate zones.
 */

import { SAFE_AREA_MARGIN_V } from "@/server/animation-export/safe-zone-placement";
import type { StoryOverlayPositionPreset } from "@/lib/story-overlay-layer-styles";
import type { OverlayCollisionLayerKind } from "@/server/animation-export/story-overlay-collision";

export type StoryLayoutBand = "top" | "upper_middle" | "center" | "lower_middle" | "bottom";

export const STORY_LAYOUT_BAND_ORDER: StoryLayoutBand[] = [
  "top",
  "upper_middle",
  "center",
  "lower_middle",
  "bottom",
];

/** Anchor Y fraction within the safe vertical area (0 = top of safe zone). */
const BAND_FRACTION: Record<StoryLayoutBand, number> = {
  top: 0.1,
  upper_middle: 0.3,
  center: 0.5,
  lower_middle: 0.68,
  bottom: 0.88,
};

export type StorySceneLayerKind = "headline" | "title" | "subtitle" | "extra";

export function defaultBandForSceneLayer(layer: StorySceneLayerKind, index = 0): StoryLayoutBand {
  if (layer === "headline") {
    return "top";
  }
  if (layer === "title") {
    return "upper_middle";
  }
  if (layer === "subtitle") {
    return "center";
  }
  const extras: StoryLayoutBand[] = ["lower_middle", "bottom"];
  return extras[index % extras.length] ?? "lower_middle";
}

export function defaultBandForOverlayKind(kind: OverlayCollisionLayerKind): StoryLayoutBand {
  switch (kind) {
    case "hero":
    case "headline":
      return "top";
    case "title":
    case "sequence_line":
      return "upper_middle";
    case "subtitle":
      return "center";
    case "extra":
      return "lower_middle";
    case "hero_finale":
      return "lower_middle";
    case "finale_footer":
      return "bottom";
    default:
      return "center";
  }
}

export function bandForPositionPreference(
  position: StoryOverlayPositionPreset | undefined
): StoryLayoutBand | null {
  if (!position || position === "auto") {
    return null;
  }
  if (position === "top") {
    return "top";
  }
  if (position === "middle") {
    return "center";
  }
  return "bottom";
}

/** Override anchor Y when the user picks top / middle / bottom placement. */
export function yForPositionPreference(
  position: StoryOverlayPositionPreset | undefined,
  defaultY: number,
  frameHeight: number
): number {
  const band = bandForPositionPreference(position);
  if (!band) {
    return defaultY;
  }
  return bandAnchorY(band, frameHeight);
}

export function bandAnchorY(band: StoryLayoutBand, frameHeight: number): number {
  const safeTop = frameHeight * SAFE_AREA_MARGIN_V;
  const safeBottom = frameHeight * (1 - SAFE_AREA_MARGIN_V);
  const span = safeBottom - safeTop;
  return Math.round(safeTop + span * BAND_FRACTION[band]);
}

/** Pick next unused band, preferring bands farther from `current`. */
export function nextAlternateBand(
  current: StoryLayoutBand,
  used: ReadonlySet<StoryLayoutBand>
): StoryLayoutBand | null {
  const startIdx = STORY_LAYOUT_BAND_ORDER.indexOf(current);
  for (let offset = 1; offset < STORY_LAYOUT_BAND_ORDER.length; offset += 1) {
    for (const dir of [-1, 1] as const) {
      const idx = startIdx + dir * offset;
      if (idx < 0 || idx >= STORY_LAYOUT_BAND_ORDER.length) {
        continue;
      }
      const band = STORY_LAYOUT_BAND_ORDER[idx]!;
      if (!used.has(band)) {
        return band;
      }
    }
  }
  return null;
}
