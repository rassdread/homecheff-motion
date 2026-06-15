import { clearCachedEditorAnalysis } from "@/lib/editor-analysis-cache";
import { resetEditorAnalysisTimings } from "@/lib/editor-analysis-performance";
import { createDefaultHierarchicalSelection } from "@/lib/editor-hierarchical-selection";
import { clearStickyVisionHierarchyForSession } from "@/lib/editor-vision-v6-stability";
import type { EditorInstructionStudioState } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorAnalysisResetOptions = {
  /** Keep combine/fusion/hc-project workflow fields on instructionStudioState. */
  preserveInstructionWorkflow?: boolean;
};

function backgroundOnlyLayer(document: EditorCanvasDocument): EditorCanvasLayer {
  const existing = document.objects.find((layer) => layer.id === "background");
  return {
    id: "background",
    label: "Background",
    sourceKind: document.sourceKind,
    assetId: document.sourceAssetId,
    storageKey: document.backgroundStorageKey ?? existing?.storageKey ?? "",
    previewUrl: document.backgroundUrl,
    transform: existing?.transform ?? { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: true,
    visible: true,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    layerType: "background",
    confidence: 1,
  };
}

function preserveWorkflowInstructionState(
  state: EditorInstructionStudioState | undefined
): EditorInstructionStudioState | undefined {
  if (!state) {
    return undefined;
  }
  return {
    hcProjectId: state.hcProjectId,
    combineIntent: state.combineIntent,
    fusionPlan: state.fusionPlan,
    compositionPlan: state.compositionPlan,
    referenceIntake: state.referenceIntake,
    outputTarget: state.outputTarget,
    workflow: state.workflow,
    transformationSession: state.transformationSession,
    generationPackage: state.generationPackage,
    brandReferences: state.brandReferences,
    styleReference: state.styleReference,
    productReference: state.productReference,
    activeImagePhase: state.activeImagePhase,
  };
}

/** True when cached vision/detection belongs to the current base image. */
export function editorAnalysisAppliesToBackground(document: EditorCanvasDocument): boolean {
  if (!document.analyzedBackgroundUrl?.trim()) {
    return false;
  }
  return document.analyzedBackgroundUrl === document.backgroundUrl;
}

/**
 * Clears all vision/detection/instruction analysis derived from a previous base image.
 * Call before bootstrap when the background image changes or a fresh upload starts.
 */
export function resetEditorAnalysisState(
  document: EditorCanvasDocument,
  options?: EditorAnalysisResetOptions
): EditorCanvasDocument {
  clearCachedEditorAnalysis(document.sessionId);
  clearStickyVisionHierarchyForSession(document.sessionId);
  resetEditorAnalysisTimings(document.sessionId);

  const instructionStudioState = options?.preserveInstructionWorkflow
    ? preserveWorkflowInstructionState(document.instructionStudioState)
    : undefined;

  return {
    ...document,
    workflowStep: "object_detection",
    objects: [backgroundOnlyLayer(document)],
    semanticLayers: undefined,
    detectedObjects: undefined,
    objectHierarchies: undefined,
    visionHierarchy: undefined,
    visionV6Meta: undefined,
    visionAnalysis: undefined,
    visionAnalysisHash: undefined,
    analyzedBackgroundUrl: undefined,
    detectionMeta: undefined,
    visionMetrics: undefined,
    assetProfile: undefined,
    textLayers: undefined,
    motionPreparations: undefined,
    styleAttributes: undefined,
    hierarchicalSelection: createDefaultHierarchicalSelection(),
    instructionVariants: undefined,
    instructionStudioState,
    updatedAt: new Date().toISOString(),
  };
}

export function stampEditorAnalyzedBackground(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  return {
    ...document,
    analyzedBackgroundUrl: document.backgroundUrl,
  };
}
