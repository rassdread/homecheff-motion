import type { TextAvoidZone, TextPlacementCandidate } from "@/types/text-avoid-zone";
import {
  BOTTOM_NOGO_BAND_TOP,
  TEXT_BLOCK_VERTICAL_GAP,
  TEXT_SAFE_AREA_MARGIN,
} from "@/server/animation-export/text-placement-spec";
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
const STACK_GAP_NORM = TEXT_BLOCK_VERTICAL_GAP;

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

function buildAboveBelowObjectCandidates(input: {
  frameW: number;
  frameH: number;
  fontSize: number;
  lines: string[];
  zones: TextAvoidZone[];
}): TextPlacementCandidate[] {
  const candidates: TextPlacementCandidate[] = [];
  const objectZones = input.zones.filter(
    (zone) =>
      zone.type === "mascot" ||
      zone.type === "logo" ||
      zone.type === "face" ||
      zone.type === "primary_subject"
  );

  for (const zone of objectZones) {
    const centerX = Math.round((zone.x + zone.width / 2) * input.frameW);
    const aboveY = Math.round(
      Math.max(TEXT_SAFE_AREA_MARGIN, zone.y - TEXT_BLOCK_VERTICAL_GAP) * input.frameH
    );
    const belowY = Math.round(
      Math.min(
        BOTTOM_NOGO_BAND_TOP - TEXT_BLOCK_VERTICAL_GAP,
        zone.y + zone.height + TEXT_BLOCK_VERTICAL_GAP
      ) * input.frameH
    );

    candidates.push({
      x: centerX,
      y: aboveY,
      fontSize: input.fontSize,
      alignment: 8,
      lines: input.lines,
      band: `above_${zone.type}`,
    });
    candidates.push({
      x: centerX,
      y: belowY,
      fontSize: input.fontSize,
      alignment: 2,
      lines: input.lines,
      band: `below_${zone.type}`,
    });
  }

  return candidates;
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
  const baseSlots = [0.28, 0.38, 0.48, 0.58, 0.68, 0.76];

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
  zones?: TextAvoidZone[];
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

    if (input.zones && input.zones.length > 0) {
      candidates.push(
        ...buildAboveBelowObjectCandidates({
          frameW: input.frameW,
          frameH: input.frameH,
          fontSize,
          lines: input.lines,
          zones: input.zones,
        })
      );
    }

    for (const band of RELOCATION_BANDS) {
      const candidateY = Math.round(band.y * input.frameH);
      const candidateX =
        band.alignment === 1
          ? Math.round(TEXT_SAFE_AREA_MARGIN * input.frameW)
          : band.alignment === 3
            ? Math.round((1 - TEXT_SAFE_AREA_MARGIN) * input.frameW)
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
  /** Set when layout was tight and shrink/relocation/fallback was required. */
  tightSpaceWarning?: string;
};

function resolveTightSpaceWarning(input: {
  action: string;
  fontSize: number;
  originalFontSize: number;
  rejectedCount: number;
}): string | undefined {
  const shrunk = input.fontSize < input.originalFontSize * 0.92;
  const relocated =
    input.action.includes("fallback") ||
    input.action.includes("shrink") ||
    input.action.includes("relocated") ||
    input.action.includes("two_pass_");
  if (input.rejectedCount >= 4 || (shrunk && input.action.includes("fallback"))) {
    return "tight_space_layout";
  }
  if (input.rejectedCount >= 2 && (shrunk || relocated)) {
    return "tight_space_font_shrink";
  }
  return undefined;
}

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
    zones: input.zones,
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
      const action = `two_pass_${best.candidate.band ?? "scored"}`;
      return {
        x: best.candidate.x,
        y: best.candidate.y,
        fontSize: best.candidate.fontSize,
        alignment: best.candidate.alignment,
        action,
        box,
        rejected,
        tightSpaceWarning: resolveTightSpaceWarning({
          action,
          fontSize: best.candidate.fontSize,
          originalFontSize: input.fontSize,
          rejectedCount: rejected.length,
        }),
      };
    }
  }

  const shrinkSteps = input.shrinkSteps ?? [0.78, 0.72, 0.66];
  for (const shrink of shrinkSteps) {
    const fontSize = Math.round(input.fontSize * shrink);
    let stackY = Math.round(0.76 * input.frameH);
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
      const action = `fallback_stagger_shrink_${shrink}`;
      return {
        x: Math.round(0.5 * input.frameW),
        y: stackY,
        fontSize,
        alignment: 2,
        action,
        box,
        rejected,
        tightSpaceWarning: resolveTightSpaceWarning({
          action,
          fontSize,
          originalFontSize: input.fontSize,
          rejectedCount: rejected.length,
        }),
      };
    }
    rejected.push({
      reason: check.reason ?? "edge_crowding",
      band: "fallback_stagger",
      score: 0,
    });
  }

  const fallbackY = Math.round(0.86 * input.frameH);
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
  const action = "fallback_bottom_forced";

  return {
    x: Math.round(0.5 * input.frameW),
    y: fallbackY,
    fontSize: fallbackFont,
    alignment: 2,
    action,
    box: fallbackBox,
    rejected,
    tightSpaceWarning: resolveTightSpaceWarning({
      action,
      fontSize: fallbackFont,
      originalFontSize: input.fontSize,
      rejectedCount: rejected.length,
    }) ?? "tight_space_layout",
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
