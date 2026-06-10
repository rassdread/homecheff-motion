import type {
  EditorAlignmentAction,
  EditorCanvasDocument,
  EditorCanvasTransform,
  EditorImportedLayer,
} from "@/types/homecheff-visual-editor";

function snapX(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}

function snapY(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}

export function alignmentTarget(action: EditorAlignmentAction): { x?: number; y?: number } {
  switch (action) {
    case "center":
      return { x: 0.5, y: 0.5 };
    case "left":
      return { x: 0.08 };
    case "right":
      return { x: 0.92 };
    case "top":
      return { y: 0.08 };
    case "bottom":
      return { y: 0.92 };
    default:
      return {};
  }
}

export function alignLayerTransform(
  transform: EditorCanvasTransform,
  action: EditorAlignmentAction
): EditorCanvasTransform {
  const target = alignmentTarget(action);
  return {
    ...transform,
    x: target.x !== undefined ? snapX(target.x) : transform.x,
    y: target.y !== undefined ? snapY(target.y) : transform.y,
  };
}

export function alignDocumentLayer(
  document: EditorCanvasDocument,
  layerId: string,
  action: EditorAlignmentAction
): EditorCanvasDocument {
  return {
    ...document,
    objects: document.objects.map((layer) =>
      layer.id === layerId
        ? { ...layer, transform: alignLayerTransform(layer.transform, action) }
        : layer
    ),
    productivityState: {
      ...document.productivityState,
      showAlignmentGuides: true,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function alignImportedLayer(
  document: EditorCanvasDocument,
  layerId: string,
  action: EditorAlignmentAction
): EditorCanvasDocument {
  return {
    ...document,
    importedLayers: (document.importedLayers ?? []).map((layer) =>
      layer.id === layerId
        ? { ...layer, transform: alignLayerTransform(layer.transform, action) }
        : layer
    ),
    productivityState: {
      ...document.productivityState,
      showAlignmentGuides: true,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function distributeImportedLayersEvenly(
  layers: EditorImportedLayer[],
  axis: "h" | "v"
): EditorImportedLayer[] {
  if (layers.length < 2) {
    return layers;
  }
  const sorted = [...layers].sort((a, b) =>
    axis === "h" ? a.transform.x - b.transform.x : a.transform.y - b.transform.y
  );
  const min = axis === "h" ? sorted[0]!.transform.x : sorted[0]!.transform.y;
  const max = axis === "h" ? sorted[sorted.length - 1]!.transform.x : sorted[sorted.length - 1]!.transform.y;
  const step = (max - min) / (sorted.length - 1);

  return layers.map((layer) => {
    const index = sorted.findIndex((s) => s.id === layer.id);
    if (index < 0) {
      return layer;
    }
    const value = min + step * index;
    return {
      ...layer,
      transform: {
        ...layer.transform,
        x: axis === "h" ? snapX(value) : layer.transform.x,
        y: axis === "v" ? snapY(value) : layer.transform.y,
      },
    };
  });
}

export function distributeDocumentLayers(
  document: EditorCanvasDocument,
  axis: "h" | "v"
): EditorCanvasDocument {
  const semantic = document.objects.filter((o) => o.layerType !== "background" && o.visible);
  if (semantic.length < 2) {
    return document;
  }
  const sorted = [...semantic].sort((a, b) =>
    axis === "h" ? a.transform.x - b.transform.x : a.transform.y - b.transform.y
  );
  const min = axis === "h" ? sorted[0]!.transform.x : sorted[0]!.transform.y;
  const max = axis === "h" ? sorted[sorted.length - 1]!.transform.x : sorted[sorted.length - 1]!.transform.y;
  const step = (max - min) / (sorted.length - 1);

  return {
    ...document,
    objects: document.objects.map((layer) => {
      const index = sorted.findIndex((s) => s.id === layer.id);
      if (index < 0) {
        return layer;
      }
      const value = min + step * index;
      return {
        ...layer,
        transform: {
          ...layer.transform,
          x: axis === "h" ? snapX(value) : layer.transform.x,
          y: axis === "v" ? snapY(value) : layer.transform.y,
        },
      };
    }),
    productivityState: {
      ...document.productivityState,
      showAlignmentGuides: true,
    },
    updatedAt: new Date().toISOString(),
  };
}
