import { editorLayerHasPreciseShape, isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorMaskGateResult = {
  allowed: boolean;
  reasonKey: "editor.maskGate.needRefine" | "editor.maskGate.approximateOnly" | null;
  hasMaskUrl: boolean;
  approximate: boolean;
};

export function editorLayerHasMaskUrl(layer: EditorCanvasLayer | null | undefined): boolean {
  return Boolean(layer?.selectionShape?.maskUrl?.trim());
}

export function evaluateEditorMaskGate(layer: EditorCanvasLayer | null | undefined): EditorMaskGateResult {
  if (!layer) {
    return { allowed: false, reasonKey: "editor.maskGate.needRefine", hasMaskUrl: false, approximate: false };
  }
  const hasMaskUrl = editorLayerHasMaskUrl(layer);
  const approximate = isApproximateEditorSelection(layer);
  if (hasMaskUrl) {
    return { allowed: true, reasonKey: null, hasMaskUrl: true, approximate };
  }
  if (editorLayerHasPreciseShape(layer) && (layer.selectionShape?.polygon?.length ?? 0) >= 3) {
    return { allowed: false, reasonKey: "editor.maskGate.needRefine", hasMaskUrl: false, approximate };
  }
  return {
    allowed: false,
    reasonKey: approximate ? "editor.maskGate.approximateOnly" : "editor.maskGate.needRefine",
    hasMaskUrl: false,
    approximate,
  };
}

export function editorPixelEditOperations(): Array<"replace" | "delete"> {
  return ["replace", "delete"];
}
