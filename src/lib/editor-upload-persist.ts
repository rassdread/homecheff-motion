/**
 * Wizard upload → localStorage persist with tiered fallbacks.
 */

import {
  saveEditorCanvasDocumentRawWithStatus,
  saveEditorCanvasDocumentWithStatus,
  type EditorCanvasSaveResult,
} from "@/lib/editor-canvas-session";
import { resetEditorVisionDerivedState } from "@/lib/editor-analysis-reset";
import { ensureEditorAnalysisIsolationScope } from "@/lib/editor-project-isolation";
import { stripDocumentForStorage } from "@/lib/editor-local-storage";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorWizardPersistTier = "full" | "slim" | "minimal";

export type EditorWizardPersistAttempt = {
  tier: EditorWizardPersistTier;
  persisted: boolean;
  storageWarning?: EditorCanvasSaveResult["storageWarning"];
  documentSizeKb: number;
};

export type EditorWizardPersistResult = {
  document: EditorCanvasDocument;
  persisted: boolean;
  storageWarning?: EditorCanvasSaveResult["storageWarning"];
  attempts: EditorWizardPersistAttempt[];
};

export function estimateEditorDocumentSizeKb(document: EditorCanvasDocument): number {
  try {
    return Math.round(JSON.stringify(stripDocumentForStorage(document)).length / 1024);
  } catch {
    return -1;
  }
}

export function probeEditorLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const key = "__hc_editor_ls_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function slimWizardDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  return ensureEditorAnalysisIsolationScope(
    resetEditorVisionDerivedState(document, { preserveInstructionWorkflow: true })
  );
}

function minimalWizardDocument(document: EditorCanvasDocument): EditorCanvasDocument {
  const slim = slimWizardDocument(document);
  return {
    ...slim,
    history: undefined,
    assistantState: undefined,
    visionHierarchy: undefined,
    visionV6Meta: undefined,
    visionAnalysis: undefined,
    visionAnalysisRun: undefined,
    detectionMeta: undefined,
    semanticLayers: undefined,
    detectedObjects: undefined,
    objectHierarchies: undefined,
    layerOperations: undefined,
    textLayers: undefined,
    motionPreparations: undefined,
    importedLayers: [],
    libraryExports: [],
  };
}

function runPersistTier(
  tier: EditorWizardPersistTier,
  document: EditorCanvasDocument
): EditorWizardPersistAttempt & Pick<EditorCanvasSaveResult, "document"> {
  const input =
    tier === "minimal" ? minimalWizardDocument(document) : tier === "slim" ? slimWizardDocument(document) : document;
  const saveResult =
    tier === "minimal"
      ? saveEditorCanvasDocumentRawWithStatus(input)
      : saveEditorCanvasDocumentWithStatus(input);
  return {
    tier,
    persisted: saveResult.persisted,
    storageWarning: saveResult.storageWarning,
    documentSizeKb: estimateEditorDocumentSizeKb(saveResult.document),
    document: saveResult.document,
  };
}

/** Tiered persist: full → slim (no vision) → minimal (raw, no enrich). */
export function persistEditorWizardDocument(
  document: EditorCanvasDocument
): EditorWizardPersistResult {
  const attempts: EditorWizardPersistAttempt[] = [];
  let latestDocument = document;
  let persisted = false;
  let storageWarning: EditorCanvasSaveResult["storageWarning"];

  for (const tier of ["full", "slim", "minimal"] as const) {
    const attempt = runPersistTier(tier, document);
    attempts.push({
      tier: attempt.tier,
      persisted: attempt.persisted,
      storageWarning: attempt.storageWarning,
      documentSizeKb: attempt.documentSizeKb,
    });
    latestDocument = attempt.document;
    if (attempt.persisted) {
      persisted = true;
      storageWarning = attempt.storageWarning;
      break;
    }
  }

  return {
    document: latestDocument,
    persisted,
    storageWarning,
    attempts,
  };
}
