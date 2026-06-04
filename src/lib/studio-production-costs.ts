/**
 * Studio V29 — production cost estimation (planning constants, no provider calls).
 */

import { estimateVoiceCredits } from "@/lib/elevenlabs-voice";
import type { StudioStoryboardDetail } from "@/types/studio-api";

/** Configurable planning constants (EUR). */
export const PRODUCTION_COST_CONSTANTS = {
  eurPerImage: 0.04,
  eurPerVoiceCredit: 0.02,
  eurPerVideoSecond: 0.012,
  defaultImagesPerScene: 1,
} as const;

export type ProductionCostBreakdown = {
  imageCount: number;
  imageCostEur: number;
  voiceDurationSeconds: number;
  voiceCredits: number;
  voiceCostEur: number;
  videoDurationSeconds: number;
  videoCostEur: number;
  totalCostEur: number;
  openAiImageEstimateLabel: string;
  elevenLabsVoiceEstimateLabel: string;
  viduVideoEstimateLabel: string;
};

function roundEur(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimateVideoDurationSeconds(storyboard: StudioStoryboardDetail): number {
  const scenes = storyboard.scenes ?? [];
  if (scenes.length === 0) {
    return 0;
  }
  const total = scenes.reduce((sum, s) => sum + (s.durationSeconds > 0 ? s.durationSeconds : 5), 0);
  const transitions = Math.max(0, scenes.length - 1);
  return total + transitions;
}

export function estimateImageCount(
  storyboard: StudioStoryboardDetail,
  options?: { imagesPerScene?: number }
): number {
  const perScene = options?.imagesPerScene ?? PRODUCTION_COST_CONSTANTS.defaultImagesPerScene;
  return Math.max(0, (storyboard.scenes?.length ?? 0) * perScene);
}

export function buildProductionCostBreakdown(params: {
  storyboard: StudioStoryboardDetail;
  voiceDurationSeconds: number;
  voiceScriptCharacters?: number;
  imagesPerScene?: number;
}): ProductionCostBreakdown {
  const imageCount = estimateImageCount(params.storyboard, {
    imagesPerScene: params.imagesPerScene,
  });
  const imageCostEur = roundEur(imageCount * PRODUCTION_COST_CONSTANTS.eurPerImage);

  const voiceDurationSeconds = Math.max(0, params.voiceDurationSeconds);
  const voiceCredits = estimateVoiceCredits(
    params.voiceScriptCharacters ?? Math.round(voiceDurationSeconds * 12)
  ).estimatedCredits;
  const voiceCostEur = roundEur(voiceCredits * PRODUCTION_COST_CONSTANTS.eurPerVoiceCredit);

  const videoDurationSeconds = estimateVideoDurationSeconds(params.storyboard);
  const videoCostEur = roundEur(
    videoDurationSeconds * PRODUCTION_COST_CONSTANTS.eurPerVideoSecond
  );

  const totalCostEur = roundEur(imageCostEur + voiceCostEur + videoCostEur);

  return {
    imageCount,
    imageCostEur,
    voiceDurationSeconds,
    voiceCredits,
    voiceCostEur,
    videoDurationSeconds,
    videoCostEur,
    totalCostEur,
    openAiImageEstimateLabel: `${imageCount} images`,
    elevenLabsVoiceEstimateLabel: formatDurationMinutes(voiceDurationSeconds),
    viduVideoEstimateLabel: formatDurationSeconds(videoDurationSeconds),
  };
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)} sec`;
  }
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.round(totalSeconds % 60);
  return sec > 0 ? `${min} min ${sec}s` : `${min} min`;
}

export function formatDurationMinutes(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${(totalSeconds / 60).toFixed(1)} min`;
  }
  const min = totalSeconds / 60;
  return `${min.toFixed(1)} min`;
}

export function formatCostEur(total: number): string {
  return `€${total.toFixed(2)}`;
}
