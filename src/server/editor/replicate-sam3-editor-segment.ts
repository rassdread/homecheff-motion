import {
  createReplicatePrediction,
  fetchReplicateSam3Model,
  isReplicateConfigured,
  waitForReplicatePrediction,
} from "@/server/admin/replicate-client";
import type { EditorCanvasBounds, EditorShapePoint } from "@/types/homecheff-visual-editor";

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

export function normalizeSam3Box(
  box: number[] | null | undefined,
  imageWidth?: number | null,
  imageHeight?: number | null
): EditorCanvasBounds | null {
  if (!box || box.length < 4) {
    return null;
  }
  const [a, b, c, d] = box;
  const looksNormalized = a <= 1 && b <= 1 && c <= 1 && d <= 1;
  if (looksNormalized) {
    return { x: a, y: b, width: c, height: d };
  }
  const width = Math.max(1, imageWidth ?? 1);
  const height = Math.max(1, imageHeight ?? 1);
  if (c > a && d > b) {
    return {
      x: a / width,
      y: b / height,
      width: (c - a) / width,
      height: (d - b) / height,
    };
  }
  return {
    x: a / width,
    y: b / height,
    width: c / width,
    height: d / height,
  };
}

function pointInBounds(point: EditorShapePoint, bounds: EditorCanvasBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/** Prefer multimask candidate whose bbox contains the click; else highest score. */
export function pickSam3MaskIndexAtClick(input: {
  scores: number[];
  boxes?: number[][] | null;
  clickPoint?: EditorShapePoint;
  imageWidth?: number | null;
  imageHeight?: number | null;
}): number {
  const scores = input.scores;
  if (scores.length === 0) {
    return 0;
  }
  let bestScoreIdx = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if ((scores[i] ?? 0) > (scores[bestScoreIdx] ?? 0)) {
      bestScoreIdx = i;
    }
  }
  if (!input.clickPoint || !input.boxes?.length) {
    return bestScoreIdx;
  }
  let bestClickIdx = -1;
  let bestClickScore = -1;
  for (let i = 0; i < scores.length; i += 1) {
    const bbox = normalizeSam3Box(input.boxes[i], input.imageWidth, input.imageHeight);
    if (!bbox || !pointInBounds(input.clickPoint, bbox)) {
      continue;
    }
    const score = scores[i] ?? 0;
    if (score > bestClickScore) {
      bestClickIdx = i;
      bestClickScore = score;
    }
  }
  return bestClickIdx >= 0 ? bestClickIdx : bestScoreIdx;
}

export async function segmentEditorImageWithReplicateSam3(params: {
  imageUrl: string;
  prompt: string;
  clickPoint?: EditorShapePoint;
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
    orig_img_w?: number;
    orig_img_h?: number;
  };

  const scores = o.pred_scores ?? [];
  const bestIdx = pickSam3MaskIndexAtClick({
    scores,
    boxes: o.pred_boxes,
    clickPoint: params.clickPoint,
    imageWidth: o.orig_img_w,
    imageHeight: o.orig_img_h,
  });

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
