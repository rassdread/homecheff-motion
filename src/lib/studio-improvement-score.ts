import type { ImprovementScore } from "@/types/studio-correction";

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
