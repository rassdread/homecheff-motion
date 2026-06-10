import {
  applyEditorSelectionShape,
  createMaskSelectionShape,
  detachObjectCutoutLayer,
} from "@/lib/editor-object-mask";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type EditorSegmentApiShape = {
  selectionMode?: string;
  maskUrl?: string;
  cutoutUrl?: string;
  polygon?: EditorShapePoint[];
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence?: number;
  segmentationSource?: "rembg" | "heuristic" | "sam2" | "replicate_sam3" | "manual";
  maskStorageKey?: string;
  alphaMask?: boolean;
  providerUsed?: string;
  predictionId?: string;
  runtimeMs?: number;
};

export function applyEditorSegmentApiShape(
  layer: EditorCanvasLayer,
  result: EditorSegmentApiShape
): EditorCanvasLayer {
  const shape = createMaskSelectionShape({
    bounds: result.boundingBox,
    maskUrl: result.maskUrl,
    maskStorageKey: result.maskStorageKey,
    cutoutUrl: result.cutoutUrl,
    polygon: result.polygon,
    confidence: result.confidence ?? 0.85,
    segmentationSource: result.segmentationSource ?? "rembg",
  });
  let next = applyEditorSelectionShape(layer, shape);
  if (result.cutoutUrl) {
    next = detachObjectCutoutLayer(next, result.cutoutUrl, result.maskUrl);
  }
  return {
    ...next,
    metadata: {
      ...next.metadata,
      approximateSelection: false,
      estimatedBounds: false,
      lastSegmentProvider: result.providerUsed ?? result.segmentationSource,
      lastSegmentPredictionId: result.predictionId,
      lastSegmentRuntimeMs: result.runtimeMs,
    },
  };
}
