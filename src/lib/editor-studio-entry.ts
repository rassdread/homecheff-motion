import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import { buildEditorCompositorLayers } from "@/lib/editor-compositor";
import type { EditorCanvasDocument, EditorStudioMotionHandoff } from "@/types/homecheff-visual-editor";

export type EditorStudioEntry = {
  sessionId: string;
  document: EditorCanvasDocument;
  createdInEditor: true;
  handoff: EditorStudioMotionHandoff | undefined;
  primaryImageUrl: string;
  cutoutUrls: string[];
  compositorLayerUrls: string[];
  placementUrls: string[];
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

  const compositorLayers = buildEditorCompositorLayers(document);
  const compositorLayerUrls = compositorLayers
    .filter((layer) => layer.kind !== "background" && layer.imageUrl)
    .map((layer) => layer.imageUrl);
  const placementUrls = document.placements
    .map((placement) => placement.previewUrl)
    .filter((url): url is string => Boolean(url));

  return {
    sessionId: trimmed,
    document,
    createdInEditor: true,
    handoff,
    primaryImageUrl: document.backgroundUrl,
    cutoutUrls,
    compositorLayerUrls,
    placementUrls,
  };
}
