import {
  computeCombinedImageScore,
  isRecommendedSceneImage,
} from "@/lib/studio-combined-image-score";
import type { SceneImageHistoryEntry } from "@/types/studio-improvement";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

export function buildSceneImageHistoryEntries(params: {
  images: StudioSceneImageListItem[];
  selectedImageId: string | null;
}): SceneImageHistoryEntry[] {
  const sorted = [...params.images].sort(
    (a, b) => a.generationVersion - b.generationVersion
  );

  return sorted.map((img) => ({
    imageId: img.id,
    generationVersion: img.generationVersion,
    thumbnailUrl: img.thumbnailUrl || img.imageUrl,
    imageUrl: img.imageUrl,
    consistencyScore: img.consistencyScore,
    visionScore: img.visionScore,
    combinedScore: computeCombinedImageScore({
      visionScore: img.visionScore,
      consistencyScore: img.consistencyScore,
    }),
    improvementScore: img.improvementScore,
    visionImprovementScore: img.visionImprovementScore,
    overallImprovementScore: img.overallImprovementScore,
    isRecommended: isRecommendedSceneImage(img, params.images),
    isSelected: img.id === params.selectedImageId,
    createdAt: img.createdAt,
    status: img.status,
  }));
}

export function rankSceneImagesByCombinedScore(
  images: StudioSceneImageListItem[]
): StudioSceneImageListItem[] {
  return [...images]
    .filter((img) => img.status === "completed")
    .sort((a, b) => {
      const sa =
        computeCombinedImageScore({
          visionScore: a.visionScore,
          consistencyScore: a.consistencyScore,
        }) ?? -1;
      const sb =
        computeCombinedImageScore({
          visionScore: b.visionScore,
          consistencyScore: b.consistencyScore,
        }) ?? -1;
      return sb - sa;
    });
}
