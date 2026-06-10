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

export type EditorMaskActionExecutionState =
  | "ready"
  | "uses_mask_metadata"
  | "ai_variant_pending"
  | "approximate_warning";

export function resolveEditorMaskActionExecutionState(
  layer: EditorCanvasLayer | null,
  operation: EditorObjectOperation
): EditorMaskActionExecutionState {
  if (!layer) {
    return "approximate_warning";
  }
  const ctx = buildEditorMaskActionContext(layer, operation);
  if (!ctx) {
    return "approximate_warning";
  }
  if (ctx.usesMask && ["move", "scale", "rotate"].includes(operation)) {
    return "ready";
  }
  if (ctx.usesMask && (operation === "replace" || operation === "delete")) {
    return "ai_variant_pending";
  }
  if (ctx.usesMask) {
    return "uses_mask_metadata";
  }
  return ctx.approximateWarning ? "approximate_warning" : "ready";
}

export function editorMaskActionRequiresAiBackend(
  layer: EditorCanvasLayer | null,
  operation: EditorObjectOperation
): boolean {
  return resolveEditorMaskActionExecutionState(layer, operation) === "ai_variant_pending";
}
