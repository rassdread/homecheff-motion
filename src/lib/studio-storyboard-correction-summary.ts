import { buildCorrectionRecommendations } from "@/lib/build-correction-recommendations";
import type {
  StoryboardCorrectionSummary,
  StoryboardSceneCorrectionSuggestion,
} from "@/types/studio-correction";
import type { SceneConsistencyReport, StoryboardConsistencyReport } from "@/types/studio-consistency";

function sceneAction(score: number | null): StoryboardSceneCorrectionSuggestion["action"] {
  if (score === null) {
    return "ok";
  }
  if (score < 65) {
    return "regenerate";
  }
  if (score < 80) {
    return "review";
  }
  return "ok";
}

export function buildStoryboardCorrectionSummary(params: {
  storyboardId: string;
  consistencyReport: StoryboardConsistencyReport;
}): StoryboardCorrectionSummary {
  const scenes: StoryboardSceneCorrectionSuggestion[] = [];
  let totalRecommendations = 0;

  for (const entry of params.consistencyReport.sceneReports) {
    const report = entry.report;
    const recommendations = report ? buildCorrectionRecommendations(report) : [];
    totalRecommendations += recommendations.length;
    const score = report?.overallScore ?? null;
    const action = sceneAction(score);

    scenes.push({
      sceneId: entry.sceneId,
      sceneTitle: entry.sceneTitle,
      order: entry.order,
      imageId: entry.imageId,
      consistencyScore: score,
      consistencyStatus: report?.consistencyStatus ?? null,
      recommendationCount: recommendations.length,
      action,
      summary:
        action === "regenerate"
          ? `Consistency ${score ?? "—"} — recommended: regenerate`
          : action === "review"
            ? `Consistency ${score ?? "—"} — recommended: review`
            : `Consistency ${score ?? "—"} — on track`,
    });
  }

  return {
    storyboardId: params.storyboardId,
    analyzedAt: new Date().toISOString(),
    consistencyReport: params.consistencyReport,
    scenes,
    totalRecommendations,
    scenesNeedingCorrection: scenes.filter((s) => s.action !== "ok").length,
  };
}

export function buildConsistencyHistoryFromImages(
  images: Array<{
    id: string;
    generationVersion: number;
    consistencyScore: number | null;
    consistencyStatus: string | null;
    improvementScore: number | null;
    correctionRecommendations: unknown;
    createdAt: string;
  }>
): import("@/types/studio-correction").ConsistencyHistoryEntry[] {
  return [...images]
    .sort((a, b) => a.generationVersion - b.generationVersion)
    .map((img) => ({
      imageId: img.id,
      generationVersion: img.generationVersion,
      consistencyScore: img.consistencyScore,
      consistencyStatus: img.consistencyStatus,
      improvementScore: img.improvementScore,
      correctionCount: Array.isArray(img.correctionRecommendations)
        ? img.correctionRecommendations.length
        : 0,
      createdAt: img.createdAt,
    }));
}
