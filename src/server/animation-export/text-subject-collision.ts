import type { TextAvoidZone } from "@/types/text-avoid-zone";
import {
  textBoxOverlapWithZones,
  zoneOverlapFraction,
} from "@/server/animation-export/text-avoid-zone-builder";
import {
  resolveTextPlacementTwoPass,
  type PlacedTextBox,
} from "@/server/animation-export/text-placement-reservation";

export const SUBJECT_OVERLAP_REJECT_THRESHOLD = 0.08;
export const SUBJECT_OVERLAP_SOFT_THRESHOLD = 0.04;

export type NormalizedTextBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function isTextBoxUnsafeForZones(
  box: NormalizedTextBox,
  zones: TextAvoidZone[],
  threshold = SUBJECT_OVERLAP_REJECT_THRESHOLD
): boolean {
  return textBoxOverlapWithZones(box, zones) >= threshold;
}

export function subjectOverlapPenalty(
  box: NormalizedTextBox,
  zones: TextAvoidZone[]
): number {
  const norm = {
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
  };
  let penalty = 0;
  for (const zone of zones) {
    const overlap = zoneOverlapFraction(norm, zone);
    if (overlap <= 0) continue;
    const typeMult =
      zone.type === "face"
        ? 120
        : zone.type === "mascot" || zone.type === "primary_subject"
          ? 100
          : zone.type === "hand" || zone.type === "product"
            ? 85
            : 60;
    penalty += typeMult * overlap * zone.weight * zone.confidence;
  }
  return penalty;
}

/** Relocation bands for story dialogue (normalized y anchors). */
export const RELOCATION_BANDS: Array<{
  id: string;
  y: number;
  alignment: number;
  priority: number;
}> = [
  { id: "bottom_safe", y: 0.88, alignment: 2, priority: 1 },
  { id: "top_safe", y: 0.1, alignment: 8, priority: 2 },
  { id: "lower_third", y: 0.72, alignment: 2, priority: 3 },
  { id: "upper_third", y: 0.22, alignment: 8, priority: 4 },
  { id: "left_edge", y: 0.5, alignment: 1, priority: 5 },
  { id: "right_edge", y: 0.5, alignment: 3, priority: 6 },
];

export function estimateTextBoxNormalized(input: {
  x: number;
  y: number;
  fontSize: number;
  frameW: number;
  frameH: number;
  lines: string[];
  alignment: number;
}): NormalizedTextBox {
  const charW = (input.fontSize * 0.55) / input.frameW;
  const lineH = (input.fontSize * 1.25) / input.frameH;
  const maxLen = Math.max(...input.lines.map((l) => l.length), 1);
  const boxW = Math.min(0.92, maxLen * charW + 0.04);
  const boxH = Math.min(0.4, input.lines.length * lineH + 0.02);

  let left = input.x / input.frameW - boxW / 2;
  if (input.alignment === 1) {
    left = input.x / input.frameW;
  } else if (input.alignment === 3) {
    left = input.x / input.frameW - boxW;
  }

  let top = input.y / input.frameH;
  if (input.alignment === 2 || input.alignment === 5 || input.alignment === 6) {
    top = input.y / input.frameH - boxH;
  } else if (input.alignment === 8) {
    top = input.y / input.frameH;
  } else {
    top = input.y / input.frameH - boxH / 2;
  }

  left = Math.max(0.02, Math.min(0.98 - boxW, left));
  top = Math.max(0.02, Math.min(0.98 - boxH, top));

  return {
    left,
    top,
    right: left + boxW,
    bottom: top + boxH,
  };
}

export function relocateAwayFromSubjectZones(input: {
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  lines: string[];
  frameW: number;
  frameH: number;
  zones: TextAvoidZone[];
  shrinkSteps?: number[];
  layerId?: string;
  placedReservations?: PlacedTextBox[];
}): {
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  action: string;
  box: NormalizedTextBox;
} {
  if (input.placedReservations) {
    const resolved = resolveTextPlacementTwoPass({
      layerId: input.layerId ?? "layer",
      x: input.x,
      y: input.y,
      fontSize: input.fontSize,
      alignment: input.alignment,
      lines: input.lines,
      frameW: input.frameW,
      frameH: input.frameH,
      zones: input.zones,
      placedReservations: input.placedReservations,
      shrinkSteps: input.shrinkSteps,
    });
    return {
      x: resolved.x,
      y: resolved.y,
      fontSize: resolved.fontSize,
      alignment: resolved.alignment,
      action: resolved.action,
      box: resolved.box,
    };
  }

  const shrinkSteps = input.shrinkSteps ?? [1, 0.92, 0.85, 0.78];
  const currentBox = estimateTextBoxNormalized(input);

  if (!isTextBoxUnsafeForZones(currentBox, input.zones)) {
    return {
      x: input.x,
      y: input.y,
      fontSize: input.fontSize,
      alignment: input.alignment,
      action: "kept",
      box: currentBox,
    };
  }

  const sortedBands = [...RELOCATION_BANDS].sort((a, b) => a.priority - b.priority);

  for (const shrink of shrinkSteps) {
    const fontSize = Math.round(input.fontSize * shrink);
    for (const band of sortedBands) {
      const candidateY = Math.round(band.y * input.frameH);
      const candidateX =
        band.alignment === 1
          ? Math.round(0.06 * input.frameW)
          : band.alignment === 3
            ? Math.round(0.94 * input.frameW)
            : Math.round(0.5 * input.frameW);

      const box = estimateTextBoxNormalized({
        x: candidateX,
        y: candidateY,
        fontSize,
        frameW: input.frameW,
        frameH: input.frameH,
        lines: input.lines,
        alignment: band.alignment,
      });

      if (!isTextBoxUnsafeForZones(box, input.zones, SUBJECT_OVERLAP_SOFT_THRESHOLD)) {
        return {
          x: candidateX,
          y: candidateY,
          fontSize,
          alignment: band.alignment,
          action: `relocated_${band.id}_shrink_${shrink}`,
          box,
        };
      }
    }
  }

  const fallbackBand = sortedBands[0]!;
  const fallbackY = Math.round(fallbackBand.y * input.frameH);
  const fallbackFont = Math.round(input.fontSize * (shrinkSteps[shrinkSteps.length - 1] ?? 0.78));
  const fallbackBox = estimateTextBoxNormalized({
    x: Math.round(0.5 * input.frameW),
    y: fallbackY,
    fontSize: fallbackFont,
    frameW: input.frameW,
    frameH: input.frameH,
    lines: input.lines,
    alignment: fallbackBand.alignment,
  });

  return {
    x: Math.round(0.5 * input.frameW),
    y: fallbackY,
    fontSize: fallbackFont,
    alignment: fallbackBand.alignment,
    action: "fallback_bottom_shrink",
    box: fallbackBox,
  };
}
