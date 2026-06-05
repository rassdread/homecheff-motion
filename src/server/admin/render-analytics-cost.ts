import {
  CREDIT_USD,
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { estimateMonthlyStorageCostUsd } from "@/lib/blob-storage-pricing";
import type { CostEstimateMeta, PeriodCostSummary } from "@/types/render-analytics";

/** Rough OpenAI vision/OCR cost per project that uses text detection. */
export const OPENAI_OCR_ESTIMATE_USD = 0.012;

/** Internal merge / FFmpeg — negligible direct API cost. */
export const INTERNAL_MERGE_ESTIMATE_USD = 0.001;

/** Baseline Vercel/hosting estimate when no billing API is available. */
export const INFRA_BASELINE_USD_PER_MONTH = 20;

export function buildCostMeta(hasEstimatedCredits: boolean): CostEstimateMeta {
  return {
    isEstimated: hasEstimatedCredits,
    basis:
      "Render: creditsUsed × $0.005/credit (exact from balance delta when logged, else preset/duration estimate). Storage: Vercel Blob $0.15/GB/mo.",
    currency: "USD",
  };
}

export type ProjectCostInput = {
  presetId: string;
  estimatedCredits: number | null;
  viduDurationSeconds: number | null;
  instantTransitionSeconds: number;
  instantOutputDurationSeconds: number | null;
  imageCount?: number;
};

export function resolvePresetId(presetId: string): AnimationPresetId {
  return validateAnimationPresetId(presetId) ? presetId : "standard";
}

export function estimateCreditsPerTransition(project: ProjectCostInput): number {
  if (project.estimatedCredits != null && project.estimatedCredits > 0) {
    const transitions = Math.max(1, (project.imageCount ?? 2) - 1);
    return Math.round(project.estimatedCredits / transitions);
  }
  const preset = getAnimationPreset(resolvePresetId(project.presetId));
  const duration =
    project.viduDurationSeconds ??
    project.instantTransitionSeconds ??
    preset.durationSeconds;
  return duration * preset.estimatedCreditsPerSecond;
}

export function estimateTransitionCostUsd(project: ProjectCostInput): number {
  const credits = estimateCreditsPerTransition(project);
  return Math.round(credits * CREDIT_USD * 10000) / 10000;
}

export function estimateProjectViduCostUsd(
  project: ProjectCostInput & { transitionCount: number }
): number {
  if (project.estimatedCredits != null && project.estimatedCredits > 0) {
    return Math.round(project.estimatedCredits * CREDIT_USD * 100) / 100;
  }
  const perTransition = estimateCreditsPerTransition(project);
  return Math.round(perTransition * project.transitionCount * CREDIT_USD * 100) / 100;
}

export function creditsToUsd(credits: number): number {
  return Math.round(credits * CREDIT_USD * 100) / 100;
}

export function buildPeriodCostSummary(params: {
  renderCostUsd: number;
  renderCredits?: number;
  exactCredits?: number;
  estimatedCredits?: number;
  storageCostUsd: number;
  aiCostUsd: number;
  infrastructureCostUsd: number;
  hasEstimatedCredits?: boolean;
}): PeriodCostSummary {
  const total =
    params.renderCostUsd +
    params.storageCostUsd +
    params.aiCostUsd +
    params.infrastructureCostUsd;
  const estimated = params.estimatedCredits ?? 0;
  const exact = params.exactCredits ?? 0;
  return {
    renderCostUsd: Math.round(params.renderCostUsd * 100) / 100,
    renderCredits: params.renderCredits ?? 0,
    storageCostUsd: Math.round(params.storageCostUsd * 100) / 100,
    aiCostUsd: Math.round(params.aiCostUsd * 100) / 100,
    infrastructureCostUsd: Math.round(params.infrastructureCostUsd * 100) / 100,
    totalCostUsd: Math.round(total * 100) / 100,
    exactCredits: exact,
    estimatedCredits: estimated,
    meta: buildCostMeta(
      params.hasEstimatedCredits ?? estimated > 0
    ),
  };
}

export function prorateInfraCost(days: number): number {
  return Math.round((INFRA_BASELINE_USD_PER_MONTH / 30) * days * 100) / 100;
}

export function estimateStorageCostFromBytes(bytes: number): number {
  return estimateMonthlyStorageCostUsd(bytes);
}
