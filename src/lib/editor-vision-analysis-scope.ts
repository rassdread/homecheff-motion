/**
 * Normalized scope fields for vision analysis run matching.
 */

import {
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorVisionAnalysisRunScopeFields = {
  backgroundUrl: string;
  assetId: string;
  projectId: string;
  analysisId: string;
  sessionId: string;
};

export type NormalizedEditorVisionScope = {
  backgroundUrl: string;
  assetId: string;
  projectId: string;
  analysisId: string;
  sessionId: string;
};

export function normalizeEditorVisionScopeUrl(url: string | undefined | null): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    const normalized = parsed.toString().replace(/\/$/, "");
    return normalized;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

export function normalizeEditorVisionScopeId(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function normalizeEditorVisionScopeFromDocument(
  document: EditorCanvasDocument,
  analysisId?: string
): NormalizedEditorVisionScope {
  return {
    backgroundUrl: normalizeEditorVisionScopeUrl(document.backgroundUrl),
    assetId: normalizeEditorVisionScopeId(resolveEditorAssetId(document)),
    projectId: normalizeEditorVisionScopeId(resolveEditorProjectId(document)),
    analysisId: normalizeEditorVisionScopeId(
      analysisId ?? document.isolationScope?.analysisId ?? ""
    ),
    sessionId: normalizeEditorVisionScopeId(document.sessionId),
  };
}

export function normalizeEditorVisionScopeFromRun(
  scope: EditorVisionAnalysisRunScopeFields
): NormalizedEditorVisionScope {
  return {
    backgroundUrl: normalizeEditorVisionScopeUrl(scope.backgroundUrl),
    assetId: normalizeEditorVisionScopeId(scope.assetId),
    projectId: normalizeEditorVisionScopeId(scope.projectId),
    analysisId: normalizeEditorVisionScopeId(scope.analysisId),
    sessionId: normalizeEditorVisionScopeId(scope.sessionId),
  };
}

/** hcProjectId may be linked mid-run — sessionId remains the stable anchor. */
export function editorVisionProjectIdsMatch(
  left: string,
  right: string,
  sessionId: string
): boolean {
  const a = normalizeEditorVisionScopeId(left);
  const b = normalizeEditorVisionScopeId(right);
  const session = normalizeEditorVisionScopeId(sessionId);
  if (!a || !b) {
    return true;
  }
  if (a === b) {
    return true;
  }
  return a === session || b === session;
}

export function editorVisionAnalysisIdsMatch(
  resultAnalysisId: string,
  document: EditorCanvasDocument
): boolean {
  const resultId = normalizeEditorVisionScopeId(resultAnalysisId);
  const docId = normalizeEditorVisionScopeId(document.isolationScope?.analysisId);
  if (!resultId || !docId) {
    return true;
  }
  return resultId === docId;
}

export function scopesAlignForVisionResult(
  resultScope: EditorVisionAnalysisRunScopeFields,
  document: EditorCanvasDocument
): boolean {
  const result = normalizeEditorVisionScopeFromRun(resultScope);
  const current = normalizeEditorVisionScopeFromDocument(document);

  if (result.sessionId !== current.sessionId) {
    return false;
  }
  if (result.backgroundUrl !== current.backgroundUrl) {
    return false;
  }
  if (result.assetId !== current.assetId) {
    return false;
  }
  if (!editorVisionProjectIdsMatch(result.projectId, current.projectId, current.sessionId)) {
    return false;
  }
  if (!editorVisionAnalysisIdsMatch(result.analysisId, document)) {
    return false;
  }
  return true;
}

export function scopesAlignForVisionDocuments(
  result: EditorCanvasDocument,
  current: EditorCanvasDocument
): boolean {
  const resultScope = result.visionAnalysisRun ?? result.isolationScope;
  if (!resultScope) {
    return (
      normalizeEditorVisionScopeUrl(result.backgroundUrl) ===
        normalizeEditorVisionScopeUrl(current.backgroundUrl) &&
      result.sessionId === current.sessionId
    );
  }
  return scopesAlignForVisionResult(
    {
      backgroundUrl: resultScope.backgroundUrl ?? result.backgroundUrl,
      assetId: "assetId" in resultScope ? resultScope.assetId : resolveEditorAssetId(result),
      projectId: "projectId" in resultScope ? resultScope.projectId : resolveEditorProjectId(result),
      analysisId: resultScope.analysisId,
      sessionId: resultScope.sessionId ?? result.sessionId,
    },
    current
  );
}
