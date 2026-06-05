import type { TextAvoidZone, TextPlacementCandidate } from "@/types/text-avoid-zone";
import {
  estimateTextBoxNormalized,
  isTextBoxUnsafeForZones,
  RELOCATION_BANDS,
  SUBJECT_OVERLAP_SOFT_THRESHOLD,
  type NormalizedTextBox,
} from "@/server/animation-export/text-subject-collision";
import {
  pickBestPlacementCandidate,
  scoreTextPlacementCandidate,
} from "@/server/animation-export/text-placement-scoring";

/** Reserved final box for a placed text layer. */
export type PlacedTextBox = NormalizedTextBox & {
  layerId: string;
  kind?: string;
};

export const TEXT_OVERLAP_REJECT_THRESHOLD = 0.05;
const STACK_GAP_NORM = 0.03;

export function textBoxOverlapFraction(
  a: NormalizedTextBox,
  b: NormalizedTextBox
): number {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.right, b.right);
  const y2 = Math.min(a.bottom, b.bottom);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const areaA = (a.right - a.left) * (a.bottom - a.top);
  return areaA > 0 ? inter / areaA : 0;
}

export function isTextBoxOverlappingPlaced(
  box: NormalizedTextBox,
  placed: PlacedTextBox[],
  threshold = TEXT_OVERLAP_REJECT_THRESHOLD
): boolean {
  return placed.some((other) => textBoxOverlapFraction(box, other) >= threshold);
}

export function isPlacementValid(input: {
  box: NormalizedTextBox;
  zones: TextAvoidZone[];
  placed: PlacedTextBox[];
}): { valid: boolean; reason?: "subject_overlap" | "text_overlap" } {
  if (
    input.zones.length > 0 &&
    isTextBoxUnsafeForZones(input.box, input.zones, SUBJECT_OVERLAP_SOFT_THRESHOLD)
  ) {
    return { valid: false, reason: "subject_overlap" };
  }
  if (isTextBoxOverlappingPlaced(input.box, input.placed)) {
    return { valid: false, reason: "text_overlap" };
  }
  return { valid: true };
}

function buildStackCandidates(input: {
  frameW: number;
  frameH: number;
  fontSize: number;
  alignment: number;
  lines: string[];
  placed: PlacedTextBox[];
}): TextPlacementCandidate[] {
  const candidates: TextPlacementCandidate[] = [];
  const baseSlots = [0.88, 0.82, 0.76, 0.7, 0.64, 0.58];

  for (const slot of baseSlots) {
    candidates.push({
      x: Math.round(0.5 * input.frameW),
      y: Math.round(slot * input.frameH),
      fontSize: input.fontSize,
      alignment: 2,
      lines: input.lines,
      band: `stack_slot_${slot}`,
    });
  }

  for (const reserved of input.placed) {
    const stackY = Math.round((reserved.bottom + STACK_GAP_NORM) * input.frameH);
    if (stackY >= input.frameH * 0.95) continue;
    candidates.push({
      x: Math.round(0.5 * input.frameW),
      y: stackY,
      fontSize: input.fontSize,
      alignment: 2,
      lines: input.lines,
      band: `stack_below_${reserved.layerId}`,
    });
  }

  return candidates;
}

export function buildPlacementCandidates(input: {
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  lines: string[];
  frameW: number;
  frameH: number;
  placed: PlacedTextBox[];
  shrinkSteps?: number[];
}): TextPlacementCandidate[] {
  const shrinkSteps = input.shrinkSteps ?? [1, 0.92, 0.85, 0.78, 0.72];
  const candidates: TextPlacementCandidate[] = [];

  for (const shrink of shrinkSteps) {
    const fontSize = Math.round(input.fontSize * shrink);

    candidates.push({
      x: input.x,
      y: input.y,
      fontSize,
      alignment: input.alignment,
      lines: input.lines,
      band: "original",
    });

    for (const band of RELOCATION_BANDS) {
      const candidateY = Math.round(band.y * input.frameH);
      const candidateX =
        band.alignment === 1
          ? Math.round(0.06 * input.frameW)
          : band.alignment === 3
            ? Math.round(0.94 * input.frameW)
            : Math.round(0.5 * input.frameW);

      candidates.push({
        x: candidateX,
        y: candidateY,
        fontSize,
        alignment: band.alignment,
        lines: input.lines,
        band: band.id,
      });
    }

    candidates.push(
      ...buildStackCandidates({
        frameW: input.frameW,
        frameH: input.frameH,
        fontSize,
        alignment: input.alignment,
        lines: input.lines,
        placed: input.placed,
      })
    );
  }

  return candidates;
}

export type TextPlacementResolution = {
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  action: string;
  box: NormalizedTextBox;
  rejected: Array<{ reason: string; band?: string; score: number }>;
};

/**
 * Two-pass placement: Pass 1 subject-safe, Pass 2 text-safe against reservations.
 */
export function resolveTextPlacementTwoPass(input: {
  layerId: string;
  x: number;
  y: number;
  fontSize: number;
  alignment: number;
  lines: string[];
  frameW: number;
  frameH: number;
  zones: TextAvoidZone[];
  placedReservations: PlacedTextBox[];
  shrinkSteps?: number[];
}): TextPlacementResolution {
  const originalBox = estimateTextBoxNormalized(input);
  const rejected: Array<{ reason: string; band?: string; score: number }> = [];

  const originalValid = isPlacementValid({
    box: originalBox,
    zones: input.zones,
    placed: input.placedReservations,
  });

  if (originalValid.valid) {
    return {
      x: input.x,
      y: input.y,
      fontSize: input.fontSize,
      alignment: input.alignment,
      action: "kept",
      box: originalBox,
      rejected,
    };
  }

  if (originalValid.reason) {
    rejected.push({
      reason: originalValid.reason,
      band: "original",
      score: 0,
    });
  }

  const candidates = buildPlacementCandidates({
    x: input.x,
    y: input.y,
    fontSize: input.fontSize,
    alignment: input.alignment,
    lines: input.lines,
    frameW: input.frameW,
    frameH: input.frameH,
    placed: input.placedReservations,
    shrinkSteps: input.shrinkSteps,
  });

  const subjectSafe: TextPlacementCandidate[] = [];
  for (const candidate of candidates) {
    const box = estimateTextBoxNormalized({
      x: candidate.x,
      y: candidate.y,
      fontSize: candidate.fontSize,
      frameW: input.frameW,
      frameH: input.frameH,
      lines: candidate.lines,
      alignment: candidate.alignment,
    });
    if (
      input.zones.length === 0 ||
      !isTextBoxUnsafeForZones(box, input.zones, SUBJECT_OVERLAP_SOFT_THRESHOLD)
    ) {
      subjectSafe.push(candidate);
    } else {
      rejected.push({ reason: "subject_overlap", band: candidate.band, score: 0 });
    }
  }

  const textSafe: TextPlacementCandidate[] = [];
  for (const candidate of subjectSafe) {
    const box = estimateTextBoxNormalized({
      x: candidate.x,
      y: candidate.y,
      fontSize: candidate.fontSize,
      frameW: input.frameW,
      frameH: input.frameH,
      lines: candidate.lines,
      alignment: candidate.alignment,
    });
    if (!isTextBoxOverlappingPlaced(box, input.placedReservations)) {
      textSafe.push(candidate);
    } else {
      const score = scoreTextPlacementCandidate({
        candidate,
        frameW: input.frameW,
        frameH: input.frameH,
        avoidZones: input.zones,
        placedBoxes: input.placedReservations,
      });
      rejected.push({
        reason: "text_overlap",
        band: candidate.band,
        score: score.textCollision,
      });
    }
  }

  if (textSafe.length > 0) {
    const best = pickBestPlacementCandidate({
      candidates: textSafe,
      frameW: input.frameW,
      frameH: input.frameH,
      avoidZones: input.zones,
      placedBoxes: input.placedReservations,
    });
    if (best) {
      const box = estimateTextBoxNormalized({
        x: best.candidate.x,
        y: best.candidate.y,
        fontSize: best.candidate.fontSize,
        frameW: input.frameW,
        frameH: input.frameH,
        lines: best.candidate.lines,
        alignment: best.candidate.alignment,
      });
      return {
        x: best.candidate.x,
        y: best.candidate.y,
        fontSize: best.candidate.fontSize,
        alignment: best.candidate.alignment,
        action: `two_pass_${best.candidate.band ?? "scored"}`,
        box,
        rejected,
      };
    }
  }

  const shrinkSteps = input.shrinkSteps ?? [0.78, 0.72, 0.66];
  for (const shrink of shrinkSteps) {
    const fontSize = Math.round(input.fontSize * shrink);
    let stackY = Math.round(0.88 * input.frameH);
    for (const reserved of input.placedReservations) {
      stackY = Math.max(stackY, Math.round((reserved.bottom + STACK_GAP_NORM) * input.frameH));
    }
    const box = estimateTextBoxNormalized({
      x: Math.round(0.5 * input.frameW),
      y: stackY,
      fontSize,
      frameW: input.frameW,
      frameH: input.frameH,
      lines: input.lines,
      alignment: 2,
    });
    const check = isPlacementValid({
      box,
      zones: input.zones,
      placed: input.placedReservations,
    });
    if (check.valid) {
      return {
        x: Math.round(0.5 * input.frameW),
        y: stackY,
        fontSize,
        alignment: 2,
        action: `fallback_stagger_shrink_${shrink}`,
        box,
        rejected,
      };
    }
    rejected.push({
      reason: check.reason ?? "edge_crowding",
      band: "fallback_stagger",
      score: 0,
    });
  }

  const fallbackY = Math.round(0.88 * input.frameH);
  const fallbackFont = Math.round(input.fontSize * 0.72);
  const fallbackBox = estimateTextBoxNormalized({
    x: Math.round(0.5 * input.frameW),
    y: fallbackY,
    fontSize: fallbackFont,
    frameW: input.frameW,
    frameH: input.frameH,
    lines: input.lines,
    alignment: 2,
  });

  return {
    x: Math.round(0.5 * input.frameW),
    y: fallbackY,
    fontSize: fallbackFont,
    alignment: 2,
    action: "fallback_bottom_forced",
    box: fallbackBox,
    rejected,
  };
}

export function reservePlacedTextBox(input: {
  layerId: string;
  kind?: string;
  box: NormalizedTextBox;
}): PlacedTextBox {
  return {
    ...input.box,
    layerId: input.layerId,
    kind: input.kind,
  };
}
