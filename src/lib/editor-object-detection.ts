import { boundsToPolygon } from "@/lib/editor-object-mask";
import { classifyEditorSemanticFeature } from "@/lib/editor-semantic-layer-taxonomy";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorObjectCategory,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";

const CATEGORY_BY_SEMANTIC: Record<string, EditorObjectCategory> = {
  character: "mascot",
  head: "face",
  face: "face",
  eyes: "face",
  mouth: "face",
  body: "person",
  arms: "person",
  hands: "person",
  legs: "person",
  feet: "person",
  clothing: "clothing",
  headwear: "clothing",
  accessory: "clothing",
  logo: "logo",
  mark: "logo",
  text: "text",
  product_body: "product",
  packaging: "product",
  label: "product",
  cap: "product",
  food: "food",
  animal: "animal",
  vehicle: "vehicle",
  screen: "screen",
  foreground: "foreground",
  background: "background",
  subject: "foreground",
  held_object: "prop",
  object: "prop",
};

function resolveObjectCategory(
  layer: EditorCanvasLayer,
  visionObjectType?: AssetVisionObjectType
): EditorObjectCategory {
  const semantic = layer.semanticType ?? "";
  if (CATEGORY_BY_SEMANTIC[semantic]) {
    return CATEGORY_BY_SEMANTIC[semantic]!;
  }
  const classified = classifyEditorSemanticFeature(layer.label, visionObjectType ?? "unknown");
  if (CATEGORY_BY_SEMANTIC[classified.type]) {
    return CATEGORY_BY_SEMANTIC[classified.type]!;
  }
  if (layer.category === "text") {
    return "text";
  }
  if (layer.category === "logo" || layer.category === "brand_element") {
    return "logo";
  }
  if (layer.category === "clothing") {
    return "clothing";
  }
  if (layer.category === "product" || layer.category === "package" || layer.category === "label") {
    return "product";
  }
  if (layer.category === "background") {
    return "background";
  }
  if (layer.category === "character" || layer.category === "face" || layer.category === "body") {
    return layer.label.toLowerCase().includes("mascot") ? "mascot" : "person";
  }
  return "unknown";
}

function layerToEditorObject(
  layer: EditorCanvasLayer,
  zIndex: number,
  visionObjectType?: AssetVisionObjectType
): EditorObject {
  const shape = layer.selectionShape;
  const polygon = shape?.polygon ?? boundsToPolygon(layer.bounds);
  return {
    id: `obj_${layer.id}`,
    layerId: layer.id,
    label: layer.label,
    confidence: shape?.confidence ?? layer.confidence ?? 0.5,
    mask: shape?.maskUrl ?? shape?.maskData,
    maskStorageKey: shape?.maskStorageKey,
    polygon,
    bbox: shape?.boundingBox ?? layer.bounds,
    category: resolveObjectCategory(layer, visionObjectType),
    zIndex,
    parentId: layer.parentObjectId,
    visible: layer.visible,
    locked: layer.locked,
  };
}

export function buildEditorObjectsFromLayers(
  layers: EditorCanvasLayer[],
  options?: { visionObjectType?: AssetVisionObjectType }
): EditorObject[] {
  const sorted = [...layers].sort((a, b) => {
    const aBg = a.layerType === "background" ? -1 : 0;
    const bBg = b.layerType === "background" ? -1 : 0;
    if (aBg !== bBg) {
      return aBg - bBg;
    }
    return 0;
  });

  return sorted.map((layer, index) =>
    layerToEditorObject(layer, index, options?.visionObjectType)
  );
}

export function syncDetectedObjectsOnDocument(
  objects: EditorCanvasLayer[],
  existing?: EditorObject[],
  options?: { visionObjectType?: AssetVisionObjectType }
): EditorObject[] {
  const built = buildEditorObjectsFromLayers(objects, options);
  if (!existing?.length) {
    return built;
  }
  const zByLayer = new Map(existing.map((o) => [o.layerId, o.zIndex]));
  return built.map((obj) => ({
    ...obj,
    zIndex: zByLayer.get(obj.layerId) ?? obj.zIndex,
  }));
}

export function editorObjectFromSemanticLayer(
  layer: EditorSemanticLayer,
  zIndex: number,
  visionObjectType?: AssetVisionObjectType
): EditorObject {
  const canvasLayer: EditorCanvasLayer = {
    id: layer.id === "semantic_background" ? "background" : layer.id,
    label: layer.label,
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: layer.locked,
    visible: layer.visible,
    parentObjectId: layer.parentId,
    bounds: layer.bounds,
    layerType: layer.type === "background" ? "background" : "semantic",
    confidence: layer.confidence,
    semanticType: layer.type,
    category: layer.category,
    layerSource: layer.source,
    editable: layer.editable,
    children: layer.children,
    metadata: layer.metadata,
  };
  return layerToEditorObject(canvasLayer, zIndex, visionObjectType);
}

export function findEditorObjectByLayerId(
  objects: EditorObject[],
  layerId: string
): EditorObject | null {
  return objects.find((o) => o.layerId === layerId) ?? null;
}

export function visibleEditorObjects(objects: EditorObject[]): EditorObject[] {
  return objects.filter((o) => o.visible);
}
