import type { StudioRenderStrategyPlan } from "@/types/studio-render-strategy";
import type { MotionRenderStrategyHandoffPlan } from "@/types/motion-handoff-payload";

export type { MotionRenderStrategyHandoffPlan };

export function toMotionRenderStrategyHandoffPlan(
  plan: StudioRenderStrategyPlan
): MotionRenderStrategyHandoffPlan {
  return {
    recommendedStrategy: plan.recommendedStrategy,
    confidence: plan.confidence,
    confidenceScore: plan.confidenceScore,
    actionComplexity: plan.actionComplexity,
    estimatedProviderDurationSeconds: plan.estimatedProviderDurationSeconds,
    estimatedFinalDurationSeconds: plan.estimatedFinalDurationSeconds,
    suggestedSpeedAdjustment: plan.suggestedSpeedAdjustment,
    speedAdviceOnly: plan.speedAdviceOnly,
    requiredImageCount: plan.requiredImageCount,
    presentImageCount: plan.presentImageCount,
    missingImageCount: plan.missingImageCount,
    internalInstantMode: plan.internalInstantMode,
    strategyLabelKey: plan.strategyLabelKey,
    strategyExplanationKey: plan.strategyExplanationKey,
    reasons: plan.reasons,
    warnings: plan.warnings,
  };
}
