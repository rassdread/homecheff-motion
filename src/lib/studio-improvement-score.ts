import type { CombinedImprovementScore } from "@/types/studio-improvement";
import type { ImprovementScore } from "@/types/studio-correction";

export type { ImprovementScore } from "@/types/studio-correction";

export function computeImprovementScore(
  previousScore: number | null | undefined,
  newScore: number
): ImprovementScore {
  const previous = previousScore ?? null;
  const delta = previous !== null ? newScore - previous : 0;
  return {
    previousScore: previous,
    newScore,
    delta,
    improved: delta > 0,
  };
}

export function computeCombinedImprovementScore(params: {
  previousConsistencyScore: number | null | undefined;
  newConsistencyScore: number;
  previousVisionScore: number | null | undefined;
  newVisionScore: number | null | undefined;
}): CombinedImprovementScore {
  const consistency = computeImprovementScore(
    params.previousConsistencyScore,
    params.newConsistencyScore
  );
  const vision = computeImprovementScore(
    params.previousVisionScore,
    params.newVisionScore ?? params.previousVisionScore ?? 0
  );

  const hasVision =
    params.previousVisionScore !== null &&
    params.previousVisionScore !== undefined &&
    params.newVisionScore !== null &&
    params.newVisionScore !== undefined;

  let overallDelta = consistency.delta;
  if (hasVision) {
    overallDelta = Math.round((consistency.delta + vision.delta) / 2);
  }

  return {
    consistency,
    vision,
    overallDelta,
    improved: overallDelta > 0,
  };
}
