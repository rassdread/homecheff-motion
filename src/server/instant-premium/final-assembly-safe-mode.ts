/**
 * Debug / recovery assembly modes (env-driven).
 */

import type { SegmentTransitionType } from "@/lib/segment-transition-types";

export const FINAL_ASSEMBLY_SAFE_MODE_ENV = "FINAL_ASSEMBLY_SAFE_MODE";

export type FinalAssemblySafeMode = "plain_concat";

export function readFinalAssemblySafeMode(): FinalAssemblySafeMode | null {
  const raw = process.env[FINAL_ASSEMBLY_SAFE_MODE_ENV]?.trim().toLowerCase();
  if (raw === "plain_concat") {
    return "plain_concat";
  }
  return null;
}

export function isPlainConcatSafeMode(): boolean {
  return readFinalAssemblySafeMode() === "plain_concat";
}

/** Plain concat: straight cut, no edge trim, no join plans, no xfade. */
export function resolveSafeModeSegmentTransitionType(
  defaultType: SegmentTransitionType
): SegmentTransitionType {
  if (isPlainConcatSafeMode()) {
    return "straight_cut";
  }
  return defaultType;
}
