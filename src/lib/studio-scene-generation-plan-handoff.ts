import type { StudioSceneGenerationPlan } from "@/types/studio-scene-generation-plan";
import type { MotionSceneGenerationHandoffPlan } from "@/types/motion-handoff-payload";

/** Slim generation plan for Studio → Motion handoff (planning only). */
export function toMotionSceneGenerationHandoffPlan(
  plan: StudioSceneGenerationPlan
): MotionSceneGenerationHandoffPlan {
  return {
    readyToRender: plan.readiness.readyToRender,
    readinessLevel: plan.readiness.level,
    readinessScore: plan.readiness.score,
    requiredMissing: plan.readiness.requiredMissing,
    recommendedMissing: plan.readiness.recommendedMissing,
    blockedCount: plan.readiness.blockedCount,
    totalRequired: plan.totalRequired,
    totalPresent: plan.totalPresent,
    totalMissing: plan.totalMissing,
    generationStepCount: plan.generationSteps.length,
    missingAssetCount: plan.missingAssets.length,
    orderedSteps: plan.generationSteps.map((step) => ({
      order: step.order,
      summaryKey: step.summaryKey,
      itemCount: step.itemIds.length,
    })),
    nextImages: [...plan.requiredImages, ...plan.recommendedImages]
      .filter((i) => i.status !== "present")
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .slice(0, 8)
      .map((i) => ({
        sceneOrder: i.sceneOrder,
        sceneTitle: i.sceneTitle,
        actionBeat: i.actionBeat,
        roleLabelKey: i.roleLabelKey,
        priority: i.priority,
        status: i.status,
      })),
  };
}
