import { buildCorrectionRecommendations } from "@/lib/build-correction-recommendations";
import {
  buildCorrectedPrompt,
  recommendationsToPromptPatches,
} from "@/lib/build-corrected-prompt";
import type { SceneCorrectionBundle } from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";

export function buildSceneCorrectionBundle(params: {
  basePrompt: string;
  consistencyReport: SceneConsistencyReport;
}): SceneCorrectionBundle {
  const recommendations = buildCorrectionRecommendations(params.consistencyReport);
  const patches = recommendationsToPromptPatches(recommendations);
  const correctedPrompt = buildCorrectedPrompt(params.basePrompt, patches);

  return {
    recommendations,
    patches,
    correctedPrompt,
    basePrompt: params.basePrompt,
  };
}
