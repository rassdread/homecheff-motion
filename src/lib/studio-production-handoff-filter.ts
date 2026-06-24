/**
 * Filter Motion handoff scenes for production batch execution.
 */

import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export function filterMotionHandoffBySceneIndices(
  payload: MotionHandoffPayload,
  sceneIndices: number[]
): MotionHandoffPayload {
  const sorted = [...payload.scenes].sort((a, b) => a.order - b.order);
  const indexSet = new Set(sceneIndices.filter((i) => Number.isInteger(i) && i >= 0));
  const filtered = sorted.filter((_, index) => indexSet.has(index));
  return {
    ...payload,
    scenes: filtered.map((scene, order) => ({ ...scene, order })),
  };
}
