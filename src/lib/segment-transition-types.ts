/** Client-safe segment transition types (no Node/ffmpeg deps). */

export type SegmentTransitionType =
  | "capcut_smooth"
  | "cinematic_blend"
  | "soft_crossfade"
  | "motion_blend"
  | "straight_cut";

export const SEGMENT_TRANSITION_TYPES: readonly SegmentTransitionType[] = [
  "capcut_smooth",
  "cinematic_blend",
  "soft_crossfade",
  "motion_blend",
  "straight_cut",
] as const;

export const DEFAULT_SEGMENT_TRANSITION_TYPE: SegmentTransitionType = "capcut_smooth";

export function isSegmentTransitionType(value: string): value is SegmentTransitionType {
  return (SEGMENT_TRANSITION_TYPES as readonly string[]).includes(value);
}

export function normalizeSegmentTransitionType(value: unknown): SegmentTransitionType {
  if (typeof value === "string" && isSegmentTransitionType(value.trim())) {
    return value.trim() as SegmentTransitionType;
  }
  return DEFAULT_SEGMENT_TRANSITION_TYPE;
}

/** Vidu hint for invisible segment joins (overlap anchor A→B→C preserved in FFmpeg). */
export function buildSegmentTransitionContinuityBlock(
  transitionType: SegmentTransitionType
): string {
  if (transitionType === "straight_cut") {
    return "";
  }
  const style =
    transitionType === "capcut_smooth"
      ? "invisible CapCut-style join: preserve outgoing momentum into incoming frame, optical continuity, no hard reset."
      : transitionType === "cinematic_blend"
        ? "cinematic cross-dissolve energy with matched lighting direction between segments."
        : "soft crossfade with frame and motion continuity — no slideshow jump.";
  return `SEGMENT TRANSITION CONTINUITY (${transitionType}):
- ${style}
- Continue subject velocity and expression from prior segment; prepare next keyframe without a standalone-clip feel.`;
}
