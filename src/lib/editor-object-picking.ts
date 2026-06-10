import { boundsToPolygon } from "@/lib/editor-object-mask";
import type { EditorCanvasBounds, EditorObject, EditorShapePoint } from "@/types/homecheff-visual-editor";

function bboxArea(bbox: EditorCanvasBounds): number {
  return bbox.width * bbox.height;
}

function isPromptCreatedSubObject(object: EditorObject): boolean {
  return Boolean(object.parentId && object.mask);
}

export type EditorPickHitMethod = "mask" | "polygon" | "bbox" | "none";

export type EditorPickResult = {
  object: EditorObject;
  method: EditorPickHitMethod;
  distance: number;
};

export function pointInBounds(
  point: EditorShapePoint,
  bounds: EditorCanvasBounds
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/** Ray-casting point-in-polygon test (normalized coordinates). */
export function pointInPolygon(point: EditorShapePoint, polygon: EditorShapePoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Mask hit test — uses polygon derived from mask when raster is unavailable.
 * When mask URL/data exists, polygon contour is treated as the precise mask boundary.
 */
export function maskHitTest(point: EditorShapePoint, object: EditorObject): boolean {
  if (!object.mask && !object.maskStorageKey) {
    return false;
  }
  const contour = object.polygon ?? boundsToPolygon(object.bbox);
  return pointInPolygon(point, contour);
}

export function polygonHitTest(point: EditorShapePoint, object: EditorObject): boolean {
  const polygon = object.polygon;
  if (!polygon?.length) {
    return false;
  }
  return pointInPolygon(point, polygon);
}

export function bboxHitTest(point: EditorShapePoint, object: EditorObject): boolean {
  return pointInBounds(point, object.bbox);
}

function isPickableEditorObject(object: EditorObject): boolean {
  return object.category !== "background" && object.layerId !== "background";
}

function hitTestObject(
  point: EditorShapePoint,
  object: EditorObject
): EditorPickResult | null {
  if (!object.visible || !isPickableEditorObject(object)) {
    return null;
  }
  if (maskHitTest(point, object)) {
    return { object, method: "mask", distance: 0 };
  }
  if (polygonHitTest(point, object)) {
    return { object, method: "polygon", distance: 0 };
  }
  if (bboxHitTest(point, object)) {
    const cx = object.bbox.x + object.bbox.width / 2;
    const cy = object.bbox.y + object.bbox.height / 2;
    const distance = Math.hypot(point.x - cx, point.y - cy);
    return { object, method: "bbox", distance };
  }
  return null;
}

const METHOD_PRIORITY: Record<EditorPickHitMethod, number> = {
  mask: 3,
  polygon: 2,
  bbox: 1,
  none: 0,
};

/**
 * Find the top-most object under cursor.
 * Priority: mask → polygon → bbox, then higher zIndex wins.
 */
export function pickTopEditorObjectAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[]
): EditorPickResult | null {
  const hits: EditorPickResult[] = [];
  for (const object of objects) {
    const hit = hitTestObject(point, object);
    if (hit) {
      hits.push(hit);
    }
  }
  if (hits.length === 0) {
    return null;
  }
  hits.sort((a, b) => {
    const methodDiff = METHOD_PRIORITY[b.method] - METHOD_PRIORITY[a.method];
    if (methodDiff !== 0) {
      return methodDiff;
    }
    const aPromptSub = isPromptCreatedSubObject(a.object);
    const bPromptSub = isPromptCreatedSubObject(b.object);
    if (aPromptSub !== bPromptSub) {
      return aPromptSub ? -1 : 1;
    }
    if (a.method === "mask" && b.method === "mask") {
      const areaDiff = bboxArea(a.object.bbox) - bboxArea(b.object.bbox);
      if (areaDiff !== 0) {
        return areaDiff;
      }
    }
    const zDiff = b.object.zIndex - a.object.zIndex;
    if (zDiff !== 0) {
      return zDiff;
    }
    if (a.method === "bbox" && b.method === "bbox") {
      return a.distance - b.distance;
    }
    return 0;
  });
  return hits[0] ?? null;
}

export function pickEditorObjectAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[]
): EditorObject | null {
  return pickTopEditorObjectAtPoint(point, objects)?.object ?? null;
}

/** Convert client pointer position to normalized canvas coordinates. */
export function clientPointToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect
): EditorShapePoint {
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

export function pickEditorLayerIdAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[]
): string | null {
  return pickEditorObjectAtPoint(point, objects)?.layerId ?? null;
}
