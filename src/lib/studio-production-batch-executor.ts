/**
 * Server-only production batch merge.
 */

import { mergeProductionVideoSegments } from "@/lib/studio-production-video-merge";
import type { ProductionExecutionState } from "@/types/studio-video-production";

export {
  initProductionExecution,
  buildRenderBatchPlanForOrchestrator,
  patchBatchStatus,
  allBatchesCompleted,
  nextPendingBatchIndex,
  lifecycleAfterBatchComplete,
  sceneIndicesForBatch,
} from "@/lib/studio-production-batch-plan";

export async function mergeProductionBatchSegments(params: {
  execution: ProductionExecutionState;
  tmpDir: string;
  outputPath: string;
}): Promise<{ ok: true; mergedVideoUrl: string } | { ok: false; error: string }> {
  const urls = params.execution.batches
    .sort((a, b) => a.batchIndex - b.batchIndex)
    .map((b) => b.segmentVideoUrl)
    .filter((u): u is string => Boolean(u?.trim()));

  const merged = await mergeProductionVideoSegments({
    segmentUrls: urls,
    outputPath: params.outputPath,
    tmpDir: params.tmpDir,
  });

  if (!merged.ok) {
    return merged;
  }

  return { ok: true, mergedVideoUrl: merged.outputPath };
}
