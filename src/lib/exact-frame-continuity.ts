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
  luminanceEnd?: number;
  luminanceStart?: number;
};

export type SegmentJoinMode =
  | "direct_micro_stitch"
  | "optical_micro_blend"
  | "soft_continuation"
  | "normal_capcut_smooth";

export type SegmentJoinPlan = {
  segmentA: number;
  segmentB: number;
  similarity: number;
  mode: FrameContinuityMode;
  joinMode: SegmentJoinMode;
  mergeDissolveRatio: number;
  transitionSec: number;
  mergeType: string;
  reason: string;
  exposureDelta?: number;
  applyExposureCorrection?: boolean;
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

export function resolveSegmentJoinMode(similarity: number): SegmentJoinMode {
  if (similarity >= 0.998) {
    return "direct_micro_stitch";
  }
  if (similarity >= 0.995) {
    return "optical_micro_blend";
  }
  if (similarity >= 0.99) {
    return "soft_continuation";
  }
  return "normal_capcut_smooth";
}

export function resolveMergeDissolveRatio(similarity: number): number {
  const mode = resolveSegmentJoinMode(similarity);
  switch (mode) {
    case "direct_micro_stitch":
      return 0.02;
    case "optical_micro_blend":
      return 0.08;
    case "soft_continuation":
      return 0.2;
    default:
      return 0.4;
  }
}

export function resolveMergeTypeLabel(similarity: number): string {
  return resolveSegmentJoinMode(similarity);
}

/** Per-join transition duration — near-zero xfade for identical keyframes. */
export function transitionSecondsForJoinMode(
  baseTransitionSec: number,
  joinMode: SegmentJoinMode,
  fps = 30
): number {
  switch (joinMode) {
    case "direct_micro_stitch":
      return 1 / fps;
    case "optical_micro_blend":
      return Math.max(2 / fps, baseTransitionSec * 0.1);
    case "soft_continuation":
      return Math.max(3 / fps, baseTransitionSec * 0.3);
    default:
      return baseTransitionSec;
  }
}

/** Scale capcut_smooth (or base) transition duration by similarity — lower dissolve when frames match. */
export function transitionSecondsForSimilarity(
  baseTransitionSec: number,
  similarity: number,
  fps = 30
): number {
  return transitionSecondsForJoinMode(
    baseTransitionSec,
    resolveSegmentJoinMode(similarity),
    fps
  );
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
  const joinMode = resolveSegmentJoinMode(similarity);
  const mergeDissolveRatio = resolveMergeDissolveRatio(similarity);
  const transitionSec = transitionSecondsForJoinMode(baseTransitionSec, joinMode, fps);
  const exposureDelta = score.exposureDelta;
  return {
    segmentA,
    segmentB,
    similarity,
    mode,
    joinMode,
    mergeDissolveRatio,
    transitionSec,
    mergeType: resolveMergeTypeLabel(similarity),
    reason: score.reason,
    exposureDelta,
    applyExposureCorrection: shouldApplyJoinExposureCorrection(score),
  };
}

export function shouldApplyJoinExposureCorrection(score: KeyframePairScore): boolean {
  if (
    typeof score.luminanceEnd === "number" &&
    typeof score.luminanceStart === "number" &&
    Number.isFinite(score.luminanceEnd) &&
    Number.isFinite(score.luminanceStart)
  ) {
    const delta = Math.abs(score.luminanceEnd - score.luminanceStart);
    return delta >= 0.03 || shouldForceExposureNormalize(delta);
  }
  return (
    typeof score.exposureDelta === "number" &&
    Number.isFinite(score.exposureDelta) &&
    (score.exposureDelta >= 0.03 || shouldForceExposureNormalize(score.exposureDelta))
  );
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
