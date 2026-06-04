/**
 * Studio V28 — combined production readiness (visual, story, director, voice).
 */

import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type ProductionScoreReport = {
  visualScore: number;
  storyScore: number;
  directorScore: number;
  voiceScore: number;
  overallProductionScore: number;
  voiceEnabled: boolean;
};

export function computeOverallProductionScore(params: {
  visualScore: number;
  storyScore: number;
  directorScore: number;
  voiceScore: number;
  voiceEnabled: boolean;
}): number {
  const voiceWeight = params.voiceEnabled ? 0.2 : 0;
  const remaining = 1 - voiceWeight;
  const visual = params.visualScore * remaining * 0.28;
  const story = params.storyScore * remaining * 0.36;
  const director = params.directorScore * remaining * 0.36;
  const voice = params.voiceScore * voiceWeight;
  return Math.max(0, Math.min(100, Math.round(visual + story + director + voice)));
}

export function buildProductionScoreReport(storyboard: StudioStoryboardDetail): ProductionScoreReport {
  const directorReport = buildDirectorQualityReport(storyboard);
  const imagePlan = analyzeSceneImagePlanner({ storyboard });
  const voiceReport = analyzeVoiceDirector(storyboard);

  const visualScore = imagePlan.visualConsistencyScore;
  const storyScore = directorReport.storyHealthScore;
  const directorScore = directorReport.directorQualityScore;
  const voiceScore = voiceReport.voiceScore;

  return {
    visualScore,
    storyScore,
    directorScore,
    voiceScore,
    voiceEnabled: voiceReport.enabled,
    overallProductionScore: computeOverallProductionScore({
      visualScore,
      storyScore,
      directorScore,
      voiceScore,
      voiceEnabled: voiceReport.enabled,
    }),
  };
}
