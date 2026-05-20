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
