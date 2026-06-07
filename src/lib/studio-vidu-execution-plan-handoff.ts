import type { ViduExecutionPlan } from "@/types/studio-vidu-execution-plan";
import type { MotionViduExecutionPlanHandoffPlan } from "@/types/motion-handoff-payload";

export type { MotionViduExecutionPlanHandoffPlan };

/** Slim execution plan metadata for Studio → Motion handoff (V49 — P1, no auto-render). */
export function toMotionViduExecutionPlanHandoffPlan(
  plan: ViduExecutionPlan
): MotionViduExecutionPlanHandoffPlan {
  return {
    executionMode: plan.executionMode,
    executionModeLabelKey: plan.executionModeLabelKey,
    usesMultipleSteps: plan.usesMultipleSteps,
    totalJobCount: plan.totalJobCount,
    estimatedDurationSeconds: plan.estimatedDurationSeconds,
    readyToRender: plan.readiness.readyToRender,
    fallbackActive: plan.fallbackPlan.active,
    fallbackMode: plan.fallbackPlan.fallbackMode,
    fallbackReasonKey: plan.fallbackPlan.reasonKey,
    audioMixIncluded: plan.audioMixIncluded,
    audioMixReady: plan.audioMixReady,
    readiness: plan.readiness,
    jobs: plan.jobs.map((job) => ({
      id: job.id,
      jobKind: job.jobKind,
      sceneIds: job.sceneIds,
      durationSeconds: job.durationSeconds,
      outputRole: job.outputRole,
      missingImageCount: job.inputImages.filter((img) => img.missing).length,
      beatLabels: job.beatLabels,
    })),
    missingRequirementCount: plan.missingRequirements.length,
    warningCount: plan.warnings.length,
  };
}
