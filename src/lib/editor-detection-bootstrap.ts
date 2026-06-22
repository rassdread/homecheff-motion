import {
  editorAnalysisAppliesToBackground,
  stampEditorAnalyzedBackground,
} from "@/lib/editor-analysis-reset";
import {
  analyzeEditorPremiumStyleDnaApi,
  type EditorPremiumStyleDnaApiResult,
} from "@/lib/editor-vision-style-dna-client";
import {
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
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
  buildLocalProvisionalPartAnalysis,
  buildTemplateIllustrationPartAnalysis,
  mergeOpenAiIllustrationParts,
  shouldRunIllustrationPartAnalysis,
} from "@/lib/editor-vision-v6-part-analysis";
import { mergeIllustrationPartsWithVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import { fetchIllustrationPartsApiWithTimeout } from "@/lib/editor-vision-v6-client";
import {
  documentHasCompletedFullVisionAnalysis,
  documentHasRichVisionAnalysis,
  countVisionHierarchyNodes,
  isWeakBackgroundOnlyAnalysis,
  traceVisionHierarchyStage,
} from "@/lib/editor-vision-v6-stability";
import {
  resetVisionHierarchyLossTrace,
  traceMergeStyleDnaRefinementStage,
  traceVisionHierarchyRegression,
  traceVisionPartsApiStage,
} from "@/lib/editor-vision-hierarchy-loss-trace";
import {
  markVisionPartsPipelineStarted,
  traceVisionPartsLossStage,
} from "@/lib/editor-vision-parts-loss-trace";
import {
  readCachedEditorAnalysis,
  writeCachedEditorAnalysis,
} from "@/lib/editor-analysis-cache";
import {
  readCachedAnalysisMatchesCurrentRun,
  resolveEditorVisionAnalysisDepth,
  type EditorVisionAnalysisPipelineStage,
  type EditorVisionAnalysisRunScope,
} from "@/lib/editor-vision-analysis-run";
import {
  normalizeEditorVisionAnalysisTier,
  stampDocumentAnalysisTier,
} from "@/lib/editor-vision-analysis-tier";
import {
  sanitizeDocumentForAssetIsolation,
  stampEditorAnalysisIsolationScope,
} from "@/lib/editor-project-isolation";
import {
  beginEditorAnalysisStage,
  endEditorAnalysisStage,
  timeEditorAnalysisStage,
} from "@/lib/editor-analysis-performance";
import { getEditorVisionMetricsSnapshot } from "@/lib/editor-vision-metrics";
import { traceVisionPipeline } from "@/lib/editor-vision-trace";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorDetectionMeta,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";

export type EditorDetectionBootstrapOptions = {
  onStage?: (stage: EditorVisionAnalysisPipelineStage) => void;
  onProgress?: (document: EditorCanvasDocument) => void;
  runScope?: EditorVisionAnalysisRunScope;
  trigger?: import("@/lib/editor-vision-analysis-run-guard").VisionAnalysisRunTrigger;
  /** full = Vision Parts + accessories + truth hierarchy; provisional = UI-only partials */
  analysisDepth?: import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisDepth;
};

/** Hard cap — finalize with best available local/provisional result. */
export const BOOTSTRAP_MAX_MS = 25_000;
/** Per-stage cap for Style DNA — never blocks provisional UI. */
export const BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS = 12_000;

type BootstrapLayerRoute = {
  layerDoc: EditorCanvasDocument;
  semanticLayers: EditorSemanticLayer[];
};

type StyleDnaResolved = ReturnType<typeof resolveEditorBootstrapVision>;

const STYLE_DNA_TIMEOUT_RESULT = {
  ok: false,
  status: 504,
  error: "style_dna_timeout",
} as unknown as EditorPremiumStyleDnaApiResult;

type IllustrationEnrichResult = {
  document: EditorCanvasDocument;
  needsDeepAnalysis: boolean;
  fallbackUsed?: boolean;
  visionPartsTimedOut?: boolean;
  terminalStateReason?: string;
};

function emptyOnnxResult(): EditorDetectApiResponse {
  return {
    detections: [],
    failed: true,
    available: false,
    backend: "unavailable",
    status: "unavailable",
    inferenceMs: 0,
    detectedAt: new Date().toISOString(),
  };
}

async function withStageTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS,
  traceLabel?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;
  try {
    return await Promise.race([
      promise.then((value) => {
        settled = true;
        return value;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (!settled && traceLabel) {
            traceVisionPipeline(`${traceLabel}_TIMEOUT`, { ms });
          }
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function traceRtdetrDetect(
  sessionId: string,
  backgroundUrl: string
): Promise<EditorDetectApiResponse> {
  traceVisionPipeline("RTDETR_START", { sessionId });
  try {
    const result = await timeEditorAnalysisStage(sessionId, "rtdetr_detect", () =>
      detectEditorObjectsApi(backgroundUrl)
    );
    traceVisionPipeline("RTDETR_COMPLETE", {
      sessionId,
      detections: result.detections.length,
      backend: result.backend,
    });
    return result;
  } catch (error) {
    traceVisionPipeline("RTDETR_FAILED", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function buildPremiumBillingContext(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
) {
  return {
    analysisRunId: options?.runScope?.runId ?? document.visionAnalysisRun?.runId ?? null,
    analysisId: options?.runScope?.analysisId ?? document.isolationScope?.analysisId ?? null,
    sessionId: document.sessionId,
    projectId: resolveEditorProjectId(document),
    assetId: resolveEditorAssetId(document),
  };
}

async function traceStyleDnaAnalyze(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
): Promise<EditorPremiumStyleDnaApiResult> {
  traceVisionPipeline("STYLE_DNA_START", {
    sessionId: document.sessionId,
    imageUrl: document.backgroundUrl,
  });
  try {
    const result = await timeEditorAnalysisStage(document.sessionId, "style_dna_analyze", () =>
      analyzeEditorPremiumStyleDnaApi({
        imageUrl: document.backgroundUrl,
        sourceKind: bootstrapStudioSourceKind(document),
        sourceName: document.name,
        derivationJobId: document.sessionId,
        billingContext: buildPremiumBillingContext(document, options),
      })
    );
    if (result.ok) {
      traceVisionPipeline("STYLE_DNA_COMPLETE", {
        sessionId: document.sessionId,
        objectType: result.data.visionAnalysis.objectType,
      });
    } else {
      traceVisionPipeline("STYLE_DNA_FAILED", {
        sessionId: document.sessionId,
        status: "status" in result ? result.status : undefined,
        error: "error" in result ? result.error : undefined,
      });
    }
    return result;
  } catch (error) {
    traceVisionPipeline("STYLE_DNA_FAILED", {
      sessionId: document.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function applyLocalPartsToDocument(
  document: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  onnxResult: EditorDetectApiResponse
): EditorCanvasDocument {
  const partContext = {
    documentName: document.name,
    semanticLayerLabels: document.semanticLayers?.map((l) => l.label) ?? [],
    sourceKind: document.sourceKind,
  };
  const analysis = buildLocalProvisionalPartAnalysis(vision, onnxResult.detections, partContext);
  return applyIllustrationPartAnalysisToDocument({
    document,
    vision,
    detections: onnxResult.detections,
    analysis,
    previewUrl: document.backgroundUrl,
    sourceKind: document.sourceKind,
  });
}

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
  if (!document.backgroundUrl?.trim()) {
    return false;
  }
  if (documentHasCompletedFullVisionAnalysis(document)) {
    return false;
  }
  return true;
}

function stampBootstrapRunMeta(
  document: EditorCanvasDocument,
  options: EditorDetectionBootstrapOptions | undefined,
  patch: Partial<import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisRunMeta>
): EditorCanvasDocument {
  const scope = options?.runScope;
  if (!scope) {
    return document;
  }
  const existing = document.visionAnalysisRun;
  return {
    ...document,
    visionAnalysisRun: {
      runId: scope.runId,
      analysisId: scope.analysisId,
      assetId: scope.assetId,
      projectId: scope.projectId,
      backgroundUrl: scope.backgroundUrl,
      sessionId: scope.sessionId,
      status: existing?.status ?? "detecting",
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      pipelineCalls: existing?.pipelineCalls ?? 0,
      duplicateRunCount: existing?.duplicateRunCount ?? 0,
      sourceOrder: existing?.sourceOrder ?? [],
      isPartial: existing?.isPartial ?? false,
      ...existing,
      ...patch,
    },
  };
}

function emitEnrichedProgress(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions,
  patch?: Partial<import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisRunMeta>
): void {
  traceVisionPipeline("ENRICHED_EMIT", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
    mergedParts: document.visionV6Meta?.mergedAnalysisParts?.length ?? 0,
    hierarchyCount: countVisionHierarchyNodes(document.visionHierarchy),
  });
  const stamped = stampBootstrapRunMeta(document, options, {
    status: "partial",
    isPartial: true,
    lastStage: "vision_parts_api",
    sourceOrder: ["rtdetr", "provisional", "vision_parts_api"],
    ...patch,
  });
  options?.onProgress?.(stamped);
  options?.onStage?.("vision_parts_api");
}

function emitProvisionalProgress(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
): void {
  traceVisionPipeline("PROVISIONAL_EMIT", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
    hierarchyCount: countVisionHierarchyNodes(document.visionHierarchy),
  });
  const stamped = stampBootstrapRunMeta(document, options, {
    status: "partial",
    isPartial: true,
    lastStage: "provisional",
    sourceOrder: ["rtdetr", "provisional"],
  });
  options?.onProgress?.(stamped);
  options?.onStage?.("provisional");
}

function buildDetectedLayerDocument(
  document: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  styleDna: AssetStyleDna | null,
  onnxResult: EditorDetectApiResponse,
  metaSource: EditorDetectionMeta["source"]
): EditorCanvasDocument | null {
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
  if (objectCount === 0) {
    return null;
  }

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
    detectionMeta: buildEditorDetectionMeta({
      detection: onnxResult,
      source: metaSource,
      objectCount,
    }),
    visionMetrics: getEditorVisionMetricsSnapshot(),
    assetProfile: buildEditorAssetProfile({ ...document, objects: layers, detectedObjects }, vision),
    visionAnalysis: vision,
    updatedAt: new Date().toISOString(),
  };
}

function shouldApplyLocalProvisionalFallback(
  document: EditorCanvasDocument,
  onnxResult: EditorDetectApiResponse
): boolean {
  if (onnxResult.detections.length === 0) {
    return false;
  }
  if (document.visionV6Meta?.openAiPartsUsed) {
    return false;
  }
  if (documentHasCompletedFullVisionAnalysis(document)) {
    return false;
  }
  return isWeakBackgroundOnlyAnalysis(document);
}

function applyLocalProvisionalParts(
  layerDocument: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  onnxResult: EditorDetectApiResponse,
  options?: EditorDetectionBootstrapOptions
): EditorCanvasDocument {
  const partContext = {
    documentName: layerDocument.name,
    semanticLayerLabels: layerDocument.semanticLayers?.map((l) => l.label) ?? [],
    sourceKind: layerDocument.sourceKind,
  };
  const analysis = buildLocalProvisionalPartAnalysis(vision, onnxResult.detections, partContext);
  const enriched = applyIllustrationPartAnalysisToDocument({
    document: layerDocument,
    vision,
    detections: onnxResult.detections,
    analysis,
    previewUrl: layerDocument.backgroundUrl,
    sourceKind: layerDocument.sourceKind,
  });
  const provisional = stampBootstrapRunMeta(enriched, options, {
    status: "partial",
    isPartial: true,
    lastStage: "provisional",
  });
  emitProvisionalProgress(provisional, options);
  return provisional;
}

/**
 * Vision analyze is optional for Editor bootstrap — 4xx/405/network failures fall back to
 * heuristic/brand-sheet layers; Replicate prompt segmentation does not depend on this call.
 */
export function resolveEditorBootstrapVision(
  document: EditorCanvasDocument,
  visionRes: EditorPremiumStyleDnaApiResult
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
  semanticLayers: EditorSemanticLayer[],
  options?: EditorDetectionBootstrapOptions
): Promise<IllustrationEnrichResult> {
  const partContext = {
    documentName: document.name,
    semanticLayerLabels: semanticLayers.map((l) => l.label),
    sourceKind: document.sourceKind,
  };
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
    options?.onStage?.("truth_classifier");
    traceVisionPartsApiStage({
      sessionId: document.sessionId,
      partsLength: 0,
      source: "skipped",
    });
    const localDoc = applyLocalPartsToDocument(document, vision, onnxResult);
    traceVisionHierarchyRegression("vision_parts", { document: localDoc });
    return {
      document: localDoc,
      needsDeepAnalysis: true,
      fallbackUsed: true,
      terminalStateReason: "vision_parts_skipped_local_only",
    };
  }

  const template = buildTemplateIllustrationPartAnalysis(vision, partContext);
  const visionPartsStartedAt = new Date().toISOString();

  options?.onStage?.("vision_parts_api");
  markVisionPartsPipelineStarted(document.sessionId, {
    runId: options?.runScope?.runId,
    analysisId: options?.runScope?.analysisId,
    scopeKey: options?.runScope
      ? `${options.runScope.sessionId}::${options.runScope.assetId}::${options.runScope.analysisId}`
      : undefined,
    trigger: options?.trigger ?? null,
  });
  traceVisionPipeline("VISION_PARTS_START", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
  });
  let apiAnalysis: Awaited<ReturnType<typeof fetchIllustrationPartsApiWithTimeout>> = null;
  let visionPartsTimedOut = false;
  try {
    apiAnalysis = await timeEditorAnalysisStage(document.sessionId, "vision_parts_api", async () =>
      fetchIllustrationPartsApiWithTimeout({
        imageUrl: document.backgroundUrl,
        vision,
        detections: onnxResult.detections,
        billingContext: buildPremiumBillingContext(document, options),
      })
    );
    visionPartsTimedOut = apiAnalysis == null;
    if (visionPartsTimedOut) {
      traceVisionPipeline("VISION_PARTS_TIMEOUT", { sessionId: document.sessionId });
    } else {
      traceVisionPipeline("VISION_PARTS_COMPLETE", {
        sessionId: document.sessionId,
        parts: apiAnalysis?.parts.length ?? 0,
      });
      if (apiAnalysis?.parts?.length) {
        traceVisionPartsLossStage("vision_parts_api_raw", {
          sessionId: document.sessionId,
          runId: options?.runScope?.runId,
          parts: apiAnalysis.parts,
          sampleLabels: apiAnalysis.parts.map((part) => part.label),
        });
      }
    }
  } catch (error) {
    visionPartsTimedOut = true;
    apiAnalysis = null;
    traceVisionPipeline("VISION_PARTS_FAILED", {
      sessionId: document.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const usedLocalFallback = !apiAnalysis;
  const mergedBase = apiAnalysis
    ? mergeOpenAiIllustrationParts(template, apiAnalysis)
    : buildLocalProvisionalPartAnalysis(vision, onnxResult.detections, partContext);
  const { analysis, taxonomy } = mergeIllustrationPartsWithVisionTaxonomy(mergedBase, {
    vision,
    ...partContext,
  });
  traceVisionPartsLossStage("vision_parts_merged_analysis", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
    parts: analysis.parts,
    sampleLabels: analysis.parts.map((part) => part.label),
  });
  traceVisionPartsApiStage({
    sessionId: document.sessionId,
    partsLength: analysis.parts.length,
    source: usedLocalFallback ? "local_fallback" : "api",
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
  options?.onStage?.("truth_classifier");

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
  let stampedResult = options?.runScope
    ? stampBootstrapRunMeta(result, options, { visionPartsStartedAt, visionPartsTimedOut })
    : result;
  if (shouldApplyLocalProvisionalFallback(stampedResult, onnxResult)) {
    stampedResult = applyLocalProvisionalParts(stampedResult, vision, onnxResult, options);
  }
  traceVisionPartsLossStage("vision_parts_merged_document", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
    analysisId: options?.runScope?.analysisId,
    document: stampedResult,
  });
  emitEnrichedProgress(stampedResult, options, { visionPartsStartedAt, visionPartsTimedOut });
  traceVisionHierarchyRegression("vision_parts", { document: stampedResult });
  return {
    document: stampedResult,
    needsDeepAnalysis: usedLocalFallback,
    fallbackUsed: usedLocalFallback,
    visionPartsTimedOut,
    terminalStateReason: usedLocalFallback ? "vision_parts_local_fallback" : undefined,
  };
}

function buildDetectionMetaPartial(
  onnxResult: EditorDetectApiResponse,
  source: EditorDetectionMeta["source"],
  semanticLayers: EditorSemanticLayer[]
): EditorDetectionMeta {
  const count = semanticLayers.filter((l) => l.type !== "background").length;
  return {
    source,
    count,
    onnxAvailable: onnxResult.available,
    detectorKind: onnxResult.detectorKind,
    backend: onnxResult.backend,
    status: detectionUsedVisionFallback(onnxResult) ? "fallback" : onnxResult.status,
    inferenceMs: onnxResult.inferenceMs,
    lastDetectedAt: onnxResult.detectedAt,
  };
}

function resolveBootstrapLayerRoute(
  document: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  styleDna: AssetStyleDna | null,
  onnxResult: EditorDetectApiResponse,
  visionAnalyzeOk: boolean
): BootstrapLayerRoute {
  if (visionAnalyzeOk) {
    const hybrid = buildEditorSemanticLayersFromHybrid({
      vision,
      styleDna,
      sourceKind: document.sourceKind,
      onnxDetections: onnxResult.detections,
      detectorKind: onnxResult.detectorKind,
    });
    const layerDoc = buildDetectedLayerDocument(document, vision, styleDna, onnxResult, hybrid.meta.source);
    if (layerDoc?.semanticLayers?.length) {
      return { layerDoc, semanticLayers: layerDoc.semanticLayers };
    }
  }

  if (onnxResult.detections.length > 0) {
    const layerDoc = buildDetectedLayerDocument(document, vision, styleDna, onnxResult, "onnx_only");
    if (layerDoc?.semanticLayers?.length) {
      return { layerDoc, semanticLayers: layerDoc.semanticLayers };
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
    return {
      layerDoc: buildLayersFromSemantic(
        document,
        semanticLayers,
        vision,
        buildDetectionMetaPartial(onnxResult, "brand_sheet", semanticLayers),
        onnxResult
      ),
      semanticLayers,
    };
  }

  const semanticLayers = buildBrandSheetSemanticLayers({
    vision,
    sourceKind: document.sourceKind,
  });
  return {
    layerDoc: buildLayersFromSemantic(
      document,
      semanticLayers,
      vision,
      buildDetectionMetaPartial(onnxResult, "heuristic", semanticLayers),
      onnxResult
    ),
    semanticLayers,
  };
}

function shouldPreservePriorVisionEnrichment(document: EditorCanvasDocument): boolean {
  if (document.visionV6Meta?.openAiPartsUsed) {
    return true;
  }
  if (documentHasCompletedFullVisionAnalysis(document)) {
    return true;
  }
  const priorNodes = countVisionHierarchyNodes(document.visionHierarchy);
  if (priorNodes >= 6) {
    return true;
  }
  return false;
}

function mergeStyleDnaRefinement(
  document: EditorCanvasDocument,
  route: BootstrapLayerRoute,
  vision: AssetVisionAnalysis,
  styleDna: AssetStyleDna | null,
  onnxResult: EditorDetectApiResponse
): EditorCanvasDocument {
  const priorSubjects = countNonBackgroundLayers(document.objects);
  const routeSubjects = countNonBackgroundLayers(route.layerDoc.objects);
  const priorHierarchyRich = documentHasCompletedFullVisionAnalysis(document);
  const keepPriorLayers =
    priorSubjects > 0 && (routeSubjects === 0 || (priorHierarchyRich && routeSubjects < priorSubjects));
  const keepPriorVision = shouldPreservePriorVisionEnrichment(document);

  const objects = keepPriorLayers ? document.objects : route.layerDoc.objects;
  const semanticLayers = keepPriorLayers
    ? (document.semanticLayers ?? route.semanticLayers)
    : route.semanticLayers;
  const detectedObjects = keepPriorLayers
    ? (document.detectedObjects ?? route.layerDoc.detectedObjects ?? [])
    : (route.layerDoc.detectedObjects ?? document.detectedObjects ?? []);

  const merged: EditorCanvasDocument = {
    ...document,
    workflowStep: "visual_editor",
    visionAnalysisHash: vision.identityFingerprint.fingerprintHash,
    objects,
    semanticLayers,
    detectedObjects,
    visionHierarchy: keepPriorVision
      ? document.visionHierarchy
      : (route.layerDoc.visionHierarchy ?? document.visionHierarchy),
    visionV6Meta: keepPriorVision
      ? document.visionV6Meta
      : (route.layerDoc.visionV6Meta ?? document.visionV6Meta),
    objectHierarchies: keepPriorVision
      ? document.objectHierarchies
      : (route.layerDoc.objectHierarchies ?? document.objectHierarchies),
    hierarchicalSelection: keepPriorVision
      ? document.hierarchicalSelection
      : (route.layerDoc.hierarchicalSelection ?? document.hierarchicalSelection),
    textLayers: keepPriorLayers
      ? (document.textLayers ?? extractEditorTextLayers(objects))
      : (route.layerDoc.textLayers ?? extractEditorTextLayers(objects)),
    motionPreparations:
      document.motionPreparations ??
      buildEditorMotionPreparations(detectedObjects, objects),
    detectionMeta: keepPriorLayers
      ? (document.detectionMeta ?? route.layerDoc.detectionMeta)
      : (route.layerDoc.detectionMeta ?? document.detectionMeta),
    visionAnalysis: vision,
    visionMetrics: route.layerDoc.visionMetrics ?? document.visionMetrics,
    assetProfile:
      route.layerDoc.assetProfile ??
      buildEditorAssetProfile({ ...document, objects, detectedObjects }, vision),
    updatedAt: new Date().toISOString(),
  };
  traceMergeStyleDnaRefinementStage({ before: document, after: merged });
  traceVisionPartsLossStage("vision_parts_after_style_dna", {
    sessionId: merged.sessionId,
    document: merged,
  });
  void styleDna;
  void onnxResult;
  return merged;
}

function startStyleDnaAnalyze(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
): Promise<StyleDnaResolved> {
  return withStageTimeout(
    traceStyleDnaAnalyze(document, options),
    STYLE_DNA_TIMEOUT_RESULT,
    BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS,
    "STYLE_DNA"
  ).then((visionRes) => resolveEditorBootstrapVision(document, visionRes));
}

async function finalizeFromProvisional(
  provisional: EditorCanvasDocument,
  vision: AssetVisionAnalysis,
  onnxResult: EditorDetectApiResponse,
  semanticLayers: EditorSemanticLayer[],
  options?: EditorDetectionBootstrapOptions,
  extraMeta?: Partial<import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisRunMeta>
): Promise<EditorCanvasDocument> {
  const provisionalCount = countVisionHierarchyNodes(provisional.visionHierarchy);
  try {
    const enriched = await maybeEnrichIllustrationParts(
      provisional,
      vision,
      onnxResult,
      semanticLayers,
      options
    );
    const finalCount = countVisionHierarchyNodes(enriched.document.visionHierarchy);
    return completeBootstrap(enriched.document, options, {
      status: "complete",
      isPartial: false,
      needsDeepAnalysis: enriched.needsDeepAnalysis,
      completedAt: new Date().toISOString(),
      provisionalCount,
      finalCount,
      fallbackUsed: enriched.fallbackUsed,
      visionPartsTimedOut: enriched.visionPartsTimedOut,
      terminalStateReason: enriched.terminalStateReason,
      ...extraMeta,
    });
  } catch (error) {
    return completeBootstrap(provisional, options, {
      status: "complete",
      isPartial: false,
      needsDeepAnalysis: true,
      completedAt: new Date().toISOString(),
      provisionalCount,
      finalCount: provisionalCount,
      fallbackUsed: true,
      terminalStateReason: error instanceof Error ? error.message : "enrich_failed",
      ...extraMeta,
    });
  }
}

function completeBootstrap(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions,
  extraMeta?: Partial<import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisRunMeta>
): EditorCanvasDocument {
  const stamped = stampEditorAnalysisIsolationScope(stampEditorAnalyzedBackground(document));
  traceVisionPipeline("BOOTSTRAP_COMPLETE", {
    sessionId: stamped.sessionId,
    runId: options?.runScope?.runId,
    ...extraMeta,
  });
  endEditorAnalysisStage(stamped.sessionId, "bootstrap_total");
  options?.onStage?.("bootstrap_complete");
  traceVisionHierarchyStage("after_bootstrapEditorObjectDetection", stamped);
  traceVisionPartsLossStage("vision_parts_bootstrap_complete", {
    sessionId: stamped.sessionId,
    runId: options?.runScope?.runId,
    document: stamped,
  });
  writeCachedEditorAnalysis(stamped);
  if (options?.runScope || extraMeta) {
    return stampBootstrapRunMeta(stamped, options, extraMeta ?? {});
  }
  return stamped;
}

function buildBootstrapTimeoutFallback(
  document: EditorCanvasDocument,
  provisional: EditorCanvasDocument | null,
  options?: EditorDetectionBootstrapOptions
): EditorCanvasDocument {
  if (provisional) {
    return completeBootstrap(provisional, options, {
      status: "complete",
      isPartial: false,
      needsDeepAnalysis: true,
      bootstrapTimedOut: true,
      fallbackUsed: true,
      terminalStateReason: "bootstrap_timeout_provisional",
      completedAt: new Date().toISOString(),
      provisionalCount: countVisionHierarchyNodes(provisional.visionHierarchy),
      finalCount: countVisionHierarchyNodes(provisional.visionHierarchy),
    });
  }

  const vision = createFallbackVision(document);
  const onnxResult = emptyOnnxResult();
  const semanticLayers = buildBrandSheetSemanticLayers({
    vision,
    sourceKind: document.sourceKind,
  });
  const base = buildLayersFromSemantic(
    document,
    semanticLayers,
    vision,
    {
      source: "heuristic",
      count: semanticLayers.filter((l) => l.type !== "background").length,
      onnxAvailable: false,
      backend: "unavailable",
      status: "fallback",
      inferenceMs: 0,
      lastDetectedAt: new Date().toISOString(),
    },
    onnxResult
  );
  const local = applyLocalProvisionalParts(base, vision, onnxResult, options);
  return completeBootstrap(local, options, {
    status: "complete",
    isPartial: false,
    needsDeepAnalysis: true,
    bootstrapTimedOut: true,
    fallbackUsed: true,
    terminalStateReason: "bootstrap_timeout_minimal",
    completedAt: new Date().toISOString(),
    provisionalCount: countVisionHierarchyNodes(local.visionHierarchy),
    finalCount: countVisionHierarchyNodes(local.visionHierarchy),
  });
}

/**
 * After upload / library open: always attempt ONNX + vision, then brand-sheet or heuristic fallback.
 */
async function bootstrapEditorObjectDetectionPipeline(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
): Promise<EditorCanvasDocument> {
  const analysisTier = normalizeEditorVisionAnalysisTier(
    resolveEditorVisionAnalysisDepth({
      analysisDepth: options?.analysisDepth,
      trigger: options?.trigger,
    })
  );
  traceVisionPipeline("PIPELINE_START", {
    sessionId: document.sessionId,
    runId: options?.runScope?.runId,
    analysisId: options?.runScope?.analysisId,
    analysisTier,
  });
  beginEditorAnalysisStage(document.sessionId, "bootstrap_total");
  resetVisionHierarchyLossTrace(document.sessionId);

  traceVisionPipeline("RTDETR_AWAIT", { sessionId: document.sessionId });
  const onnxResult = await withStageTimeout(
    traceRtdetrDetect(document.sessionId, document.backgroundUrl),
    emptyOnnxResult(),
    BOOTSTRAP_LOCAL_STAGE_TIMEOUT_MS,
    "RTDETR"
  );

  options?.onStage?.("rtdetr");
  traceVisionPipeline("RTDETR_PROVISIONAL_START", { sessionId: document.sessionId });

  const initialVision = createFallbackVision(document);
  const initialRoute = resolveBootstrapLayerRoute(
    document,
    initialVision,
    null,
    onnxResult,
    false
  );
  const provisional = applyLocalProvisionalParts(
    initialRoute.layerDoc,
    initialVision,
    onnxResult,
    options
  );

  traceVisionHierarchyRegression("provisional", { document: provisional });
  traceVisionPipeline("RTDETR_PROVISIONAL_EMITTED", { sessionId: document.sessionId });
  options?.onProgress?.(provisional);

  if (analysisTier === "basic") {
    const basicDocument = stampDocumentAnalysisTier(provisional, "basic");
    const provisionalCount = countVisionHierarchyNodes(basicDocument.visionHierarchy);
    return completeBootstrap(basicDocument, options, {
      status: "complete",
      isPartial: false,
      needsDeepAnalysis: true,
      completedAt: new Date().toISOString(),
      provisionalCount,
      finalCount: provisionalCount,
      fallbackUsed: false,
      terminalStateReason: "basic_analysis_only",
    });
  }

  // Premium: Style DNA + Vision Parts API finalize in parallel — provisional already visible.
  const styleDnaPromise = startStyleDnaAnalyze(document, options);

  const enrichPromise = maybeEnrichIllustrationParts(
    provisional,
    initialVision,
    onnxResult,
    initialRoute.semanticLayers,
    options
  );

  const styleDnaResolvedPromise = styleDnaPromise.then((resolved) => {
    options?.onStage?.("style_dna");
    traceVisionPipeline("STYLE_DNA_RESOLVED", {
      sessionId: document.sessionId,
      visionAnalyzeOk: resolved.visionAnalyzeOk,
    });
    return resolved;
  });

  const [enriched, styleResolved] = await Promise.all([enrichPromise, styleDnaResolvedPromise]);

  let finalDocument = enriched.document;
  const styleDnaTimedOut = !styleResolved.visionAnalyzeOk;

  if (styleResolved.visionAnalyzeOk) {
    const refinedRoute = resolveBootstrapLayerRoute(
      document,
      styleResolved.vision,
      styleResolved.styleDna,
      onnxResult,
      true
    );
    finalDocument = mergeStyleDnaRefinement(
      finalDocument,
      refinedRoute,
      styleResolved.vision,
      styleResolved.styleDna,
      onnxResult
    );
    if (shouldApplyLocalProvisionalFallback(finalDocument, onnxResult)) {
      finalDocument = applyLocalProvisionalParts(
        finalDocument,
        styleResolved.vision,
        onnxResult,
        options
      );
    }
  }

  finalDocument = stampDocumentAnalysisTier(finalDocument, "premium");

  const provisionalCount = countVisionHierarchyNodes(provisional.visionHierarchy);
  const finalCount = countVisionHierarchyNodes(finalDocument.visionHierarchy);

  return completeBootstrap(finalDocument, options, {
    status: "complete",
    isPartial: false,
    needsDeepAnalysis: enriched.needsDeepAnalysis || styleDnaTimedOut,
    completedAt: new Date().toISOString(),
    provisionalCount,
    finalCount,
    fallbackUsed: enriched.fallbackUsed || styleDnaTimedOut,
    visionPartsTimedOut: enriched.visionPartsTimedOut,
    terminalStateReason:
      enriched.terminalStateReason ??
      (styleDnaTimedOut ? "style_dna_timeout" : undefined),
  });
}

export async function bootstrapEditorObjectDetection(
  document: EditorCanvasDocument,
  options?: EditorDetectionBootstrapOptions
): Promise<EditorCanvasDocument> {
  const isolated = sanitizeDocumentForAssetIsolation(document);
  const analysisDepth = resolveEditorVisionAnalysisDepth({
    analysisDepth: options?.analysisDepth,
    trigger: options?.trigger,
  });
  const analysisTier = normalizeEditorVisionAnalysisTier(analysisDepth);
  const cached = readCachedEditorAnalysis(isolated);
  if (cached && readCachedAnalysisMatchesCurrentRun(isolated, cached)) {
    const cacheRichEnough =
      analysisTier === "basic"
        ? cached.visionV6Meta?.analysisTier !== "premium" &&
          Boolean(cached.detectionMeta?.lastDetectedAt)
        : documentHasCompletedFullVisionAnalysis(cached);
    if (cacheRichEnough) {
      options?.onStage?.("bootstrap_complete");
      traceVisionHierarchyStage("bootstrap_cache_hit", cached);
      return completeBootstrap(cached, options, {
        cachedResult: true,
        status: "complete",
        isPartial: false,
        completedAt: cached.visionAnalysisRun?.completedAt ?? new Date().toISOString(),
      });
    }
  }
  if (
    analysisTier === "premium" &&
    isolated.visionV6Meta?.analysisTier === "premium" &&
    documentHasCompletedFullVisionAnalysis(isolated)
  ) {
    options?.onStage?.("bootstrap_complete");
    traceVisionHierarchyStage("bootstrap_skip_already_rich", isolated);
    return completeBootstrap(isolated, options, { status: "complete", isPartial: false });
  }

  let latestProvisional: EditorCanvasDocument | null = null;
  let settled = false;
  const wrappedOptions: EditorDetectionBootstrapOptions = {
    ...options,
    onProgress: (partial) => {
      latestProvisional = partial;
      options?.onProgress?.(partial);
    },
  };

  const pipelinePromise = bootstrapEditorObjectDetectionPipeline(document, wrappedOptions)
    .then((result) => {
      settled = true;
      return result;
    })
    .catch((error: unknown) => {
      settled = true;
      if (latestProvisional) {
        return completeBootstrap(latestProvisional, wrappedOptions, {
          status: "complete",
          isPartial: false,
          needsDeepAnalysis: true,
          fallbackUsed: true,
          terminalStateReason: error instanceof Error ? error.message : "bootstrap_error",
          completedAt: new Date().toISOString(),
          provisionalCount: countVisionHierarchyNodes(latestProvisional.visionHierarchy),
          finalCount: countVisionHierarchyNodes(latestProvisional.visionHierarchy),
        });
      }
      throw error;
    });

  const timeoutPromise = new Promise<EditorCanvasDocument>((resolve) => {
    setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      traceVisionPipeline("BOOTSTRAP_RACE_TIMEOUT", {
        sessionId: document.sessionId,
        hasProvisional: Boolean(latestProvisional),
        ms: BOOTSTRAP_MAX_MS,
      });
      resolve(buildBootstrapTimeoutFallback(document, latestProvisional, wrappedOptions));
    }, BOOTSTRAP_MAX_MS);
  });

  return Promise.race([pipelinePromise, timeoutPromise]);
}
