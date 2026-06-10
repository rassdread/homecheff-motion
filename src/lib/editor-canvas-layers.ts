import { buildEditorSemanticLayersFromHybrid } from "@/lib/editor-hybrid-detection";
import {
  buildEditorSemanticLayersFromVision,
  canvasLayerToSemanticLayer,
  semanticLayerToCanvasLayer,
} from "@/lib/editor-semantic-layers-from-vision";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasLayer,
  EditorSemanticLayer,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

export function seedEditorLayersFromVision(params: {
  vision: AssetVisionAnalysis;
  sourceKind: EditorSourceKind;
  styleDna?: AssetStyleDna | null;
  semanticRecord?: Partial<AssetSemanticRecord> | null;
  preserveBackground?: EditorCanvasLayer;
  onnxDetections?: ObjectDetection[];
  detectorKind?: string;
}): EditorCanvasLayer[] {
  const hybrid =
    params.onnxDetections && params.onnxDetections.length > 0
      ? buildEditorSemanticLayersFromHybrid({
          vision: params.vision,
          styleDna: params.styleDna,
          semanticRecord: params.semanticRecord,
          identityFingerprint: params.vision.identityFingerprint,
          sourceKind: params.sourceKind,
          onnxDetections: params.onnxDetections,
          detectorKind: params.detectorKind,
        })
      : null;

  const semanticLayers =
    hybrid?.layers ??
    buildEditorSemanticLayersFromVision({
      vision: params.vision,
      styleDna: params.styleDna,
      semanticRecord: params.semanticRecord,
      identityFingerprint: params.vision.identityFingerprint,
      sourceKind: params.sourceKind,
    });

  const previewUrl = params.preserveBackground?.previewUrl ?? "";
  const canvasLayers = semanticLayers.map((layer) =>
    semanticLayerToCanvasLayer(layer, params.sourceKind, previewUrl)
  );

  if (params.preserveBackground) {
    const bgIndex = canvasLayers.findIndex((l) => l.layerType === "background");
    if (bgIndex >= 0) {
      canvasLayers[bgIndex] = {
        ...params.preserveBackground,
        ...canvasLayers[bgIndex],
        id: "background",
        previewUrl: params.preserveBackground.previewUrl,
        storageKey: params.preserveBackground.storageKey,
      };
    }
  }

  return canvasLayers;
}

export function extractEditorSemanticLayers(
  layers: EditorCanvasLayer[]
): EditorSemanticLayer[] {
  return layers
    .map((layer) => canvasLayerToSemanticLayer(layer))
    .filter((layer): layer is EditorSemanticLayer => layer !== null);
}

export function visibleEditorLayers(document: { objects: EditorCanvasLayer[] }): EditorCanvasLayer[] {
  return document.objects.filter((layer) => layer.visible);
}

export function renderableEditorLayers(document: { objects: EditorCanvasLayer[] }): EditorCanvasLayer[] {
  return document.objects.filter((layer) => layer.visible && layer.layerType !== "background");
}
