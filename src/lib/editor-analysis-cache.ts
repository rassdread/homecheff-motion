import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { editorAnalysisAppliesToBackground } from "@/lib/editor-analysis-reset";
import {
  documentHasRichVisionAnalysis,
} from "@/lib/editor-vision-v6-stability";
import {
  editorIsolationScopeMatches,
  editorProjectIsolationCacheKey,
} from "@/lib/editor-project-isolation";
import { readCachedAnalysisMatchesCurrentRun } from "@/lib/editor-vision-analysis-run";

const bootstrapResultCache = new Map<string, EditorCanvasDocument>();

export function readCachedEditorAnalysis(
  document: EditorCanvasDocument
): EditorCanvasDocument | null {
  if (!editorAnalysisAppliesToBackground(document)) {
    return null;
  }
  if (documentHasRichVisionAnalysis(document)) {
    if (editorIsolationScopeMatches(document.isolationScope, document)) {
      return document;
    }
    return null;
  }
  const key = editorProjectIsolationCacheKey(document);
  const cached = bootstrapResultCache.get(key);
  if (
    cached &&
    documentHasRichVisionAnalysis(cached) &&
    editorIsolationScopeMatches(cached.isolationScope, document) &&
    readCachedAnalysisMatchesCurrentRun(document, cached)
  ) {
    return cached;
  }
  return null;
}

export function writeCachedEditorAnalysis(document: EditorCanvasDocument): void {
  if (!documentHasRichVisionAnalysis(document)) {
    return;
  }
  bootstrapResultCache.set(editorProjectIsolationCacheKey(document), document);
}

export function clearCachedEditorAnalysis(sessionId: string, projectId?: string): void {
  for (const key of bootstrapResultCache.keys()) {
    if (key.includes(`::${sessionId}::`) || key.startsWith(`${sessionId}::`)) {
      bootstrapResultCache.delete(key);
    }
    if (projectId && key.startsWith(`${projectId}::`)) {
      bootstrapResultCache.delete(key);
    }
  }
}

/** Test helper */
export function resetEditorAnalysisCacheForTests(): void {
  bootstrapResultCache.clear();
}
