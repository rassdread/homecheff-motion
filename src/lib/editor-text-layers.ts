import { boundsToPolygon } from "@/lib/editor-object-mask";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorTextLayer,
} from "@/types/homecheff-visual-editor";

const TEXT_LABEL_PATTERN = /\b(text|title|headline|caption|subtitle|label|typography|lettering|slogan)\b/i;

export function isEditorTextLayerCandidate(layer: EditorCanvasLayer): boolean {
  if (layer.category === "text" || layer.semanticType === "text") {
    return true;
  }
  return TEXT_LABEL_PATTERN.test(layer.label);
}

export function extractEditorTextLayersFromObjects(
  objects: EditorObject[],
  layers: EditorCanvasLayer[]
): EditorTextLayer[] {
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const textObjects = objects.filter(
    (o) => o.category === "text" || isEditorTextLayerCandidate(layerById.get(o.layerId)!)
  );

  return textObjects.map((obj, index) => {
    const layer = layerById.get(obj.layerId);
    return {
      id: `text_${obj.layerId}`,
      content: layer?.label ?? obj.label,
      bbox: obj.bbox,
      mask: obj.mask,
      language: layer?.metadata?.rawFeature?.match(/^[a-z]{2}(-[A-Z]{2})?$/)?.[0],
      confidence: obj.confidence,
      layerId: obj.layerId,
      visible: obj.visible,
      locked: obj.locked,
      fontFamily: index === 0 ? undefined : undefined,
    };
  });
}

export function extractEditorTextLayers(layers: EditorCanvasLayer[]): EditorTextLayer[] {
  return layers
    .filter((l) => l.layerType !== "background" && isEditorTextLayerCandidate(l))
    .map((layer, index) => ({
      id: `text_${layer.id}`,
      content: layer.label,
      bbox: layer.bounds,
      mask: layer.selectionShape?.maskUrl ?? layer.selectionShape?.maskData,
      language: undefined,
      confidence: layer.confidence ?? 0.6,
      layerId: layer.id,
      visible: layer.visible,
      locked: layer.locked,
      fontFamily: undefined,
    }));
}

export function findEditorTextLayerAtPoint(
  point: { x: number; y: number },
  textLayers: EditorTextLayer[]
): EditorTextLayer | null {
  const sorted = [...textLayers].filter((t) => t.visible).reverse();
  for (const text of sorted) {
    const polygon = boundsToPolygon(text.bbox);
    const inside =
      point.x >= text.bbox.x &&
      point.x <= text.bbox.x + text.bbox.width &&
      point.y >= text.bbox.y &&
      point.y <= text.bbox.y + text.bbox.height;
    if (inside) {
      return text;
    }
    void polygon;
  }
  return null;
}

export type EditorTextLayerAction = "edit" | "translate" | "replace_font" | "animate";

export function editorTextLayerActions(text: EditorTextLayer): EditorTextLayerAction[] {
  const actions: EditorTextLayerAction[] = ["edit"];
  if (text.language) {
    actions.push("translate");
  } else {
    actions.push("translate");
  }
  actions.push("replace_font", "animate");
  return actions;
}
