import {
  editorOperationUsesMask,
  resolveEditorMaskOperationRegion,
  transparentExportRequiresRefine,
} from "@/lib/editor-object-mask";
import type { EditorCanvasLayer, EditorObjectOperation } from "@/types/homecheff-visual-editor";

export type EditorMaskActionContext = {
  operation: EditorObjectOperation;
  layer: EditorCanvasLayer;
  usesMask: boolean;
  maskUrl?: string;
  polygonPointCount: number;
  approximateWarning: boolean;
};

export function buildEditorMaskActionContext(
  layer: EditorCanvasLayer | null,
  operation: EditorObjectOperation
): EditorMaskActionContext | null {
  if (!layer) {
    return null;
  }
  const region = resolveEditorMaskOperationRegion(layer);
  if (!region) {
    return null;
  }
  return {
    operation,
    layer,
    usesMask: editorOperationUsesMask(operation, layer),
    maskUrl: region.maskUrl,
    polygonPointCount: region.polygon?.length ?? 0,
    approximateWarning: transparentExportRequiresRefine(layer),
  };
}

export function editorDeleteShouldInpaintMask(layer: EditorCanvasLayer | null): boolean {
  return editorOperationUsesMask("delete", layer);
}

export function editorReplaceShouldUseMask(layer: EditorCanvasLayer | null): boolean {
  return editorOperationUsesMask("replace", layer);
}

export function editorAnimationBoundaryUsesMask(layer: EditorCanvasLayer | null): boolean {
  if (!layer?.selectionShape) {
    return false;
  }
  return Boolean(
    layer.selectionShape.maskUrl ||
      layer.selectionShape.polygon?.length ||
      layer.selectionShape.selectionMode === "manual"
  );
}
