import type { StudioAnimationPlan } from "@/types/studio-animation-plan";
import type { MotionAnimationPlanHandoffPlan } from "@/types/motion-handoff-payload";

export type { MotionAnimationPlanHandoffPlan };

/** Slim animation plan metadata for Studio → Motion handoff (V48 — P1/P2, no execution). */
export function toMotionAnimationPlanHandoffPlan(
  plan: StudioAnimationPlan
): MotionAnimationPlanHandoffPlan {
  return {
    totalTargetDuration: plan.totalTargetDuration,
    providerDurationEstimate: plan.providerDurationEstimate,
    finalDurationEstimate: plan.finalDurationEstimate,
    suggestedSpeedAdjustment: plan.speedAdvice.suggestedSpeedAdjustment,
    speedAdviceOnly: true,
    totalShotCount: plan.totalShotCount,
    missingImageCount: plan.missingImageCount,
    recommendedStrategy: plan.recommendedStrategy,
    readiness: plan.readiness,
    scenes: plan.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      sceneOrder: scene.sceneOrder,
      targetDuration: scene.targetDuration,
      startTime: scene.startTime,
      endTime: scene.endTime,
      shots: scene.shots.map((shot) => ({
        shotRole: shot.shotRole,
        actionBeat: shot.actionBeat,
        startTime: shot.startTime,
        endTime: shot.endTime,
        durationSeconds: shot.durationSeconds,
        motionIntent: shot.motionIntent,
        requiredImageRole: shot.requiredImageRole,
        missingImage: shot.missingImage,
        renderModeHint: shot.renderModeHint,
      })),
    })),
  };
}
