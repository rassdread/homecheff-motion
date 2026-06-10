import { boundsToPolygon } from "@/lib/editor-object-mask";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorObjectShape,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";

export type EditorGeometryPriority = "mask" | "polygon" | "bbox";

const SHAPE_SOURCE_PRIORITY: Record<string, number> = {
  sam2: 4,
  rembg: 3,
  manual: 3,
  heuristic: 2,
  vision_estimate: 1,
};

export function editorLayerHasMaskTruth(layer: EditorCanvasLayer | null): boolean {
  if (!layer?.selectionShape) {
    return false;
  }
  return Boolean(
    layer.selectionShape.maskUrl ||
      layer.selectionShape.maskData ||
      layer.selectionShape.selectionMode === "mask"
  );
}

export function editorObjectGeometryPriority(object: EditorObject): EditorGeometryPriority {
  if (object.mask || object.maskStorageKey) {
    return "mask";
  }
  if (object.polygon && object.polygon.length >= 3) {
    return "polygon";
  }
  return "bbox";
}

export function editorShapeSourcePriority(shape?: EditorObjectShape | null): number {
  if (!shape?.segmentationSource) {
    return 0;
  }
  return SHAPE_SOURCE_PRIORITY[shape.segmentationSource] ?? 1;
}

export function resolveEditorSelectionGeometry(
  layer: EditorCanvasLayer | null,
  object?: EditorObject | null
): {
  priority: EditorGeometryPriority;
  polygon: EditorShapePoint[];
  bbox: EditorObject["bbox"];
  maskUrl?: string;
} {
  const shape = layer?.selectionShape;
  const maskUrl = shape?.maskUrl ?? object?.mask;
  const polygon =
    shape?.polygon ??
    object?.polygon ??
    (shape?.boundingBox ? boundsToPolygon(shape.boundingBox) : null) ??
    boundsToPolygon(object?.bbox ?? layer?.bounds ?? { x: 0, y: 0, width: 1, height: 1 });
  const bbox = shape?.boundingBox ?? object?.bbox ?? layer?.bounds ?? { x: 0, y: 0, width: 1, height: 1 };

  if (maskUrl || editorLayerHasMaskTruth(layer)) {
    return { priority: "mask", polygon, bbox, maskUrl };
  }
  if (polygon.length >= 3 && shape?.selectionMode !== "box") {
    return { priority: "polygon", polygon, bbox, maskUrl };
  }
  return { priority: "bbox", polygon: boundsToPolygon(bbox), bbox, maskUrl };
}

export function editorTransformUsesMaskFirst(layer: EditorCanvasLayer | null): boolean {
  return editorLayerHasMaskTruth(layer);
}

export function editorHoverUsesMaskFirst(layer: EditorCanvasLayer | null): boolean {
  return editorLayerHasMaskTruth(layer) || Boolean(layer?.selectionShape?.polygon?.length);
}
