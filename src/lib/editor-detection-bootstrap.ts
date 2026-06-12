import {
  analyzeAssetStyleDnaApi,
  type AnalyzeAssetStyleDnaApiResult,
} from "@/lib/studio-asset-derivation-client";
import { seedEditorLayersFromVision } from "@/lib/editor-canvas-layers";
import { semanticLayerToCanvasLayer } from "@/lib/editor-semantic-layers-from-vision";
import { buildEditorSemanticLayersFromHybrid } from "@/lib/editor-hybrid-detection";
import {
  buildBrandSheetSemanticLayers,
  isBrandSheetLayout,
} from "@/lib/editor-brand-sheet-detection";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { buildEditorAssetProfile } from "@/lib/editor-asset-intelligence";
import { buildEditorMotionPreparations } from "@/lib/editor-motion-preparation";
import { extractEditorTextLayers } from "@/lib/editor-text-layers";
import { detectEditorObjectsApi } from "@/lib/editor-vision-v3-client";
import { getEditorVisionMetricsSnapshot } from "@/lib/editor-vision-metrics";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorDetectionMeta,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";

function bootstrapStudioSourceKind(document: EditorCanvasDocument): StudioAssetKind {
  const kind = document.sourceKind;
  if (kind === "character") return "character";
  if (kind === "product_photo" || kind === "logo") return "prop";
  return "character";
}

function countNonBackgroundLayers(layers: EditorCanvasLayer[]): number {
  return layers.filter((layer) => layer.layerType !== "background").length;
}

export function documentNeedsDetectionBootstrap(document: EditorCanvasDocument): boolean {
  return countNonBackgroundLayers(document.objects) === 0;
}

/**
 * Vision analyze is optional for Editor bootstrap — 4xx/405/network failures fall back to
 * heuristic/brand-sheet layers; Replicate prompt segmentation does not depend on this call.
 */
export function resolveEditorBootstrapVision(
  document: EditorCanvasDocument,
  visionRes: AnalyzeAssetStyleDnaApiResult
): {
  vision: AssetVisionAnalysis;
  styleDna: AssetStyleDna | null;
  visionAnalyzeOk: boolean;
} {
  if (visionRes.ok) {
    return {
      vision: visionRes.data.visionAnalysis,
      styleDna: visionRes.data.styleDna,
      visionAnalyzeOk: true,
    };
  }
  return {
    vision: createFallbackVision(document),
    styleDna: null,
    visionAnalyzeOk: false,
  };
}

function createFallbackVision(document: EditorCanvasDocument): AssetVisionAnalysis {
  const name = document.name.toLowerCase();
  const isPoster = /poster|brand|sheet|banner|flyer|layout|homecheff/i.test(name);
  return {
    objectType: isPoster ? "brand_asset" : "unknown",
    objectTypeLabel: isPoster ? "Brand sheet" : "Image",
    visualStyle: "mixed",
    colors: [],
    shapeLanguage: [],
    keyFeatures: isPoster ? ["logo", "text", "icon", "color card", "product mockup"] : ["subject"],
    brandIdentity: name.includes("homecheff") ? "HomeCheff" : "",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.55,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.5,
    identityFingerprint: {
      fingerprintHash: `bootstrap-${document.sessionId}`,
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
  };
}

function buildLayersFromSemantic(
  document: EditorCanvasDocument,
  semanticLayers: EditorSemanticLayer[],
  vision: AssetVisionAnalysis,
  meta: EditorDetectionMeta
): EditorCanvasDocument {
  const bg = document.objects.find((o) => o.id === "background");
  const finalLayers = semanticLayers.map((layer) => {
    const canvas = semanticLayerToCanvasLayer(layer, document.sourceKind, document.backgroundUrl);
    if (canvas.id === "background" && bg) {
      return {
        ...canvas,
        previewUrl: bg.previewUrl,
        storageKey: bg.storageKey,
        assetId: bg.assetId,
      };
    }
    return canvas;
  });

  const objectCount = countNonBackgroundLayers(finalLayers);
  const detectionMeta: EditorDetectionMeta = {
    ...meta,
    count: objectCount,
    noObjectsFound: objectCount === 0,
    userMessageKey: objectCount === 0 ? "editor.detectionBootstrap.noObjects" : undefined,
    bootstrapAttempted: true,
  };

  const detectedObjects = buildEditorObjectsFromLayers(finalLayers, {
    visionObjectType: vision.objectType,
  });

  return {
    ...document,
    workflowStep: "visual_editor",
    visionAnalysisHash: vision.identityFingerprint.fingerprintHash,
    objects: finalLayers,
    semanticLayers,
    detectedObjects,
    textLayers: extractEditorTextLayers(finalLayers),
    motionPreparations: buildEditorMotionPreparations(detectedObjects, finalLayers),
    detectionMeta,
    visionMetrics: getEditorVisionMetricsSnapshot(),
    assetProfile: buildEditorAssetProfile(
      { ...document, objects: finalLayers, detectedObjects },
      vision
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * After upload / library open: always attempt ONNX + vision, then brand-sheet or heuristic fallback.
 */
export async function bootstrapEditorObjectDetection(
  document: EditorCanvasDocument
): Promise<EditorCanvasDocument> {
  const onnxResult = await detectEditorObjectsApi(document.backgroundUrl);

  const visionRes = await analyzeAssetStyleDnaApi({
    imageUrl: document.backgroundUrl,
    sourceKind: bootstrapStudioSourceKind(document),
    sourceName: document.name,
    derivationJobId: document.sessionId,
  });

  const { vision, styleDna, visionAnalyzeOk } = resolveEditorBootstrapVision(document, visionRes);

  if (visionAnalyzeOk) {
    const hybrid = buildEditorSemanticLayersFromHybrid({
      vision,
      styleDna,
      sourceKind: document.sourceKind,
      onnxDetections: onnxResult.detections,
      detectorKind: onnxResult.detectorKind,
    });

    const layers = seedEditorLayersFromVision({
      vision,
      styleDna,
      sourceKind: document.sourceKind,
      preserveBackground: document.objects.find((o) => o.id === "background"),
      onnxDetections: onnxResult.detections,
      detectorKind: onnxResult.detectorKind,
    });

    const objectCount = countNonBackgroundLayers(layers);
    if (objectCount > 0) {
      const detectedObjects = buildEditorObjectsFromLayers(layers, {
        visionObjectType: vision.objectType,
      });
      return {
        ...document,
        workflowStep: "visual_editor",
        visionAnalysisHash: vision.identityFingerprint.fingerprintHash,
        objects: layers,
        semanticLayers: hybrid.layers,
        detectedObjects,
        textLayers: extractEditorTextLayers(layers),
        motionPreparations: buildEditorMotionPreparations(detectedObjects, layers),
        detectionMeta: {
          source: hybrid.meta.source,
          count: objectCount,
          onnxAvailable: hybrid.meta.onnxAvailable,
          detectorKind: hybrid.meta.detectorKind,
          bootstrapAttempted: true,
        },
        visionMetrics: getEditorVisionMetricsSnapshot(),
        assetProfile: buildEditorAssetProfile(
          { ...document, objects: layers, detectedObjects },
          vision
        ),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (onnxResult.detections.length > 0) {
    const hybrid = buildEditorSemanticLayersFromHybrid({
      vision,
      styleDna,
      sourceKind: document.sourceKind,
      onnxDetections: onnxResult.detections,
      detectorKind: onnxResult.detectorKind,
    });
    const layers = seedEditorLayersFromVision({
      vision,
      styleDna,
      sourceKind: document.sourceKind,
      preserveBackground: document.objects.find((o) => o.id === "background"),
      onnxDetections: onnxResult.detections,
      detectorKind: onnxResult.detectorKind,
    });
    const objectCount = countNonBackgroundLayers(layers);
    if (objectCount > 0) {
      const detectedObjects = buildEditorObjectsFromLayers(layers, {
        visionObjectType: vision.objectType,
      });
      return {
        ...document,
        workflowStep: "visual_editor",
        objects: layers,
        semanticLayers: hybrid.layers,
        detectedObjects,
        textLayers: extractEditorTextLayers(layers),
        motionPreparations: buildEditorMotionPreparations(detectedObjects, layers),
        detectionMeta: {
          source: "onnx_only",
          count: objectCount,
          onnxAvailable: true,
          detectorKind: onnxResult.detectorKind,
          bootstrapAttempted: true,
        },
        visionMetrics: getEditorVisionMetricsSnapshot(),
        assetProfile: buildEditorAssetProfile(
          { ...document, objects: layers, detectedObjects },
          vision
        ),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (
    isBrandSheetLayout({
      name: document.name,
      vision: visionAnalyzeOk ? vision : null,
      featureCount: vision.keyFeatures.length,
    })
  ) {
    const semanticLayers = buildBrandSheetSemanticLayers({
      vision: visionAnalyzeOk ? vision : null,
      sourceKind: document.sourceKind,
    });
    return buildLayersFromSemantic(document, semanticLayers, vision, {
      source: "brand_sheet",
      count: semanticLayers.filter((l) => l.type !== "background").length,
      onnxAvailable: onnxResult.available,
      detectorKind: onnxResult.detectorKind,
    });
  }

  const semanticLayers = buildBrandSheetSemanticLayers({
    vision,
    sourceKind: document.sourceKind,
  });

  return buildLayersFromSemantic(document, semanticLayers, vision, {
    source: "heuristic",
    count: semanticLayers.filter((l) => l.type !== "background").length,
    onnxAvailable: onnxResult.available,
    detectorKind: onnxResult.detectorKind,
  });
}
