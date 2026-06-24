/**
 * Client-safe production batch planning helpers.
 */

import {
  buildRenderBatchPlanFromLongForm,
  buildRenderBatchPlanFromMusicVideo,
  splitSceneIndicesIntoBalancedBatches,
  type RenderBatchPlan,
} from "@/lib/studio-render-batch-planner";
import type {
  HcProductionLifecycleState,
  LongFormProductionPlan,
  MusicVideoProductionPlan,
  PhotoMoviePlan,
  ProductionBatchExecutionState,
  ProductionExecutionState,
} from "@/types/studio-video-production";

export function initProductionExecution(params: {
  renderBatchPlan: RenderBatchPlan;
  musicAudioUrl?: string;
}): ProductionExecutionState {
  const batches: ProductionBatchExecutionState[] = params.renderBatchPlan.batches.map((b) => ({
    batchIndex: b.batchIndex,
    totalBatches: params.renderBatchPlan.batchCount,
    status: "pending",
  }));

  return {
    id: crypto.randomUUID(),
    lifecycle: "rendering",
    renderBatchPlan: params.renderBatchPlan,
    batches,
    musicAudioUrl: params.musicAudioUrl,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildRenderBatchPlanForOrchestrator(params: {
  musicVideoPlan?: MusicVideoProductionPlan;
  longFormPlan?: LongFormProductionPlan;
  photoMoviePlan?: PhotoMoviePlan;
}): RenderBatchPlan | null {
  if (params.musicVideoPlan) {
    return buildRenderBatchPlanFromMusicVideo(params.musicVideoPlan);
  }
  if (params.photoMoviePlan) {
    const plan = params.photoMoviePlan;
    const balanced = splitSceneIndicesIntoBalancedBatches(plan.sceneCount, plan.scenesPerBatch);
    const batches = balanced.map((sceneIndices, batchIndex) => ({
      batchIndex,
      sceneIndices,
      estimatedDurationSeconds: sceneIndices.length * plan.sceneDurationSeconds,
      estimatedCredits: sceneIndices.length * 12,
    }));
    return {
      totalScenes: plan.sceneCount,
      totalRenders: plan.sceneCount,
      batchCount: batches.length,
      batches,
      estimatedRenderMinutes: plan.estimatedRenderMinutes,
      estimatedCredits: plan.estimatedCredits,
      estimatedVideoSeconds: plan.targetSeconds,
      ffmpegMergeRequired: plan.ffmpegMergeRequired,
      transitionCount: plan.transitionCount,
    };
  }
  if (params.longFormPlan) {
    return buildRenderBatchPlanFromLongForm(params.longFormPlan);
  }
  return null;
}

export function patchBatchStatus(
  execution: ProductionExecutionState,
  batchIndex: number,
  patch: Partial<ProductionBatchExecutionState>
): ProductionExecutionState {
  const batches = execution.batches.map((b) =>
    b.batchIndex === batchIndex ? { ...b, ...patch } : b
  );
  return { ...execution, batches, updatedAt: new Date().toISOString() };
}

export function allBatchesCompleted(execution: ProductionExecutionState): boolean {
  return execution.batches.length > 0 && execution.batches.every((b) => b.status === "completed");
}

export function nextPendingBatchIndex(execution: ProductionExecutionState): number | null {
  const pending = execution.batches.find((b) => b.status === "pending" || b.status === "failed");
  return pending?.batchIndex ?? null;
}

export function lifecycleAfterBatchComplete(
  execution: ProductionExecutionState
): HcProductionLifecycleState {
  if (!allBatchesCompleted(execution)) {
    return "rendering";
  }
  if (execution.renderBatchPlan?.ffmpegMergeRequired) {
    return "merging";
  }
  return "finishing";
}

export function sceneIndicesForBatch(plan: RenderBatchPlan, batchIndex: number): number[] {
  const batch = plan.batches.find((b) => b.batchIndex === batchIndex);
  return batch?.sceneIndices ?? [];
}
