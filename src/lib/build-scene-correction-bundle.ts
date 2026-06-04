import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import {
  buildCorrectedPrompt,
  recommendationsToPromptPatches,
} from "@/lib/build-corrected-prompt";
import type {
  CorrectionRecommendation,
  SceneCorrectionBundle,
} from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

export function buildSceneCorrectionBundle(params: {
  basePrompt: string;
  consistencyReport: SceneConsistencyReport;
  visionReport?: VisionConsistencyReport | null;
  characterDriftRecommendations?: CorrectionRecommendation[];
}): SceneCorrectionBundle {
  const recommendations = buildCombinedCorrectionRecommendations({
    consistencyReport: params.consistencyReport,
    visionReport: params.visionReport,
    characterDriftRecommendations: params.characterDriftRecommendations,
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
