import { editorAnimationBoundaryUsesMask } from "@/lib/editor-mask-actions";
import { boundsToPolygon } from "@/lib/editor-object-mask";
import type {
  EditorCanvasLayer,
  EditorMotionPreparation,
  EditorObject,
} from "@/types/homecheff-visual-editor";

function depthHintForCategory(category: EditorObject["category"]): number {
  switch (category) {
    case "background":
      return 0;
    case "foreground":
      return 0.3;
    case "product":
    case "prop":
      return 0.5;
    case "clothing":
      return 0.55;
    case "person":
    case "mascot":
      return 0.65;
    case "face":
      return 0.75;
    case "logo":
    case "text":
      return 0.85;
    default:
      return 0.5;
  }
}

function safeAnimationBounds(bounds: EditorObject["bbox"], inset = 0.04) {
  return {
    x: Math.min(0.98, bounds.x + inset),
    y: Math.min(0.98, bounds.y + inset),
    width: Math.max(0.02, bounds.width - inset * 2),
    height: Math.max(0.02, bounds.height - inset * 2),
  };
}

export function prepareEditorMotionForObject(
  object: EditorObject,
  layer: EditorCanvasLayer | null
): EditorMotionPreparation {
  const usesMask = layer ? editorAnimationBoundaryUsesMask(layer) : Boolean(object.mask);
  const motionRegion = object.bbox;
  const polygon = object.polygon ?? boundsToPolygon(object.bbox);

  return {
    objectId: object.id,
    layerId: object.layerId,
    cutoutUrl: layer?.selectionShape?.cutoutUrl,
    depthHint: depthHintForCategory(object.category),
    motionRegion,
    safeAnimationBounds: safeAnimationBounds(motionRegion),
    ready: usesMask || polygon.length >= 4,
  };
}

export function buildEditorMotionPreparations(
  objects: EditorObject[],
  layers: EditorCanvasLayer[]
): EditorMotionPreparation[] {
  const layerById = new Map(layers.map((l) => [l.id, l]));
  return objects
    .filter((o) => o.category !== "background" && o.visible)
    .map((object) => prepareEditorMotionForObject(object, layerById.get(object.layerId) ?? null));
}

export function editorMotionReadyObjectCount(preparations: EditorMotionPreparation[]): number {
  return preparations.filter((p) => p.ready).length;
}
