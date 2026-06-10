import {
  buildEditorSemanticLayersFromVision,
  type BuildEditorSemanticLayersInput,
} from "@/lib/editor-semantic-layers-from-vision";
import { classifyEditorSemanticFeature } from "@/lib/editor-semantic-layer-taxonomy";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasBounds,
  EditorDetectionMeta,
  EditorSemanticLayer,
  EditorSemanticLayerSource,
} from "@/types/homecheff-visual-editor";

export type EditorOnnxDetection = {
  label: string;
  confidence: number;
  box: EditorCanvasBounds;
};

export type HybridDetectionMergeResult = {
  layers: EditorSemanticLayer[];
  meta: EditorDetectionMeta;
};

const IOU_MATCH_THRESHOLD = 0.35;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function bboxIoU(a: EditorCanvasBounds, b: EditorCanvasBounds): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function normalizeOnnxDetections(detections: ObjectDetection[]): EditorOnnxDetection[] {
  return detections.map((d) => ({
    label: d.label,
    confidence: d.confidence,
    box: {
      x: clamp01(d.box.x),
      y: clamp01(d.box.y),
      width: clamp01(d.box.width),
      height: clamp01(d.box.height),
    },
  }));
}

/** Map raw COCO labels to human-friendly editor names — never expose raw labels in UI. */
export function humanizeDetectorLabel(
  cocoLabel: string,
  vision: AssetVisionAnalysis
): string {
  const lower = cocoLabel.toLowerCase();
  const visionType = vision.objectType;

  if (lower === "person") {
    if (visionType === "mascot") {
      return "Mascot";
    }
    if (visionType === "character" || visionType === "human") {
      return "Character";
    }
    return "Person";
  }
  if (lower === "sports ball") {
    const features = (vision.keyFeatures ?? []).map((f) => f.toLowerCase());
    if (features.some((f) => f.includes("globe") || f.includes("world"))) {
      return "Globe";
    }
    return "Ball";
  }
  if (lower === "tie") {
    return "Tie";
  }
  if (lower === "bottle" || lower === "cup" || lower === "wine glass") {
    if (visionType === "product" || visionType === "packaging") {
      return "Product";
    }
    return lower === "cup" ? "Cup" : "Bottle";
  }
  if (lower.includes("cell phone") || lower === "laptop" || lower === "tv") {
    return "Screen";
  }
  if (
    lower === "bird" ||
    lower === "cat" ||
    lower === "dog" ||
    lower === "horse" ||
    lower === "sheep" ||
    lower === "cow" ||
    lower === "elephant" ||
    lower === "bear" ||
    lower === "zebra" ||
    lower === "giraffe"
  ) {
    return "Animal";
  }
  if (
    lower.includes("pizza") ||
    lower.includes("sandwich") ||
    lower.includes("apple") ||
    lower.includes("banana") ||
    lower.includes("orange") ||
    lower.includes("cake") ||
    lower.includes("donut") ||
    lower === "bowl"
  ) {
    return "Food";
  }
  if (lower === "handbag" || lower === "backpack" || lower === "umbrella" || lower === "suitcase") {
    return "Accessory";
  }

  const classified = classifyEditorSemanticFeature(cocoLabel, vision.objectType);
  if (classified.type === "logo" || classified.type === "mark") {
    return "Logo";
  }
  if (classified.type === "text") {
    return "Text";
  }

  const visionMatch = (vision.keyFeatures ?? []).find((f) =>
    f.toLowerCase().includes(lower) || lower.includes(f.toLowerCase())
  );
  if (visionMatch) {
    return visionMatch.charAt(0).toUpperCase() + visionMatch.slice(1);
  }

  return classified.type === "object"
    ? "Object"
    : cocoLabel.charAt(0).toUpperCase() + cocoLabel.slice(1);
}

function findBestVisionLabelForBox(
  box: EditorCanvasBounds,
  visionLayers: EditorSemanticLayer[]
): string | null {
  let best: { label: string; iou: number } | null = null;
  for (const layer of visionLayers) {
    if (layer.type === "background") {
      continue;
    }
    const overlap = bboxIoU(box, layer.bounds);
    if (overlap >= IOU_MATCH_THRESHOLD && (!best || overlap > best.iou)) {
      best = { label: layer.label, iou: overlap };
    }
  }
  return best?.label ?? null;
}

function slugOnnxId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `onnx_${slug || "object"}_${index}`;
}

function buildOnnxSemanticLayers(
  detections: EditorOnnxDetection[],
  vision: AssetVisionAnalysis,
  visionLayers: EditorSemanticLayer[]
): EditorSemanticLayer[] {
  return detections.map((det, index) => {
    const humanLabel =
      findBestVisionLabelForBox(det.box, visionLayers) ?? humanizeDetectorLabel(det.label, vision);
    const classified = classifyEditorSemanticFeature(humanLabel, vision.objectType);
    return {
      id: slugOnnxId(humanLabel, index),
      label: humanLabel,
      type: classified.type,
      category: classified.category,
      bounds: det.box,
      confidence: det.confidence,
      visible: true,
      locked: classified.defaultLocked ?? false,
      editable: !(classified.defaultLocked ?? false),
      source: "onnx_detector" as EditorSemanticLayerSource,
      children: [],
      metadata: {
        taxonomyKey: classified.type,
        rawFeature: det.label,
        estimatedBounds: false,
        approximateSelection: false,
        selectionMode: "box",
        identityRelevance: classified.identityRelevance,
      },
    };
  });
}

function mergeVisionLayersWithOnnx(
  visionLayers: EditorSemanticLayer[],
  onnxLayers: EditorSemanticLayer[]
): EditorSemanticLayer[] {
  if (onnxLayers.length === 0) {
    return visionLayers;
  }

  const consumedOnnx = new Set<string>();
  const merged: EditorSemanticLayer[] = [];

  for (const visionLayer of visionLayers) {
    if (visionLayer.type === "background") {
      merged.push(visionLayer);
      continue;
    }

    let bestOnnx: EditorSemanticLayer | null = null;
    let bestIou = 0;
    for (const onnxLayer of onnxLayers) {
      if (consumedOnnx.has(onnxLayer.id)) {
        continue;
      }
      const overlap = bboxIoU(visionLayer.bounds, onnxLayer.bounds);
      if (overlap >= IOU_MATCH_THRESHOLD && overlap > bestIou) {
        bestOnnx = onnxLayer;
        bestIou = overlap;
      }
    }

    if (bestOnnx) {
      consumedOnnx.add(bestOnnx.id);
      merged.push({
        ...bestOnnx,
        id: visionLayer.id,
        label: visionLayer.label,
        parentId: visionLayer.parentId,
        children: visionLayer.children,
        locked: visionLayer.locked,
        editable: visionLayer.editable,
        metadata: {
          ...bestOnnx.metadata,
          rawFeature: bestOnnx.metadata?.rawFeature,
          estimatedBounds: false,
          approximateSelection: false,
        },
      });
    } else if (!visionLayer.metadata?.estimatedBounds) {
      merged.push(visionLayer);
    }
  }

  for (const onnxLayer of onnxLayers) {
    if (!consumedOnnx.has(onnxLayer.id)) {
      merged.push(onnxLayer);
    }
  }

  const hasBackground = merged.some((l) => l.type === "background");
  if (!hasBackground) {
    const bg = visionLayers.find((l) => l.type === "background");
    if (bg) {
      merged.unshift(bg);
    }
  }

  return merged;
}

/**
 * Hybrid pipeline: ONNX detection → OpenAI vision → semantic mapping → editor layers.
 * Priority: real detector bounds → vision labels → heuristic fallback.
 */
export function buildEditorSemanticLayersFromHybrid(
  input: BuildEditorSemanticLayersInput & {
    onnxDetections?: ObjectDetection[];
    detectorKind?: string;
  }
): HybridDetectionMergeResult {
  const visionLayers = buildEditorSemanticLayersFromVision(input);
  const onnx = normalizeOnnxDetections(input.onnxDetections ?? []);

  if (onnx.length === 0) {
    return {
      layers: visionLayers,
      meta: {
        source: "vision",
        count: visionLayers.filter((l) => l.type !== "background").length,
        onnxAvailable: false,
        detectorKind: input.detectorKind,
      },
    };
  }

  const onnxLayers = buildOnnxSemanticLayers(onnx, input.vision, visionLayers);
  const merged = mergeVisionLayersWithOnnx(visionLayers, onnxLayers);

  return {
    layers: merged,
    meta: {
      source: "hybrid",
      count: merged.filter((l) => l.type !== "background").length,
      onnxAvailable: true,
      detectorKind: input.detectorKind,
    },
  };
}

export function mergeHybridDetectionLabels(
  onnxLabels: string[],
  visionLabels: string[]
): string[] {
  const result = new Set<string>();
  for (const label of visionLabels) {
    result.add(label);
  }
  for (const onnx of onnxLabels) {
    const human = onnx.charAt(0).toUpperCase() + onnx.slice(1);
    if (![...result].some((r) => r.toLowerCase() === human.toLowerCase())) {
      result.add(human);
    }
  }
  return [...result];
}
