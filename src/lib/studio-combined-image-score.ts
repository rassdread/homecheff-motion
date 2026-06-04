import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

const VISION_WEIGHT = 0.6;
const CONSISTENCY_WEIGHT = 0.4;

export function computeCombinedImageScore(params: {
  visionScore: number | null | undefined;
  consistencyScore: number | null | undefined;
}): number | null {
  const vision = params.visionScore;
  const consistency = params.consistencyScore;
  if (vision === null || vision === undefined) {
    if (consistency === null || consistency === undefined) {
      return null;
    }
    return consistency;
  }
  if (consistency === null || consistency === undefined) {
    return Math.round(vision);
  }
  return Math.round(vision * VISION_WEIGHT + consistency * CONSISTENCY_WEIGHT);
}

export function pickRecommendedSceneImage(
  images: StudioSceneImageListItem[]
): StudioSceneImageListItem | null {
  const completed = images.filter((img) => img.status === "completed");
  if (completed.length === 0) {
    return null;
  }
  let best: StudioSceneImageListItem | null = null;
  let bestScore = -1;
  for (const img of completed) {
    const score = computeCombinedImageScore({
      visionScore: img.visionScore,
      consistencyScore: img.consistencyScore,
    });
    if (score !== null && score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  return best;
}

export function isRecommendedSceneImage(
  image: StudioSceneImageListItem,
  images: StudioSceneImageListItem[]
): boolean {
  const recommended = pickRecommendedSceneImage(images);
  return recommended?.id === image.id;
}
