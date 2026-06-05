import type { TextAvoidZone } from "@/types/text-avoid-zone";
import {
  textBoxOverlapWithZones,
  zoneOverlapFraction,
} from "@/server/animation-export/text-avoid-zone-builder";
import {
  SPEC_RELOCATION_BANDS,
  TEXT_SAFE_AREA_MARGIN,
  lineHeightNormalized,
} from "@/server/animation-export/text-placement-spec";
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

/** Relocation bands — top → mid → bottom per video text rendering spec. */
export const RELOCATION_BANDS: Array<{
  id: string;
  y: number;
  alignment: number;
  priority: number;
}> = [
  ...SPEC_RELOCATION_BANDS.map((band) => ({
    id: band.id,
    y: band.y,
    alignment: band.alignment,
    priority: band.priority,
  })),
  { id: "left_edge", y: 0.5, alignment: 1, priority: 7 },
  { id: "right_edge", y: 0.5, alignment: 3, priority: 8 },
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
  const lineH = lineHeightNormalized(input.fontSize, input.frameH);
  const maxLen = Math.max(...input.lines.map((l) => l.length), 1);
  const margin = TEXT_SAFE_AREA_MARGIN;
  const boxW = Math.min(1 - 2 * margin, maxLen * charW + 0.04);
  const boxH = Math.min(0.4, input.lines.length * lineH + 0.01);

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

  left = Math.max(margin, Math.min(1 - margin - boxW, left));
  top = Math.max(margin, Math.min(1 - margin - boxH, top));

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
          ? Math.round(TEXT_SAFE_AREA_MARGIN * input.frameW)
          : band.alignment === 3
            ? Math.round((1 - TEXT_SAFE_AREA_MARGIN) * input.frameW)
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
    action: "fallback_top_shrink",
    box: fallbackBox,
  };
}
