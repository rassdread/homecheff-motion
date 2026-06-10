import type {
  EditorCanvasBounds,
  EditorCanvasLayer,
  EditorObjectShape,
  EditorObjectOperation,
  EditorSelectionMode,
  EditorShapePoint,
  EditorSegmentationSource,
} from "@/types/homecheff-visual-editor";

export type EditorMaskOperationRegion = {
  selectionMode: EditorSelectionMode;
  boundingBox: EditorCanvasBounds;
  polygon?: EditorShapePoint[];
  maskUrl?: string;
  maskData?: string;
  usesMask: boolean;
};

export function editorLayerSelectionMode(layer: EditorCanvasLayer | null): EditorSelectionMode {
  if (!layer) {
    return "box";
  }
  return layer.selectionShape?.selectionMode ?? (layer.metadata?.selectionMode as EditorSelectionMode) ?? "box";
}

export function editorLayerHasPreciseShape(layer: EditorCanvasLayer | null): boolean {
  if (!layer?.selectionShape) {
    return false;
  }
  const mode = layer.selectionShape.selectionMode;
  return mode === "mask" || mode === "polygon" || mode === "manual";
}

export function isApproximateEditorSelection(layer: EditorCanvasLayer | null): boolean {
  if (!layer || layer.layerType === "background") {
    return false;
  }
  if (editorLayerHasPreciseShape(layer)) {
    return false;
  }
  return layer.metadata?.approximateSelection !== false && (layer.metadata?.estimatedBounds ?? true);
}

export function boundsToPolygon(bounds: EditorCanvasBounds): EditorShapePoint[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export function boundsFromPolygon(points: EditorShapePoint[]): EditorCanvasBounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.01, maxX - minX),
    height: Math.max(0.01, maxY - minY),
  };
}

export function clampShapePoint(point: EditorShapePoint): EditorShapePoint {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

export function normalizeLassoPoints(points: EditorShapePoint[]): EditorShapePoint[] {
  const cleaned = points.map(clampShapePoint);
  if (cleaned.length < 3) {
    return [];
  }
  return cleaned;
}

/** Heuristic tighter contour inside estimated bbox — octagon inset. */
export function refineSelectionPolygonFromBounds(bounds: EditorCanvasBounds): EditorShapePoint[] {
  const insetX = bounds.width * 0.08;
  const insetY = bounds.height * 0.08;
  const x0 = bounds.x + insetX;
  const y0 = bounds.y + insetY;
  const x1 = bounds.x + bounds.width - insetX;
  const y1 = bounds.y + bounds.height - insetY;
  const midTopX = bounds.x + bounds.width / 2;
  const midBottomX = midTopX;
  return [
    { x: x0 + bounds.width * 0.12, y: y0 },
    { x: x1 - bounds.width * 0.12, y: y0 },
    { x: x1, y: y0 + bounds.height * 0.15 },
    { x: x1, y: y1 - bounds.height * 0.15 },
    { x: x1 - bounds.width * 0.12, y: y1 },
    { x: x0 + bounds.width * 0.12, y: y1 },
    { x: x0, y: y1 - bounds.height * 0.15 },
    { x: x0, y: y0 + bounds.height * 0.15 },
    { x: midTopX, y: y0 },
  ].map(clampShapePoint);
}

export function createBoxSelectionShape(bounds: EditorCanvasBounds): EditorObjectShape {
  return {
    selectionMode: "box",
    boundingBox: bounds,
    polygon: boundsToPolygon(bounds),
    confidence: 0.5,
    editableShape: true,
    segmentationSource: "vision_estimate",
  };
}

export function createManualPolygonShape(
  points: EditorShapePoint[],
  source: EditorSegmentationSource = "manual"
): EditorObjectShape | null {
  const polygon = normalizeLassoPoints(points);
  if (polygon.length < 3) {
    return null;
  }
  const boundingBox = boundsFromPolygon(polygon);
  return {
    selectionMode: "manual",
    boundingBox,
    polygon,
    confidence: 0.92,
    editableShape: true,
    segmentationSource: source,
  };
}

export function createMaskSelectionShape(input: {
  bounds: EditorCanvasBounds;
  maskUrl?: string;
  maskStorageKey?: string;
  maskData?: string;
  polygon?: EditorShapePoint[];
  cutoutUrl?: string;
  confidence?: number;
  segmentationSource?: EditorSegmentationSource;
}): EditorObjectShape {
  const polygon = input.polygon ?? refineSelectionPolygonFromBounds(input.bounds);
  return {
    selectionMode: input.maskUrl || input.maskData ? "mask" : "polygon",
    boundingBox: input.bounds,
    polygon,
    maskUrl: input.maskUrl,
    maskStorageKey: input.maskStorageKey,
    maskData: input.maskData,
    alphaMask: Boolean(input.maskUrl || input.maskData),
    cutoutUrl: input.cutoutUrl,
    confidence: input.confidence ?? 0.85,
    editableShape: true,
    segmentationSource: input.segmentationSource ?? "rembg",
  };
}

export function applyEditorSelectionShape(
  layer: EditorCanvasLayer,
  shape: EditorObjectShape
): EditorCanvasLayer {
  return {
    ...layer,
    bounds: shape.boundingBox,
    selectionShape: shape,
    metadata: {
      ...layer.metadata,
      estimatedBounds: false,
      approximateSelection: false,
      selectionMode: shape.selectionMode,
    },
  };
}

export function applyRefinedPolygonToLayer(
  layer: EditorCanvasLayer,
  polygon: EditorShapePoint[],
  options?: { segmentationSource?: EditorSegmentationSource; confidence?: number }
): EditorCanvasLayer {
  const shape = createManualPolygonShape(polygon, options?.segmentationSource ?? "heuristic");
  if (!shape) {
    return layer;
  }
  return applyEditorSelectionShape(layer, {
    ...shape,
    selectionMode: "polygon",
    confidence: options?.confidence ?? 0.78,
    segmentationSource: options?.segmentationSource ?? "heuristic",
  });
}

export function resolveEditorContourPoints(layer: EditorCanvasLayer): EditorShapePoint[] | null {
  if (layer.selectionShape?.polygon?.length) {
    return layer.selectionShape.polygon;
  }
  if (layer.selectionShape?.selectionMode === "mask" && layer.selectionShape.maskUrl) {
    return refineSelectionPolygonFromBounds(layer.bounds);
  }
  return null;
}

export function editorOperationUsesMask(
  operation: EditorObjectOperation,
  layer: EditorCanvasLayer | null
): boolean {
  if (!layer || !editorLayerHasPreciseShape(layer)) {
    return false;
  }
  return ["move", "scale", "rotate", "replace", "delete"].includes(operation);
}

export function resolveEditorMaskOperationRegion(
  layer: EditorCanvasLayer | null
): EditorMaskOperationRegion | null {
  if (!layer) {
    return null;
  }
  const usesMask = editorLayerHasPreciseShape(layer);
  const shape = layer.selectionShape;
  return {
    selectionMode: editorLayerSelectionMode(layer),
    boundingBox: shape?.boundingBox ?? layer.bounds,
    polygon: shape?.polygon ?? (usesMask ? undefined : boundsToPolygon(layer.bounds)),
    maskUrl: shape?.maskUrl,
    maskData: shape?.maskData,
    usesMask,
  };
}

export function transparentExportRequiresRefine(layer: EditorCanvasLayer | null): boolean {
  if (!layer) {
    return true;
  }
  return !layer.selectionShape?.maskUrl && !layer.selectionShape?.alphaMask;
}

export function editorSelectionOutlineSvgPoints(
  points: EditorShapePoint[],
  widthPercent = 100,
  heightPercent = 100
): string {
  return points
    .map((p) => `${(p.x * widthPercent).toFixed(2)},${(p.y * heightPercent).toFixed(2)}`)
    .join(" ");
}

export function detachObjectCutoutLayer(
  layer: EditorCanvasLayer,
  cutoutUrl: string,
  maskUrl?: string
): EditorCanvasLayer {
  const shape = createMaskSelectionShape({
    bounds: layer.bounds,
    maskUrl,
    cutoutUrl,
    polygon: layer.selectionShape?.polygon ?? refineSelectionPolygonFromBounds(layer.bounds),
    confidence: layer.selectionShape?.confidence ?? 0.88,
    segmentationSource: layer.selectionShape?.segmentationSource ?? "rembg",
  });
  return {
    ...applyEditorSelectionShape(layer, shape),
    previewUrl: cutoutUrl,
    storageKey: layer.storageKey,
  };
}
