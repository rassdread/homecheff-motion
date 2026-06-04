import { buildStoryboardImprovementSummary } from "@/lib/build-storyboard-improvement-summary";
import { buildCharacterReportFromStoryboardDetail } from "@/lib/studio-character-timeline";
import { buildMoviePrepareChecklist } from "@/lib/studio-movie-prepare-checklist";
import {
  resolveSceneDisplayImage,
  sceneHasCompletedImage,
} from "@/lib/studio-movie-scene-image";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { MovieReadinessScore, MovieReadinessTier } from "@/types/studio-movie-builder";

function average(nums: number[]): number | null {
  if (nums.length === 0) {
    return null;
  }
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function tierFromSignals(params: {
  prepareReady: boolean;
  imageRatio: number;
  selectedRatio: number;
  avgVision: number | null;
  avgConsistency: number | null;
  avgCharacterIdentity: number | null;
  characterDriftWarnings: number;
  criticalWarnings: number;
  weakScenes: number;
}): MovieReadinessTier {
  if (!params.prepareReady || params.imageRatio < 0.5) {
    return "not_ready";
  }
  if (
    params.weakScenes > 0 ||
    params.criticalWarnings > 0 ||
    params.characterDriftWarnings > 2 ||
    (params.avgCharacterIdentity !== null && params.avgCharacterIdentity < 55) ||
    params.selectedRatio < 1 ||
    (params.avgVision !== null && params.avgVision < 65) ||
    (params.avgConsistency !== null && params.avgConsistency < 65)
  ) {
    return "needs_review";
  }
  if (
    params.imageRatio >= 1 &&
    params.selectedRatio >= 1 &&
    (params.avgVision === null || params.avgVision >= 80) &&
    (params.avgConsistency === null || params.avgConsistency >= 80) &&
    params.weakScenes === 0
  ) {
    return "strong";
  }
  if (params.imageRatio >= 1 && params.selectedRatio >= 1) {
    return "ready";
  }
  return "needs_review";
}

export function computeMovieReadinessScore(
  storyboard: StudioStoryboardDetail
): MovieReadinessScore {
  const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
  const totalScenes = scenes.length;
  const prepare = buildMoviePrepareChecklist(storyboard);

  const imagesReady = scenes.filter((s) => sceneHasCompletedImage(s)).length;
  const imageAvailabilityScore =
    totalScenes === 0 ? 0 : Math.round((imagesReady / totalScenes) * 100);

  const visionScores: number[] = [];
  const consistencyScores: number[] = [];
  let criticalWarningCount = 0;

  for (const scene of scenes) {
    const img = resolveSceneDisplayImage(scene);
    if (img && img.visionScore !== null && img.visionScore !== undefined) {
      visionScores.push(img.visionScore);
    }
    if (img && img.consistencyScore !== null && img.consistencyScore !== undefined) {
      consistencyScores.push(img.consistencyScore);
    }
    if (img?.visionStatus === "poor" || img?.consistencyStatus === "poor") {
      criticalWarningCount += 1;
    }
    if (img?.correctionRecommendations?.some((r) => r.severity === "critical")) {
      criticalWarningCount += 1;
    }
  }

  const improvement = buildStoryboardImprovementSummary({
    storyboardId: storyboard.id,
    scenes: scenes.map((scene) => {
      const img = resolveSceneDisplayImage(scene);
      return {
        sceneId: scene.id,
        sceneTitle: scene.title,
        order: scene.order,
        selectedSceneImageId: scene.selectedSceneImageId,
        image: img,
        consistencyReport: img?.consistencyReport ?? null,
        visionReport: img?.visionReport ?? null,
      };
    }),
  });

  const unresolvedWeakSceneCount = improvement.scenesNeedingImprovement;

  const scenesWithSelected = scenes.filter((s) => {
    if (!s.selectedSceneImageId) {
      return false;
    }
    const sel = s.sceneImages.find((img) => img.id === s.selectedSceneImageId);
    return sel?.status === "completed";
  }).length;

  const sceneCompletenessScore = prepare.ready ? 100 : Math.round((prepare.items.filter((i) => i.passed).length / prepare.items.length) * 100);

  const averageVisionScore = average(visionScores);
  const averageConsistencyScore = average(consistencyScores);
  const characterReport = buildCharacterReportFromStoryboardDetail(storyboard);
  const averageCharacterIdentityScore = characterReport.overallCharacterConsistencyScore;
  const characterDriftWarningCount = characterReport.driftWarnings.length;

  const tier = tierFromSignals({
    prepareReady: prepare.ready,
    imageRatio: totalScenes === 0 ? 0 : imagesReady / totalScenes,
    selectedRatio: totalScenes === 0 ? 0 : scenesWithSelected / totalScenes,
    avgVision: averageVisionScore,
    avgConsistency: averageConsistencyScore,
    avgCharacterIdentity: averageCharacterIdentityScore,
    characterDriftWarnings: characterDriftWarningCount,
    criticalWarnings: criticalWarningCount,
    weakScenes: unresolvedWeakSceneCount,
  });

  const score = Math.round(
    sceneCompletenessScore * 0.18 +
      imageAvailabilityScore * 0.22 +
      (totalScenes === 0 ? 0 : (scenesWithSelected / totalScenes) * 100) * 0.22 +
      (averageVisionScore ?? 50) * 0.12 +
      (averageConsistencyScore ?? 50) * 0.12 +
      averageCharacterIdentityScore * 0.14 -
      criticalWarningCount * 5 -
      unresolvedWeakSceneCount * 3 -
      characterDriftWarningCount * 2
  );

  return {
    tier,
    score: Math.min(100, Math.max(0, score)),
    sceneCompletenessScore,
    imageAvailabilityScore,
    averageVisionScore,
    averageConsistencyScore,
    averageCharacterIdentityScore,
    characterDriftWarningCount,
    selectedImagesCount: scenesWithSelected,
    scenesWithSelectedImage: scenesWithSelected,
    totalScenes,
    criticalWarningCount,
    unresolvedWeakSceneCount,
  };
}

export function isMotionHandoffReady(storyboard: StudioStoryboardDetail): boolean {
  const scenes = storyboard.scenes;
  if (scenes.length === 0) {
    return false;
  }
  return scenes.every((s) => {
    if (!s.selectedSceneImageId) {
      return false;
    }
    const sel = s.sceneImages.find((img) => img.id === s.selectedSceneImageId);
    return sel?.status === "completed" && Boolean(sel.imageUrl?.trim());
  });
}
