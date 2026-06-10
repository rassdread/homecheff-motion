import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import type { EditorCanvasDocument, EditorStudioMotionHandoff } from "@/types/homecheff-visual-editor";

export type EditorStudioEntry = {
  sessionId: string;
  document: EditorCanvasDocument;
  createdInEditor: true;
  handoff: EditorStudioMotionHandoff | undefined;
  primaryImageUrl: string;
  cutoutUrls: string[];
};

export function resolveEditorStudioEntry(sessionId: string | null | undefined): EditorStudioEntry | null {
  const trimmed = sessionId?.trim();
  if (!trimmed) {
    return null;
  }
  const document = loadEditorCanvasDocument(trimmed);
  if (!document) {
    return null;
  }
  const handoff = document.studioMotionHandoff;
  const cutoutUrls = [
    ...(handoff?.cutoutAssets?.map((cutout) => cutout.cutoutUrl).filter(Boolean) ?? []),
    ...(document.cutoutAssets ?? []).map((cutout) => cutout.cutoutUrl).filter(Boolean),
    ...document.objects
      .map((layer) => layer.selectionShape?.cutoutUrl)
      .filter((url): url is string => Boolean(url)),
  ].filter((url, index, arr) => arr.indexOf(url) === index);

  return {
    sessionId: trimmed,
    document,
    createdInEditor: true,
    handoff,
    primaryImageUrl: document.backgroundUrl,
    cutoutUrls,
  };
}
