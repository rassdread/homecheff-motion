import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import {
  buildCorrectedPrompt,
  recommendationsToPromptPatches,
} from "@/lib/build-corrected-prompt";
import type { SceneCorrectionBundle } from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

export function buildSceneCorrectionBundle(params: {
  basePrompt: string;
  consistencyReport: SceneConsistencyReport;
  visionReport?: VisionConsistencyReport | null;
}): SceneCorrectionBundle {
  const recommendations = buildCombinedCorrectionRecommendations({
    consistencyReport: params.consistencyReport,
    visionReport: params.visionReport,
  });
  const patches = recommendationsToPromptPatches(recommendations);
  const correctedPrompt = buildCorrectedPrompt(params.basePrompt, patches);

  return {
    recommendations,
    patches,
    correctedPrompt,
    basePrompt: params.basePrompt,
  };
}
