import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import { getAnimationPreset } from "@/lib/animation-presets";
import {
  estimateInstantPremiumCreditsForPlan,
  resolveInstantPremiumOutputPlan,
} from "@/lib/instant-premium-output-plan";
import { aggregateMotionVisionWorkload } from "@/lib/motion-reference-vision-signals";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import { resolveMotionPresetVisualRequirements } from "@/lib/motion-preset-visual-requirements";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionComplexityEstimate,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";

export type MotionComplexityEstimatorInput = {
  presetId: MotionActionPresetId | null;
  references: MotionUploadedReference[];
  cachedAnalysisCount?: number;
  visionSignals?: MotionReferenceVisionSignals[];
  imageCount: number;
  instantMode: "transition" | "story";
  transitionSeconds: 3 | 5 | 8;
  sceneTextCount?: number;
  userIsAdmin?: boolean;
};

function complexityTier(input: {
  referenceCount: number;
  uncachedAnalysisCount: number;
  presetId: MotionActionPresetId | null;
  faceCount: number;
  mascotCount: number;
  productCount: number;
  sceneCount: number;
}): "low" | "medium" | "high" {
  let score = input.referenceCount;
  if (input.uncachedAnalysisCount > 1) score += 1;
  if (input.faceCount > 1) score += 1;
  if (input.mascotCount > 0) score += 1;
  if (input.productCount > 0) score += 1;
  if (input.sceneCount > 3) score += 1;
  if (input.presetId) {
    const visual = resolveMotionPresetVisualRequirements(input.presetId);
    if (visual.analysisRequirements.includes("mascot_detection")) score += 1;
    if (visual.analysisRequirements.includes("brand_detection")) score += 1;
  }
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  return "high";
}

/** Pre-payment price estimate from actual vision workload — no surprise charges. */
export function estimateMotionComplexity(
  input: MotionComplexityEstimatorInput
): MotionComplexityEstimate {
  const referenceCount = Math.max(1, input.references.length || input.imageCount);
  const workload = input.visionSignals?.length
    ? aggregateMotionVisionWorkload(input.visionSignals)
    : null;
  const cachedAnalysisCount = workload?.cachedCount ?? input.cachedAnalysisCount ?? 0;
  const uncachedAnalysisCount = workload?.uncachedCount ?? Math.max(0, referenceCount - cachedAnalysisCount);
  const requiredAnalysisPasses = workload?.requiredAnalysisPasses ?? uncachedAnalysisCount;
  const perReferenceAnalysis = PREMIUM_VISION_ANALYSIS_CREDITS;
  const estimatedAnalysisCredits = input.userIsAdmin ? 0 : requiredAnalysisPasses * perReferenceAnalysis;
  const sceneCount = input.instantMode === "story" ? Math.max(input.imageCount, input.sceneTextCount ?? input.imageCount) : 1;
  const outputPlan = resolveInstantPremiumOutputPlan({
    imageCount: input.imageCount,
    instantMode: input.instantMode,
    transitionSeconds: input.transitionSeconds,
  });
  const preset = getAnimationPreset("standard");
  const estimatedRenderCredits = estimateInstantPremiumCreditsForPlan(
    outputPlan,
    preset.estimatedCreditsPerSecond
  );
  const estimatedTotalCredits = estimatedAnalysisCredits + estimatedRenderCredits;
  return {
    presetId: input.presetId,
    referenceCount,
    cachedAnalysisCount,
    uncachedAnalysisCount,
    estimatedAnalysisCredits,
    estimatedRenderCredits,
    estimatedTotalCredits,
    analysisCached: requiredAnalysisPasses === 0,
    complexityTier: complexityTier({
      referenceCount,
      uncachedAnalysisCount,
      presetId: input.presetId,
      faceCount: workload?.faceCount ?? 0,
      mascotCount: workload?.mascotCount ?? 0,
      productCount: workload?.productCount ?? 0,
      sceneCount,
    }),
    faceCount: workload?.faceCount,
    mascotCount: workload?.mascotCount,
    logoCount: workload ? workload.logoCount : undefined,
    productCount: workload?.productCount,
    sceneCount,
    requiredAnalysisPasses,
    cacheReusePercent: workload?.cacheReusePercent,
  };
}

export function formatMotionComplexityBreakdown(
  estimate: MotionComplexityEstimate
): { analysisLabel: string; renderLabel: string; totalLabel: string } {
  return {
    analysisLabel: String(estimate.estimatedAnalysisCredits),
    renderLabel: String(estimate.estimatedRenderCredits),
    totalLabel: String(estimate.estimatedTotalCredits),
  };
}
