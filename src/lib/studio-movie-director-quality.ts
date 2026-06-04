import { interpretAiDirectorPrompt } from "@/lib/studio-ai-director-interpreter";
import {
  computeDirectorQualityScore,
  computeStyleConsistencyScore,
} from "@/lib/studio-ai-director-direction";
import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { analyzeStoryFlow, type StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type DirectorQualityTier = "weak" | "fair" | "good" | "strong";

export type DirectorQualityReport = {
  tier: DirectorQualityTier;
  shotDiversityScore: number;
  storyHealthScore: number;
  styleConsistencyScore: number;
  directorQualityScore: number;
  warningCount: number;
  scenesMissingShot: number;
  recommendationKeys: string[];
};

function tierFromScore(score: number, warningCount: number, missingRatio: number): DirectorQualityTier {
  if (missingRatio > 0.5 || score < 25) {
    return "weak";
  }
  if (warningCount > 2 || score < 45) {
    return "fair";
  }
  if (score >= 75 && warningCount === 0) {
    return "strong";
  }
  if (score >= 55) {
    return "good";
  }
  return "fair";
}

export function storyboardToFlowInput(storyboard: StudioStoryboardDetail): StoryFlowSceneInput[] {
  return storyboard.scenes.map((scene) => ({
    sceneId: scene.id,
    order: scene.order,
    title: scene.title,
    shotType: scene.shotType,
    cameraMovement: scene.cameraMovement,
    sceneEnergy: scene.sceneEnergy,
    camera: scene.camera,
  }));
}

export function buildDirectorQualityReport(
  storyboard: StudioStoryboardDetail
): DirectorQualityReport {
  const scenes = storyboardToFlowInput(storyboard);
  const analysis = analyzeStoryFlow(scenes);
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const intelligence = analyzeStoryIntelligence(scenes, directorProfile);
  const aiPrompt = storyboard.aiDirectorPrompt?.trim() ?? "";
  const interpretation = interpretAiDirectorPrompt(aiPrompt || directorProfile);
  const aiPlan = buildAutoShotPlan(scenes, interpretation.directorProfile);
  const styleConsistencyScore = computeStyleConsistencyScore(aiPlan, interpretation);
  const directorQualityScore = computeDirectorQualityScore({
    shotDiversityScore: analysis.shotDiversityScore,
    storyHealthScore: intelligence.storyHealthScore,
    styleConsistencyScore,
    energyFlowScore: intelligence.healthFactors.energyFlow,
  });
  const missingShot = scenes.filter((s) => !s.shotType && !s.camera?.trim()).length;
  const missingRatio = scenes.length === 0 ? 1 : missingShot / scenes.length;

  const recommendationKeys: string[] = [];
  if (missingShot > 0) {
    recommendationKeys.push("studio.director.movie.recommend.assignShots");
  }
  if (analysis.shotDiversityScore < 50) {
    recommendationKeys.push("studio.director.movie.recommend.diversify");
  }
  if (intelligence.storyHealthScore < 50) {
    recommendationKeys.push("studio.intelligence.movie.recommend.health");
  }
  if (styleConsistencyScore < 45 && aiPrompt) {
    recommendationKeys.push("studio.aiDirector.recommend.style");
  }
  for (const warning of intelligence.warnings.slice(0, 6)) {
    recommendationKeys.push(warning.messageKey);
  }

  return {
    tier: tierFromScore(directorQualityScore, intelligence.warnings.length, missingRatio),
    shotDiversityScore: analysis.shotDiversityScore,
    storyHealthScore: intelligence.storyHealthScore,
    styleConsistencyScore,
    directorQualityScore,
    warningCount: intelligence.warnings.length,
    scenesMissingShot: missingShot,
    recommendationKeys: [...new Set(recommendationKeys)],
  };
}
