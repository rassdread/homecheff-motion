import {
  REPLICATE_SAM3_ESTIMATED_COST_USD,
  REPLICATE_SAM3_MODEL_ID,
  createReplicatePrediction,
  fetchReplicateSam3Model,
  waitForReplicatePrediction,
} from "@/server/admin/replicate-client";
import { recordReplicateLabRun } from "@/server/admin/replicate-lab-state";

export type Sam3SegmentOutput = {
  visualization: string | null;
  pred_masks: unknown[];
  pred_polygons: number[][][][];
  pred_boxes: number[][];
  pred_scores: number[];
  orig_img_h: number;
  orig_img_w: number;
};

export type ReplicateLabSegmentResult = {
  ok: true;
  model: string;
  predictionId: string;
  prompt: string;
  status: string;
  runtimeMs: number;
  estimatedCostUsd: number;
  confidence: number | null;
  maskUrl: string | null;
  overlayUrl: string | null;
  boundingBox: number[] | null;
  polygons: number[][][] | null;
  allScores: number[];
  allBoxes: number[][];
  allPolygons: number[][][][];
  imageWidth: number | null;
  imageHeight: number | null;
  responseSizeBytes: number;
  raw: Sam3SegmentOutput | null;
};

function isSam3Output(value: unknown): value is Sam3SegmentOutput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  return Array.isArray(o.pred_scores) && Array.isArray(o.pred_masks);
}

function maskToUrl(mask: unknown): string | null {
  if (typeof mask === "string" && mask.startsWith("http")) {
    return mask;
  }
  if (typeof mask === "string" && mask.startsWith("data:")) {
    return mask;
  }
  return null;
}

function pickBestIndex(scores: number[]): number {
  if (scores.length === 0) {
    return -1;
  }
  let best = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] > scores[best]) {
      best = i;
    }
  }
  return best;
}

export function bufferToDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function runSam3SegmentationTest(params: {
  imageDataUri: string;
  prompt: string;
}): Promise<{ ok: true; result: ReplicateLabSegmentResult } | { ok: false; error: string }> {
  const started = Date.now();
  const prompt = params.prompt.trim() || "person";

  const modelRes = await fetchReplicateSam3Model();
  if (!modelRes.ok || !modelRes.model?.latestVersionId) {
    return { ok: false, error: modelRes.error ?? "Model unavailable." };
  }

  const createRes = await createReplicatePrediction({
    version: modelRes.model.latestVersionId,
    input: {
      image: params.imageDataUri,
      prompt,
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

  const prediction = finished.prediction;
  const runtimeMs = Date.now() - started;
  const predictTimeSec = prediction.metrics?.predict_time;
  const executionMs =
    typeof predictTimeSec === "number" && predictTimeSec > 0
      ? Math.round(predictTimeSec * 1000)
      : runtimeMs;

  const raw = isSam3Output(prediction.output) ? prediction.output : null;
  const rawJson = JSON.stringify(prediction);
  const responseSizeBytes = Buffer.byteLength(rawJson, "utf8");

  const scores = raw?.pred_scores ?? [];
  const bestIdx = pickBestIndex(scores);
  const maskUrl = bestIdx >= 0 ? maskToUrl(raw?.pred_masks?.[bestIdx]) : null;
  const overlayUrl = raw?.visualization ?? null;
  const boundingBox = bestIdx >= 0 ? (raw?.pred_boxes?.[bestIdx] ?? null) : null;
  const polygons = bestIdx >= 0 ? (raw?.pred_polygons?.[bestIdx] ?? null) : null;

  recordReplicateLabRun({
    runtimeMs: executionMs,
    completedAt: new Date().toISOString(),
    predictionId: prediction.id,
    prompt,
  });

  return {
    ok: true,
    result: {
      ok: true,
      model: REPLICATE_SAM3_MODEL_ID,
      predictionId: prediction.id,
      prompt,
      status: prediction.status,
      runtimeMs: executionMs,
      estimatedCostUsd: REPLICATE_SAM3_ESTIMATED_COST_USD,
      confidence: bestIdx >= 0 ? scores[bestIdx] : null,
      maskUrl,
      overlayUrl,
      boundingBox,
      polygons,
      allScores: scores,
      allBoxes: raw?.pred_boxes ?? [],
      allPolygons: raw?.pred_polygons ?? [],
      imageWidth: raw?.orig_img_w ?? null,
      imageHeight: raw?.orig_img_h ?? null,
      responseSizeBytes,
      raw,
    },
  };
}
