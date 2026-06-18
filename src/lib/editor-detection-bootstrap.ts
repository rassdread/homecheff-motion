import {
  editorAnalysisAppliesToBackground,
  stampEditorAnalyzedBackground,
} from "@/lib/editor-analysis-reset";
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
import { detectEditorObjectsApi, type EditorDetectApiResponse } from "@/lib/editor-vision-v3-client";
import { buildEditorDetectionMeta, detectionUsedVisionFallback } from "@/lib/editor-detection-meta";
import {
  applyIllustrationPartAnalysisToDocument,
  buildTemplateIllustrationPartAnalysis,
  mergeOpenAiIllustrationParts,
  shouldRunIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import { mergeIllustrationPartsWithVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import { fetchIllustrationPartsApi } from "@/lib/editor-vision-v6-client";
import {
  documentHasRichVisionAnalysis,
  traceVisionHierarchyStage,
} from "@/lib/editor-vision-v6-stability";
import {
  readCachedEditorAnalysis,
  writeCachedEditorAnalysis,
} from "@/lib/editor-analysis-cache";
import {
  beginEditorAnalysisStage,
  endEditorAnalysisStage,
  timeEditorAnalysisStage,
} from "@/lib/editor-analysis-performance";
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
  if (documentHasRichVisionAnalysis(document) && editorAnalysisAppliesToBackground(document)) {
    return false;
  }
  if (
    !editorAnalysisAppliesToBackground(document) &&
    (documentHasRichVisionAnalysis(document) ||
      (document.detectionMeta?.count ?? 0) > 0 ||
      countNonBackgroundLayers(document.objects) > 0)
  ) {
    return true;
  }
  if ((document.detectionMeta?.count ?? 0) > 0 && countNonBackgroundLayers(document.objects) > 0) {
    return false;
  }
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
  meta: EditorDetectionMeta,
  detection?: EditorDetectApiResponse
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
  const detectionMeta = detection
    ? buildEditorDetectionMeta({
        detection,
        source: meta.source,
        objectCount,
      })
    : buildEditorDetectionMeta({
        detection: {
          detections: [],
          available: meta.onnxAvailable,
          backend: meta.backend ?? "fallback",
          status: meta.status ?? "fallback",
          inferenceMs: meta.inferenceMs ?? 0,
          detectedAt: meta.lastDetectedAt ?? new Date().toISOString(),
          failed: meta.status === "unavailable",
        },
        source: meta.source,
        objectCount,
      });

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
    visionAnalysis: vision,
    visionMetrics: getEditorVisionMetricsSnapshot(),
    assetProfile: buildEditorAssetProfile(
      { ...document, objects: finalLayers, detectedObjects },
      vision
    ),
    updatedAt: new Date().toISOString(),
  };
}

async function maybeEnrichIllustrationParts(
  document: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  onnxResult: EditorDetectApiResponse,
  semanticLayers: EditorSemanticLayer[]
): Promise<EditorCanvasDocument> {
  const layerCount = semanticLayers.filter((l) => l.type !== "background").length;
  if (
    !shouldRunIllustrationPartAnalysis({
      vision,
      detections: onnxResult.detections,
      semanticLayerCount: layerCount,
      sourceKind: document.sourceKind,
      documentName: document.name,
      semanticLayerLabels: semanticLayers.map((l) => l.label),
    })
  ) {
    return document;
  }

  const partContext = {
    documentName: document.name,
    semanticLayerLabels: semanticLayers.map((l) => l.label),
    sourceKind: document.sourceKind,
  };
  const template = buildTemplateIllustrationPartAnalysis(vision, partContext);

  const apiAnalysis =
    (await timeEditorAnalysisStage(document.sessionId, "vision_parts_api", async () =>
      fetchIllustrationPartsApi({
        imageUrl: document.backgroundUrl,
        vision,
        detections: onnxResult.detections,
      })
    )) ?? null;

  const mergedBase = apiAnalysis
    ? mergeOpenAiIllustrationParts(template, apiAnalysis)
    : template;
  const { analysis, taxonomy } = mergeIllustrationPartsWithVisionTaxonomy(mergedBase, {
    vision,
    ...partContext,
  });

  traceVisionHierarchyStage("after_fetchIllustrationPartsApi", {
    ...document,
    visionV6Meta: {
      illustrationAnalysis: true,
      rtdetrCount: onnxResult.detections.length,
      visionPartCount: analysis.parts.length,
      mergedLayerCount: analysis.parts.length,
      openAiPartsUsed: analysis.openAiUsed,
      layerSources: [],
      taxonomyType: taxonomy?.type,
    },
  });

  const enriched = applyIllustrationPartAnalysisToDocument({
    document,
    vision,
    detections: onnxResult.detections,
    analysis,
    previewUrl: document.backgroundUrl,
    sourceKind: document.sourceKind,
  });

  const detectedObjects = enriched.detectedObjects ?? [];
  traceVisionHierarchyStage("after_applyIllustrationPartAnalysisToDocument", enriched);
  const result = {
    ...enriched,
    detectionMeta: document.detectionMeta ?? enriched.detectionMeta,
    visionMetrics: document.visionMetrics ?? enriched.visionMetrics,
    assetProfile:
      document.assetProfile ??
      buildEditorAssetProfile(
        { ...enriched, objects: enriched.objects, detectedObjects },
        vision
      ),
    textLayers: extractEditorTextLayers(enriched.objects),
    motionPreparations: buildEditorMotionPreparations(detectedObjects, enriched.objects),
    updatedAt: new Date().toISOString(),
  };
  traceVisionHierarchyStage("after_maybeEnrichIllustrationParts", result);
  return completeBootstrap(result);
}

function completeBootstrap(document: EditorCanvasDocument): EditorCanvasDocument {
  const stamped = stampEditorAnalyzedBackground(document);
  endEditorAnalysisStage(stamped.sessionId, "bootstrap_total");
  traceVisionHierarchyStage("after_bootstrapEditorObjectDetection", stamped);
  writeCachedEditorAnalysis(stamped);
  return stamped;
}

/**
 * After upload / library open: always attempt ONNX + vision, then brand-sheet or heuristic fallback.
 */
export async function bootstrapEditorObjectDetection(
  document: EditorCanvasDocument
): Promise<EditorCanvasDocument> {
  const cached = readCachedEditorAnalysis(document);
  if (cached) {
    traceVisionHierarchyStage("bootstrap_cache_hit", cached);
    return completeBootstrap(cached);
  }
  if (documentHasRichVisionAnalysis(document) && editorAnalysisAppliesToBackground(document)) {
    traceVisionHierarchyStage("bootstrap_skip_already_rich", document);
    return completeBootstrap(document);
  }

  beginEditorAnalysisStage(document.sessionId, "bootstrap_total");

  const onnxResult = await timeEditorAnalysisStage(
    document.sessionId,
    "rtdetr_detect",
    () => detectEditorObjectsApi(document.backgroundUrl)
  );

  const visionRes = await timeEditorAnalysisStage(
    document.sessionId,
    "style_dna_analyze",
    () =>
      analyzeAssetStyleDnaApi({
        imageUrl: document.backgroundUrl,
        sourceKind: bootstrapStudioSourceKind(document),
        sourceName: document.name,
        derivationJobId: document.sessionId,
      })
  );

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
      return completeBootstrap(
        await maybeEnrichIllustrationParts(
        {
          ...document,
          workflowStep: "visual_editor",
          visionAnalysisHash: vision.identityFingerprint.fingerprintHash,
          objects: layers,
          semanticLayers: hybrid.layers,
          detectedObjects,
          textLayers: extractEditorTextLayers(layers),
          motionPreparations: buildEditorMotionPreparations(detectedObjects, layers),
          detectionMeta: buildEditorDetectionMeta({
            detection: onnxResult,
            source: hybrid.meta.source,
            objectCount,
          }),
          visionMetrics: getEditorVisionMetricsSnapshot(),
          assetProfile: buildEditorAssetProfile(
            { ...document, objects: layers, detectedObjects },
            vision
          ),
          visionAnalysis: vision,
          updatedAt: new Date().toISOString(),
        },
        vision,
        onnxResult,
        hybrid.layers
      ));
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
      return completeBootstrap(
        await maybeEnrichIllustrationParts(
        {
          ...document,
          workflowStep: "visual_editor",
          objects: layers,
          semanticLayers: hybrid.layers,
          detectedObjects,
          textLayers: extractEditorTextLayers(layers),
          motionPreparations: buildEditorMotionPreparations(detectedObjects, layers),
          detectionMeta: buildEditorDetectionMeta({
            detection: onnxResult,
            source: "onnx_only",
            objectCount,
          }),
          visionMetrics: getEditorVisionMetricsSnapshot(),
          assetProfile: buildEditorAssetProfile(
            { ...document, objects: layers, detectedObjects },
            vision
          ),
          visionAnalysis: vision,
          updatedAt: new Date().toISOString(),
        },
        vision,
        onnxResult,
        hybrid.layers
      ));
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
    return completeBootstrap(
      await maybeEnrichIllustrationParts(
      buildLayersFromSemantic(
        document,
        semanticLayers,
        vision,
        {
          source: "brand_sheet",
          count: semanticLayers.filter((l) => l.type !== "background").length,
          onnxAvailable: onnxResult.available,
          detectorKind: onnxResult.detectorKind,
          backend: onnxResult.backend,
          status: detectionUsedVisionFallback(onnxResult) ? "fallback" : onnxResult.status,
          inferenceMs: onnxResult.inferenceMs,
          lastDetectedAt: onnxResult.detectedAt,
        },
        onnxResult
      ),
      vision,
      onnxResult,
      semanticLayers
    ));
  }

  const semanticLayers = buildBrandSheetSemanticLayers({
    vision,
    sourceKind: document.sourceKind,
  });

  return completeBootstrap(
    await maybeEnrichIllustrationParts(
    buildLayersFromSemantic(
      document,
      semanticLayers,
      vision,
      {
        source: "heuristic",
        count: semanticLayers.filter((l) => l.type !== "background").length,
        onnxAvailable: onnxResult.available,
        detectorKind: onnxResult.detectorKind,
        backend: onnxResult.backend,
        status: detectionUsedVisionFallback(onnxResult) ? "fallback" : onnxResult.status,
        inferenceMs: onnxResult.inferenceMs,
        lastDetectedAt: onnxResult.detectedAt,
      },
      onnxResult
    ),
    vision,
    onnxResult,
    semanticLayers
  ));
}
