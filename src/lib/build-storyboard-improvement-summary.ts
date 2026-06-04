import { buildCombinedCorrectionRecommendations } from "@/lib/build-combined-correction-recommendations";
import { buildRegenerationRecommendation } from "@/lib/build-regeneration-recommendation";
import { computeCombinedImageScore } from "@/lib/studio-combined-image-score";
import type { StoryboardImprovementSummary } from "@/types/studio-improvement";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

export function buildStoryboardImprovementSummary(params: {
  storyboardId: string;
  scenes: Array<{
    sceneId: string;
    sceneTitle: string;
    order: number;
    selectedSceneImageId: string | null;
    image: StudioSceneImageListItem | null;
    consistencyReport: SceneConsistencyReport | null;
    visionReport: VisionConsistencyReport | null;
  }>;
}): StoryboardImprovementSummary {
  const entries = params.scenes.map((scene) => {
    const image = scene.image;
    const recommendations =
      image && scene.consistencyReport
        ? buildCombinedCorrectionRecommendations({
            consistencyReport: scene.consistencyReport,
            visionReport: scene.visionReport,
          })
        : [];

    const regeneration = image
      ? buildRegenerationRecommendation({
          image,
          consistencyReport: scene.consistencyReport,
          visionReport: scene.visionReport,
          recommendations,
        })
      : {
          shouldRegenerate: false,
          reason: "No completed image",
          severity: "low" as const,
          confidence: 0,
          suggestedPromptPatches: [],
          action: "ok" as const,
        };

    return {
      sceneId: scene.sceneId,
      sceneTitle: scene.sceneTitle,
      order: scene.order,
      imageId: image?.id ?? null,
      consistencyScore: image?.consistencyScore ?? null,
      visionScore: image?.visionScore ?? null,
      combinedScore: image
        ? computeCombinedImageScore({
            visionScore: image.visionScore,
            consistencyScore: image.consistencyScore,
          })
        : null,
      regeneration,
      recommendationCount: recommendations.length,
    };
  });

  const scenesNeedingImprovement = entries.filter(
    (e) => e.regeneration.action !== "ok"
  ).length;

  return {
    storyboardId: params.storyboardId,
    analyzedAt: new Date().toISOString(),
    scenes: entries,
    scenesNeedingImprovement,
  };
}
