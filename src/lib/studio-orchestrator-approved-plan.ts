/**
 * Approved production plan — single source of truth for scene count and batch execution.
 */

import {
  buildRenderBatchPlanForOrchestrator,
} from "@/lib/studio-production-batch-plan";
import type { RenderBatchPlan } from "@/lib/studio-render-batch-planner";
import type { HcOrchestratorState } from "@/types/studio-video-production";

export function resolveApprovedSceneCount(orchestrator: HcOrchestratorState): number {
  if (orchestrator.musicVideoPlan?.sceneCount) {
    return orchestrator.musicVideoPlan.sceneCount;
  }
  if (orchestrator.photoMoviePlan?.sceneCount) {
    return orchestrator.photoMoviePlan.sceneCount;
  }
  if (orchestrator.longFormPlan?.sceneCount) {
    return orchestrator.longFormPlan.sceneCount;
  }
  return 5;
}

export function resolveApprovedRenderBatchPlan(
  orchestrator: HcOrchestratorState
): ReturnType<typeof buildRenderBatchPlanForOrchestrator> {
  if (orchestrator.musicVideoPlan) {
    return buildRenderBatchPlanForOrchestrator({ musicVideoPlan: orchestrator.musicVideoPlan });
  }
  if (orchestrator.photoMoviePlan) {
    return buildRenderBatchPlanForOrchestrator({ photoMoviePlan: orchestrator.photoMoviePlan });
  }
  if (orchestrator.longFormPlan) {
    return buildRenderBatchPlanForOrchestrator({ longFormPlan: orchestrator.longFormPlan });
  }
  return null;
}

export function validatePlanStoryboardParity(params: {
  orchestrator: HcOrchestratorState;
  storyboardSceneCount: number;
}): { ok: true } | { ok: false; error: string } {
  const expected = resolveApprovedSceneCount(params.orchestrator);
  if (params.storyboardSceneCount !== expected) {
    return {
      ok: false,
      error: `Production plan expects ${expected} scenes but storyboard has ${params.storyboardSceneCount}.`,
    };
  }
  return { ok: true };
}

export function orchestratorHasVideoEditOnly(orchestrator: HcOrchestratorState): boolean {
  const hasVideo = orchestrator.persistedAssets?.some((a) => a.kind === "video") ?? false;
  const hasPhotos =
    (orchestrator.persistedAssets?.filter((a) => a.kind === "photo" || a.kind === "photos").length ??
      0) > 0;
  const hasMusic = Boolean(orchestrator.musicAudioUrl || orchestrator.audioAnalysis);
  if (!hasVideo || hasPhotos) return false;
  if (orchestrator.intent === "music_video" && hasMusic) return false;
  return true;
}

export type ApprovedProductionPlanSummary = {
  sceneCount: number;
  renderBatchPlan: RenderBatchPlan | null;
};

export function summarizeApprovedProductionPlan(
  orchestrator: HcOrchestratorState
): ApprovedProductionPlanSummary {
  return {
    sceneCount: resolveApprovedSceneCount(orchestrator),
    renderBatchPlan: resolveApprovedRenderBatchPlan(orchestrator),
  };
}
