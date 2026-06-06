/**
 * Motion quality prediction before render (heuristic, no provider calls).
 */

import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { analyzeStoryFlow } from "@/lib/studio-story-flow-analyzer";
import { buildStoryHealthAdvisorReport } from "@/lib/studio-story-health-advisor";
import { sceneHasCompletedImage } from "@/lib/studio-movie-scene-image";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

export type MotionQualityLevel = "low" | "medium" | "high";

export type MotionQualityPrediction = {
  level: MotionQualityLevel;
  score: number;
  reasonKeys: string[];
};

export function predictMotionQuality(
  storyboard: StudioStoryboardDetail,
  cast: StudioCharacterListItem[] = []
): MotionQualityPrediction {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const sceneCount = scenes.length;
  const imageCount = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const flow = analyzeStoryFlow(storyboardToFlowInput(storyboard));
  const health = buildStoryHealthAdvisorReport(storyboard, cast);

  let score = 50;
  const reasonKeys: string[] = [];

  if (sceneCount >= 3 && sceneCount <= 10) {
    score += 10;
  } else if (sceneCount < 2) {
    score -= 15;
    reasonKeys.push("studio.aiAssistant.quality.reason.fewScenes");
  }

  const imageRatio = sceneCount === 0 ? 0 : imageCount / sceneCount;
  if (imageRatio >= 1) {
    score += 20;
  } else if (imageRatio >= 0.7) {
    score += 10;
    reasonKeys.push("studio.aiAssistant.quality.reason.missingImages");
  } else {
    score -= 10;
    reasonKeys.push("studio.aiAssistant.quality.reason.missingImages");
  }

  score += Math.round(flow.shotDiversityScore * 0.15);
  if (flow.shotDiversityScore < 45) {
    reasonKeys.push("studio.aiAssistant.quality.reason.lowVariety");
  }

  score += Math.round(health.score * 0.2);
  if (health.score < 55) {
    reasonKeys.push("studio.aiAssistant.quality.reason.storyHealth");
  }

  const textHeavy = scenes.filter((s) => (s.title?.length ?? 0) + (s.description?.length ?? 0) > 120).length;
  if (textHeavy > sceneCount * 0.5 && sceneCount > 0) {
    score -= 5;
    reasonKeys.push("studio.aiAssistant.quality.reason.textHeavy");
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const level: MotionQualityLevel =
    normalized >= 75 ? "high"
    : normalized >= 50 ? "medium"
    : "low";

  if (reasonKeys.length === 0) {
    reasonKeys.push("studio.aiAssistant.quality.reason.good");
  }

  return { level, score: normalized, reasonKeys: [...new Set(reasonKeys)] };
}
