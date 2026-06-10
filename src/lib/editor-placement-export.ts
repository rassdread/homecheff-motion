import { renderEditorCompositionToDataUrl } from "@/lib/editor-compositor-render";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorPlacementExportResult = {
  mode: "composition_only" | "pixel_overlay" | "composited";
  dataUrl: string | null;
  messageKey: string;
};

export async function exportEditorCanvasWithPlacements(
  editorDocument: EditorCanvasDocument
): Promise<EditorPlacementExportResult> {
  const rendered = await renderEditorCompositionToDataUrl(editorDocument);
  if (rendered.dataUrl) {
    return {
      mode: "composited",
      dataUrl: rendered.dataUrl,
      messageKey: rendered.messageKey,
    };
  }

  return {
    mode: "composition_only",
    dataUrl: null,
    messageKey: rendered.messageKey,
  };
}
