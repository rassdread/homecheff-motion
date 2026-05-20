/**
 * Exact frame continuity — shared keyframe between segments = continuation, not restart.
 */

export const EXACT_FRAME_CONTINUITY_THRESHOLD = 0.995;
export const EXPOSURE_MISMATCH_FORCE_NORMALIZE = 0.08;

export type FrameContinuityMode = "continuation" | "normal";

export type KeyframePairInput = {
  endImageId: string;
  startImageId: string;
  endPreviewUrl?: string | null;
  startPreviewUrl?: string | null;
};

export type KeyframePairScore = {
  similarity: number;
  mode: FrameContinuityMode;
  reason: string;
  phashSimilarity?: number;
  ssimScore?: number;
  exposureDelta?: number;
};

export type SegmentJoinPlan = {
  segmentA: number;
  segmentB: number;
  similarity: number;
  mode: FrameContinuityMode;
  mergeDissolveRatio: number;
  transitionSec: number;
  mergeType: string;
  reason: string;
  exposureDelta?: number;
};

/** Quick identity check (no pixels). */
export function scoreKeyframePairQuick(input: KeyframePairInput): KeyframePairScore {
  if (input.endImageId === input.startImageId) {
    return {
      similarity: 1,
      mode: "continuation",
      reason: "same_image_id",
    };
  }
  const endUrl = input.endPreviewUrl?.trim() ?? "";
  const startUrl = input.startPreviewUrl?.trim() ?? "";
  if (endUrl && startUrl && endUrl === startUrl) {
    return {
      similarity: 1,
      mode: "continuation",
      reason: "same_preview_url",
    };
  }
  return {
    similarity: 0,
    mode: "normal",
    reason: "different_keyframes_pending_pixels",
  };
}

export function combinePixelSimilarity(phashSimilarity: number, ssimScore: number): number {
  const p = Math.max(0, Math.min(1, phashSimilarity));
  const s = Math.max(0, Math.min(1, ssimScore));
  return p * 0.55 + s * 0.45;
}

export function resolveFrameContinuityMode(similarity: number): FrameContinuityMode {
  return similarity >= EXACT_FRAME_CONTINUITY_THRESHOLD ? "continuation" : "normal";
}

export function resolveMergeDissolveRatio(similarity: number): number {
  if (similarity >= 0.998) {
    return 0.05;
  }
  if (similarity >= 0.995) {
    return 0.1;
  }
  if (similarity >= 0.99) {
    return 0.22;
  }
  return 0.4;
}

export function resolveMergeTypeLabel(similarity: number): string {
  if (similarity >= 0.998) {
    return "direct_stitch_micro_blend";
  }
  if (similarity >= 0.995) {
    return "motion_aware_stitch";
  }
  if (similarity >= 0.99) {
    return "light_dissolve";
  }
  return "normal_transition";
}

/** Scale capcut_smooth (or base) transition duration by similarity — lower dissolve when frames match. */
export function transitionSecondsForSimilarity(
  baseTransitionSec: number,
  similarity: number,
  fps = 30
): number {
  const ratio = resolveMergeDissolveRatio(similarity);
  const scaled = baseTransitionSec * ratio;
  return Math.max(1 / fps, Math.min(baseTransitionSec, scaled));
}

export function buildSegmentJoinPlan(params: {
  segmentA: number;
  segmentB: number;
  score: KeyframePairScore;
  baseTransitionSec: number;
  fps?: number;
}): SegmentJoinPlan {
  const { segmentA, segmentB, score, baseTransitionSec, fps = 30 } = params;
  const similarity = Math.max(0, Math.min(1, score.similarity));
  const mode = resolveFrameContinuityMode(similarity);
  const mergeDissolveRatio = resolveMergeDissolveRatio(similarity);
  const transitionSec = transitionSecondsForSimilarity(baseTransitionSec, similarity, fps);
  return {
    segmentA,
    segmentB,
    similarity,
    mode,
    mergeDissolveRatio,
    transitionSec,
    mergeType: resolveMergeTypeLabel(similarity),
    reason: score.reason,
    exposureDelta: score.exposureDelta,
  };
}

/** Compact Vidu line (priority 1/2) — only when continuation mode. */
export const EXACT_FRAME_CONTINUATION_PROMPT_LINE =
  "EXACT FRAME CONTINUATION: Continue existing motion, lighting, atmosphere, and camera momentum from the previous scene — do not reset or restart the world; keep the same flow, speed, energy, and direction.";

export function buildExactFrameContinuationPromptLine(mode: FrameContinuityMode): string {
  return mode === "continuation" ? EXACT_FRAME_CONTINUATION_PROMPT_LINE : "";
}

export function shouldForceExposureNormalize(exposureDelta: number | undefined): boolean {
  return (
    typeof exposureDelta === "number" &&
    Number.isFinite(exposureDelta) &&
    exposureDelta > EXPOSURE_MISMATCH_FORCE_NORMALIZE
  );
}
