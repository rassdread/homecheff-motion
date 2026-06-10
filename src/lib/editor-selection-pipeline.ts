import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import { layerBoundsCenter } from "@/lib/editor-auto-mask";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type SelectLayerOptions = {
  partId?: string | null;
  clickPoint?: EditorShapePoint | null;
};

export function normalizeSelectLayerOptions(
  options?: SelectLayerOptions | string | null
): SelectLayerOptions {
  if (options === undefined) {
    return {};
  }
  if (options === null || typeof options === "string") {
    return { partId: options };
  }
  return options;
}

/** Prefer user click for SAM2; never use bbox center when click exists. */
export function resolveAutoMaskClickPoint(
  layer: EditorCanvasLayer,
  clickPoint?: EditorShapePoint | null
): EditorShapePoint {
  if (
    clickPoint &&
    Number.isFinite(clickPoint.x) &&
    Number.isFinite(clickPoint.y) &&
    clickPoint.x >= 0 &&
    clickPoint.x <= 1 &&
    clickPoint.y >= 0 &&
    clickPoint.y <= 1
  ) {
    return clickPoint;
  }
  return layerBoundsCenter(layer);
}

const PIXEL_GATED_OPERATIONS = new Set(["replace", "delete"]);

export function layerAllowsPixelEdit(layer: EditorCanvasLayer | null | undefined): boolean {
  if (!layer) {
    return false;
  }
  if (layer.layerType === "background") {
    return true;
  }
  return evaluateEditorMaskGate(layer).allowed;
}

export function humanActionRequiresPixelMask(actionId: string): boolean {
  return actionId === "replace" || actionId === "remove" || actionId === "logo_replace";
}

export function uxV7ActionRequiresPixelMask(action: string): boolean {
  return (
    action === "replace" ||
    action === "remove" ||
    action === "background_blur" ||
    action === "background_replace"
  );
}

export function uxV7ActionAllowed(layer: EditorCanvasLayer, action: string): boolean {
  if (action === "refine_selection") {
    return false;
  }
  if (action === "background_remove") {
    return layer.layerType === "background";
  }
  if (!uxV7ActionRequiresPixelMask(action)) {
    return true;
  }
  if (layer.layerType === "background") {
    return false;
  }
  return evaluateEditorMaskGate(layer).allowed;
}

export function layerShowsRefineAction(layer: EditorCanvasLayer | null | undefined): boolean {
  if (!layer || layer.layerType === "background") {
    return false;
  }
  return !evaluateEditorMaskGate(layer).allowed;
}
