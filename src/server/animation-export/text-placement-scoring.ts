import type {
  TextAvoidZone,
  TextPlacementCandidate,
  TextPlacementScoreBreakdown,
} from "@/types/text-avoid-zone";
import {
  BOTTOM_NOGO_BAND_TOP,
  SPEC_RELOCATION_BANDS,
  TEXT_SAFE_AREA_MARGIN,
} from "@/server/animation-export/text-placement-spec";
import {
  estimateTextBoxNormalized,
  subjectOverlapPenalty,
  type NormalizedTextBox,
} from "@/server/animation-export/text-subject-collision";
import { textBoxOverlapWithZones } from "@/server/animation-export/text-avoid-zone-builder";

export function scoreTextPlacementCandidate(input: {
  candidate: TextPlacementCandidate;
  frameW: number;
  frameH: number;
  avoidZones: TextAvoidZone[];
  placedBoxes: NormalizedTextBox[];
  contrastHint?: number;
}): TextPlacementScoreBreakdown {
  const box = estimateTextBoxNormalized({
    x: input.candidate.x,
    y: input.candidate.y,
    fontSize: input.candidate.fontSize,
    frameW: input.frameW,
    frameH: input.frameH,
    lines: input.candidate.lines,
    alignment: input.candidate.alignment,
  });

  const readability = Math.min(40, 18 + input.candidate.fontSize * 0.08);
  const contrast = input.contrastHint ?? 25;
  const marginSafety = edgeMarginScore(box);

  const avoidZoneOverlap = textBoxOverlapWithZones(box, input.avoidZones) * 80;
  const subjectOverlap = subjectOverlapPenalty(box, input.avoidZones) * 0.15;
  const textCollision = textVsTextPenalty(box, input.placedBoxes);
  const edgeCrowding = edgeCrowdingPenalty(box);

  const zonePriority = bandPriorityBonus(input.candidate.band);
  const bottomBandPenalty = bottomNoGoBandPenalty(box);

  const total =
    readability +
    contrast +
    marginSafety +
    zonePriority -
    avoidZoneOverlap -
    subjectOverlap -
    textCollision -
    edgeCrowding -
    bottomBandPenalty;

  return {
    readability,
    contrast,
    marginSafety,
    avoidZoneOverlap,
    subjectOverlap,
    textCollision,
    edgeCrowding,
    total,
  };
}

function edgeMarginScore(box: NormalizedTextBox): number {
  const margins = [box.left, box.top, 1 - box.right, 1 - box.bottom];
  const minMargin = Math.min(...margins);
  return Math.min(20, minMargin * 80);
}

function edgeCrowdingPenalty(box: NormalizedTextBox): number {
  const margin = TEXT_SAFE_AREA_MARGIN;
  let penalty = 0;
  if (box.left < margin) penalty += 12;
  if (box.top < margin) penalty += 10;
  if (box.right > 1 - margin) penalty += 12;
  if (box.bottom > 1 - margin) penalty += 10;
  return penalty;
}

function bandPriorityBonus(band?: string): number {
  if (!band) return 0;
  const spec = SPEC_RELOCATION_BANDS.find((entry) => entry.id === band);
  if (spec) {
    return (7 - spec.priority) * 3;
  }
  if (band.startsWith("above_")) return 16;
  if (band.startsWith("below_")) return 10;
  return 0;
}

function bottomNoGoBandPenalty(box: NormalizedTextBox): number {
  if (box.top >= BOTTOM_NOGO_BAND_TOP) {
    return 18;
  }
  if (box.bottom >= BOTTOM_NOGO_BAND_TOP) {
    return 10;
  }
  return 0;
}

function textVsTextPenalty(
  box: NormalizedTextBox,
  placed: NormalizedTextBox[]
): number {
  let penalty = 0;
  for (const other of placed) {
    const overlap = boxOverlap(box, other);
    if (overlap > 0) {
      penalty += 50 * overlap;
    }
  }
  return penalty;
}

function boxOverlap(a: NormalizedTextBox, b: NormalizedTextBox): number {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.right, b.right);
  const y2 = Math.min(a.bottom, b.bottom);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const areaA = (a.right - a.left) * (a.bottom - a.top);
  return areaA > 0 ? inter / areaA : 0;
}

export function pickBestPlacementCandidate(input: {
  candidates: TextPlacementCandidate[];
  frameW: number;
  frameH: number;
  avoidZones: TextAvoidZone[];
  placedBoxes: NormalizedTextBox[];
}): { candidate: TextPlacementCandidate; score: TextPlacementScoreBreakdown } | null {
  if (input.candidates.length === 0) return null;

  let best: { candidate: TextPlacementCandidate; score: TextPlacementScoreBreakdown } | null =
    null;

  for (const candidate of input.candidates) {
    const score = scoreTextPlacementCandidate({
      candidate,
      frameW: input.frameW,
      frameH: input.frameH,
      avoidZones: input.avoidZones,
      placedBoxes: input.placedBoxes,
    });
    if (!best || score.total > best.score.total) {
      best = { candidate, score };
    }
  }

  return best;
}
