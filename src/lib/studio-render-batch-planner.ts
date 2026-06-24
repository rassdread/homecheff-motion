/**
 * Auto render planner — scene batches, provider limits, merge plan.
 */

import type { LongFormProductionPlan } from "@/types/studio-video-production";
import type { MusicVideoProductionPlan } from "@/types/studio-video-production";

export type RenderBatchPlan = {
  totalScenes: number;
  totalRenders: number;
  batchCount: number;
  batches: Array<{
    batchIndex: number;
    sceneIndices: number[];
    estimatedDurationSeconds: number;
    estimatedCredits: number;
  }>;
  estimatedRenderMinutes: number;
  estimatedCredits: number;
  estimatedVideoSeconds: number;
  ffmpegMergeRequired: boolean;
  transitionCount: number;
};

const MOTION_MAX_IMAGES_PER_BATCH = 6;
const MOTION_MIN_IMAGES_PER_BATCH = 2;
const CREDITS_PER_RENDER = 8;
const CREDITS_PER_IMAGE = 4;

/** Evenly split scene indices — no batch may have fewer than 2 scenes (Vidu story minimum). */
export function splitSceneIndicesIntoBalancedBatches(
  totalScenes: number,
  maxPerBatch = MOTION_MAX_IMAGES_PER_BATCH,
  minPerBatch = MOTION_MIN_IMAGES_PER_BATCH
): number[][] {
  if (totalScenes <= 0) return [];
  if (totalScenes <= maxPerBatch) {
    return [Array.from({ length: totalScenes }, (_, i) => i)];
  }

  const batchCount = Math.ceil(totalScenes / maxPerBatch);
  const sizes: number[] = Array.from({ length: batchCount }, () => Math.floor(totalScenes / batchCount));
  let remainder = totalScenes % batchCount;
  for (let i = 0; i < batchCount && remainder > 0; i += 1) {
    sizes[i]! += 1;
    remainder -= 1;
  }

  while (sizes.some((size) => size > 0 && size < minPerBatch)) {
    const smallIdx = sizes.findIndex((size) => size > 0 && size < minPerBatch);
    if (smallIdx < 0) break;
    const donorIdx = sizes.reduce(
      (best, size, idx) => (size > sizes[best]! ? idx : best),
      0
    );
    if (sizes[donorIdx]! <= minPerBatch) break;
    sizes[donorIdx]! -= 1;
    sizes[smallIdx]! += 1;
  }

  const batches: number[][] = [];
  let cursor = 0;
  for (const size of sizes) {
    if (size <= 0) continue;
    batches.push(Array.from({ length: size }, (_, i) => cursor + i));
    cursor += size;
  }
  return batches;
}

export function buildRenderBatchPlanFromMusicVideo(plan: MusicVideoProductionPlan): RenderBatchPlan {
  const totalScenes = plan.sceneCount;
  const totalRenders = plan.renderCount;
  const balanced = splitSceneIndicesIntoBalancedBatches(totalScenes);
  const batches = balanced.map((sceneIndices, batchIndex) => ({
    batchIndex,
    sceneIndices,
    estimatedDurationSeconds: sceneIndices.length * plan.sceneDurationSeconds,
    estimatedCredits: sceneIndices.length * CREDITS_PER_RENDER,
  }));
  const batchCount = batches.length;

  return {
    totalScenes,
    totalRenders,
    batchCount,
    batches,
    estimatedRenderMinutes: plan.estimatedRenderMinutes,
    estimatedCredits: plan.estimatedCredits,
    estimatedVideoSeconds: plan.estimatedDurationSeconds,
    ffmpegMergeRequired: plan.mergePlan.ffmpegMergeRequired,
    transitionCount: Math.max(0, totalScenes - 1),
  };
}

export function buildRenderBatchPlanFromLongForm(plan: LongFormProductionPlan): RenderBatchPlan {
  const totalScenes = plan.sceneCount;
  const balanced = splitSceneIndicesIntoBalancedBatches(totalScenes, plan.scenesPerBatch);
  const batches = balanced.map((sceneIndices, batchIndex) => ({
    batchIndex,
    sceneIndices,
    estimatedDurationSeconds: sceneIndices.length * plan.sceneDurationSeconds,
    estimatedCredits: sceneIndices.length * CREDITS_PER_RENDER + sceneIndices.length * CREDITS_PER_IMAGE,
  }));
  const batchCount = batches.length;

  return {
    totalScenes,
    totalRenders: totalScenes,
    batchCount,
    batches,
    estimatedRenderMinutes: plan.estimatedRenderMinutes,
    estimatedCredits: plan.estimatedCredits,
    estimatedVideoSeconds: plan.targetSeconds,
    ffmpegMergeRequired: plan.ffmpegMergeRequired,
    transitionCount: plan.transitionCount,
  };
}

export function motionBatchSizeLimit(): number {
  return MOTION_MAX_IMAGES_PER_BATCH;
}
