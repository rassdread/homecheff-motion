import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { persistEditorSave } from "@/lib/editor-library-persist";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export async function persistCutoutToLibrary(document: EditorCanvasDocument, cutoutUrl: string) {
  const payload = {
    ...buildEditorSavePayload(document),
    backgroundUrl: cutoutUrl,
    name: `${document.name} — cutout`,
  };
  return persistEditorSave(document, payload, "cutout");
}
