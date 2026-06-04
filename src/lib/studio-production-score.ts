/**
 * Studio V28/V29 — combined production readiness and overall score.
 */

import { buildDirectorQualityReport } from "@/lib/studio-movie-director-quality";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import {
  buildAssetReadiness,
  buildProductionWarnings,
  computeReadinessScore,
} from "@/lib/studio-production-readiness";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type ProductionQualityLabel =
  | "needs_work"
  | "good"
  | "strong"
  | "production_ready";

export type ProductionScoreReport = {
  visualScore: number;
  storyScore: number;
  directorScore: number;
  voiceScore: number;
  readinessScore: number;
  overallProductionScore: number;
  qualityLabel: ProductionQualityLabel;
  qualityLabelKey: string;
  voiceEnabled: boolean;
};

export function resolveProductionQualityLabel(
  score: number,
  blockingWarnings: number
): { label: ProductionQualityLabel; labelKey: string } {
  if (blockingWarnings > 0 || score < 40) {
    return {
      label: "needs_work",
      labelKey: "studio.production.quality.needsWork",
    };
  }
  if (score >= 82) {
    return {
      label: "production_ready",
      labelKey: "studio.production.quality.productionReady",
    };
  }
  if (score >= 68) {
    return {
      label: "strong",
      labelKey: "studio.production.quality.strong",
    };
  }
  if (score >= 52) {
    return {
      label: "good",
      labelKey: "studio.production.quality.good",
    };
  }
  return {
    label: "needs_work",
    labelKey: "studio.production.quality.needsWork",
  };
}

export function computeOverallProductionScore(params: {
  storyScore: number;
  directorScore: number;
  voiceScore: number;
  visualScore: number;
  readinessScore: number;
  voiceEnabled: boolean;
}): number {
  const voiceWeight = params.voiceEnabled ? 0.15 : 0;
  const storyW = 0.22 * (1 - voiceWeight * 0.3);
  const directorW = 0.22 * (1 - voiceWeight * 0.3);
  const visualW = 0.22 * (1 - voiceWeight * 0.3);
  const readinessW = 0.18 * (1 - voiceWeight * 0.3);
  const voiceW = voiceWeight;

  const raw =
    params.storyScore * storyW +
    params.directorScore * directorW +
    params.visualScore * visualW +
    params.readinessScore * readinessW +
    params.voiceScore * voiceW;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function buildProductionScoreReport(storyboard: StudioStoryboardDetail): ProductionScoreReport {
  const directorReport = buildDirectorQualityReport(storyboard);
  const imagePlan = analyzeSceneImagePlanner({ storyboard });
  const voiceReport = analyzeVoiceDirector(storyboard);
  const assets = buildAssetReadiness(storyboard);
  const warnings = buildProductionWarnings(storyboard);
  const blockingCount = warnings.filter((w) => w.severity === "blocking").length;

  const visualScore = imagePlan.visualConsistencyScore;
  const storyScore = directorReport.storyHealthScore;
  const directorScore = directorReport.directorQualityScore;
  const voiceScore = voiceReport.voiceScore;
  const readinessScore = computeReadinessScore({
    assetItems: assets,
    warningCount: warnings.filter((w) => w.severity === "warning").length,
    blockingCount,
  });

  const overallProductionScore = computeOverallProductionScore({
    storyScore,
    directorScore,
    voiceScore,
    visualScore,
    readinessScore,
    voiceEnabled: voiceReport.enabled,
  });

  const { label, labelKey } = resolveProductionQualityLabel(
    overallProductionScore,
    blockingCount
  );

  return {
    visualScore,
    storyScore,
    directorScore,
    voiceScore,
    readinessScore,
    overallProductionScore,
    qualityLabel: label,
    qualityLabelKey: labelKey,
    voiceEnabled: voiceReport.enabled,
  };
}
