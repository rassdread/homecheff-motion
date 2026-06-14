import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import {
  documentHasRichVisionAnalysis,
  editorAnalysisCacheKey,
} from "@/lib/editor-vision-v6-stability";

const bootstrapResultCache = new Map<string, EditorCanvasDocument>();

export function readCachedEditorAnalysis(
  document: EditorCanvasDocument
): EditorCanvasDocument | null {
  if (documentHasRichVisionAnalysis(document)) {
    return document;
  }
  const key = editorAnalysisCacheKey(document);
  const cached = bootstrapResultCache.get(key);
  if (cached && documentHasRichVisionAnalysis(cached)) {
    return cached;
  }
  return null;
}

export function writeCachedEditorAnalysis(document: EditorCanvasDocument): void {
  if (!documentHasRichVisionAnalysis(document)) {
    return;
  }
  bootstrapResultCache.set(editorAnalysisCacheKey(document), document);
}

export function clearCachedEditorAnalysis(sessionId: string): void {
  for (const key of bootstrapResultCache.keys()) {
    if (key.startsWith(`${sessionId}::`)) {
      bootstrapResultCache.delete(key);
    }
  }
}

/** Test helper */
export function resetEditorAnalysisCacheForTests(): void {
  bootstrapResultCache.clear();
}
