import { editorLayerHasMaskUrl } from "@/lib/editor-mask-gate";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

const AUTO_MASK_OBJECT_TYPES = new Set([
  "character",
  "mascot",
  "person",
  "logo",
  "globe",
  "product",
  "prop",
  "accessory",
  "text",
]);

export type AutoMaskStrategy = "sam2" | "rembg" | "none";

export function layerBoundsCenter(layer: EditorCanvasLayer): EditorShapePoint {
  const b = layer.bounds;
  return {
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
  };
}

export function shouldAutoAcquireMask(layer: EditorCanvasLayer | null | undefined): boolean {
  if (!layer || layer.layerType === "background" || layer.locked === true) {
    return false;
  }
  if (editorLayerHasMaskUrl(layer)) {
    return false;
  }
  const category = layer.category?.toLowerCase() ?? "";
  const semantic = layer.semanticType?.toLowerCase() ?? "";
  if (AUTO_MASK_OBJECT_TYPES.has(category) || AUTO_MASK_OBJECT_TYPES.has(semantic)) {
    return true;
  }
  return layer.layerType === "semantic";
}

export function pickAutoMaskStrategy(sam2Available: boolean, rembgAvailable: boolean): AutoMaskStrategy {
  if (sam2Available) {
    return "sam2";
  }
  if (rembgAvailable) {
    return "rembg";
  }
  return "none";
}

export function autoMaskUserMessageKey(strategy: AutoMaskStrategy, success: boolean): string {
  if (success) {
    return "editor.selectionFix.ready";
  }
  if (strategy === "none") {
    return "editor.autoMask.unavailable";
  }
  return "editor.autoMask.failed";
}

export function autoMaskProgressMessageKey(
  phase: "selecting" | "refining" | "ready" | "unavailable" | "failed"
): string {
  switch (phase) {
    case "selecting":
      return "editor.selectionFix.selecting";
    case "refining":
      return "editor.selectionFix.refining";
    case "ready":
      return "editor.selectionFix.ready";
    case "unavailable":
      return "editor.autoMask.unavailable";
    case "failed":
      return "editor.autoMask.failed";
  }
}
