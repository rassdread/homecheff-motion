import {
  createReplicatePrediction,
  fetchReplicateSam3Model,
  isReplicateConfigured,
  waitForReplicatePrediction,
} from "@/server/admin/replicate-client";

export type EditorSam3SegmentResult = {
  maskUrl: string | null;
  overlayUrl: string | null;
  confidence: number | null;
  boundingBox: number[] | null;
  polygons: number[][][] | null;
  predictionId: string;
  runtimeMs: number;
};

function maskToUrl(mask: unknown): string | null {
  if (typeof mask === "string" && (mask.startsWith("http") || mask.startsWith("data:"))) {
    return mask;
  }
  return null;
}

export async function segmentEditorImageWithReplicateSam3(params: {
  imageUrl: string;
  prompt: string;
}): Promise<{ ok: true; result: EditorSam3SegmentResult } | { ok: false; error: string }> {
  if (!isReplicateConfigured()) {
    return { ok: false, error: "Replicate is not configured" };
  }

  const started = Date.now();
  const modelRes = await fetchReplicateSam3Model();
  if (!modelRes.ok || !modelRes.model?.latestVersionId) {
    return { ok: false, error: "Model unavailable." };
  }

  const createRes = await createReplicatePrediction({
    version: modelRes.model.latestVersionId,
    input: {
      image: params.imageUrl,
      prompt: params.prompt.trim() || "person",
      return_polygons: true,
      visualize_output: true,
      multimask_output: true,
      confidence_threshold: 0.5,
    },
  });

  if (!createRes.ok) {
    return { ok: false, error: createRes.error };
  }

  const finished = await waitForReplicatePrediction(createRes.prediction.id, {
    timeoutMs: 120_000,
  });

  if (!finished.ok) {
    return { ok: false, error: finished.error };
  }

  const output = finished.prediction.output;
  if (!output || typeof output !== "object") {
    return { ok: false, error: "Replicate could not process this image." };
  }

  const o = output as {
    pred_masks?: unknown[];
    pred_scores?: number[];
    pred_boxes?: number[][];
    pred_polygons?: number[][][][];
    visualization?: string;
  };

  const scores = o.pred_scores ?? [];
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] > scores[bestIdx]) {
      bestIdx = i;
    }
  }

  return {
    ok: true,
    result: {
      maskUrl: maskToUrl(o.pred_masks?.[bestIdx]),
      overlayUrl: o.visualization ?? null,
      confidence: scores[bestIdx] ?? null,
      boundingBox: o.pred_boxes?.[bestIdx] ?? null,
      polygons: o.pred_polygons?.[bestIdx] ?? null,
      predictionId: finished.prediction.id,
      runtimeMs: Date.now() - started,
    },
  };
}
