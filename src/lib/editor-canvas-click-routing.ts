import { editorLayerHasPreciseShape } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

/** Human-first canvas clicks without a precise mask should open the segment prompt. */
export function shouldOpenClickSegmentPromptForLayer(layer: EditorCanvasLayer | null): boolean {
  if (!layer || layer.layerType === "background") {
    return false;
  }
  return !editorLayerHasPreciseShape(layer);
}
