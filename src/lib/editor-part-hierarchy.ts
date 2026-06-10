import { classifyEditorSemanticFeature } from "@/lib/editor-semantic-layer-taxonomy";
import { humanPartLabel } from "@/lib/editor-part-human-labels";
import { boundsToPolygon } from "@/lib/editor-object-mask";
import type { AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasBounds,
  EditorCanvasLayer,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorPartCategory,
  EditorPartAnimationProfile,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";

const PART_BOUNDS: Record<string, EditorCanvasBounds> = {
  head: { x: 0.32, y: 0.06, width: 0.36, height: 0.28 },
  face: { x: 0.36, y: 0.1, width: 0.28, height: 0.2 },
  hair: { x: 0.3, y: 0.04, width: 0.4, height: 0.14 },
  torso: { x: 0.28, y: 0.28, width: 0.44, height: 0.42 },
  left_arm: { x: 0.12, y: 0.3, width: 0.22, height: 0.22 },
  right_arm: { x: 0.66, y: 0.3, width: 0.22, height: 0.22 },
  left_hand: { x: 0.08, y: 0.42, width: 0.14, height: 0.12 },
  right_hand: { x: 0.78, y: 0.42, width: 0.14, height: 0.12 },
  legs: { x: 0.3, y: 0.58, width: 0.4, height: 0.32 },
  clothing: { x: 0.26, y: 0.3, width: 0.48, height: 0.48 },
  accessory: { x: 0.62, y: 0.28, width: 0.22, height: 0.18 },
  logo: { x: 0.34, y: 0.2, width: 0.32, height: 0.18 },
  globe: { x: 0.32, y: 0.04, width: 0.36, height: 0.36 },
  tie: { x: 0.44, y: 0.32, width: 0.12, height: 0.22 },
  prop: { x: 0.58, y: 0.42, width: 0.24, height: 0.24 },
};

const DEFAULT_PART_ANIMATION: Partial<Record<EditorPartCategory, EditorPartAnimationProfile>> = {
  head: "nod",
  left_arm: "wave",
  right_arm: "wave",
  logo: "spin",
  globe: "rotate",
};

function semanticTypeToPartCategory(type: string, label: string): EditorPartCategory {
  const lower = `${type} ${label}`.toLowerCase();
  if (lower.includes("globe")) return "globe";
  if (lower.includes("logo")) return "logo";
  if (lower.includes("tie")) return "tie";
  if (lower.includes("face")) return "face";
  if (lower.includes("hair")) return "hair";
  if (lower.includes("head")) return "head";
  if (lower.includes("left") && lower.includes("arm")) return "left_arm";
  if (lower.includes("right") && lower.includes("arm")) return "right_arm";
  if (lower.includes("left") && lower.includes("hand")) return "left_hand";
  if (lower.includes("right") && lower.includes("hand")) return "right_hand";
  if (lower.includes("arm")) return "left_arm";
  if (lower.includes("hand")) return "left_hand";
  if (lower.includes("leg")) return "legs";
  if (lower.includes("cloth") || lower.includes("apron") || lower.includes("outfit")) return "clothing";
  if (lower.includes("body") || lower.includes("torso")) return "torso";
  if (lower.includes("accessor")) return "accessory";
  return "prop";
}

function offsetBoundsToParent(
  partBounds: EditorCanvasBounds,
  parentBounds: EditorCanvasBounds
): EditorCanvasBounds {
  return {
    x: parentBounds.x + partBounds.x * parentBounds.width,
    y: parentBounds.y + partBounds.y * parentBounds.height,
    width: partBounds.width * parentBounds.width,
    height: partBounds.height * parentBounds.height,
  };
}

function createPart(input: {
  id: string;
  label: string;
  partCategory: EditorPartCategory;
  bbox: EditorCanvasBounds;
  parentPartId?: string;
  estimated?: boolean;
  mask?: string;
  polygon?: EditorObjectPart["polygon"];
}): EditorObjectPart {
  const animationProfile = DEFAULT_PART_ANIMATION[input.partCategory] ?? "none";
  return {
    id: input.id,
    label: input.label,
    partCategory: input.partCategory,
    parentPartId: input.parentPartId,
    childPartIds: [],
    bbox: input.bbox,
    polygon: input.polygon ?? boundsToPolygon(input.bbox),
    mask: input.mask,
    confidence: input.estimated ? 0.55 : 0.85,
    visible: true,
    locked: false,
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    animationProfile,
    estimatedBounds: input.estimated ?? true,
  };
}

const MASCOT_PART_SEEDS: Array<{ category: EditorPartCategory; relativeBounds: EditorCanvasBounds }> = [
  { category: "head", relativeBounds: PART_BOUNDS.head! },
  { category: "face", relativeBounds: PART_BOUNDS.face! },
  { category: "torso", relativeBounds: PART_BOUNDS.torso! },
  { category: "left_arm", relativeBounds: PART_BOUNDS.left_arm! },
  { category: "right_arm", relativeBounds: PART_BOUNDS.right_arm! },
  { category: "globe", relativeBounds: PART_BOUNDS.globe! },
  { category: "tie", relativeBounds: PART_BOUNDS.tie! },
  { category: "logo", relativeBounds: PART_BOUNDS.logo! },
];

export function buildDefaultMascotParts(rootBounds: EditorCanvasBounds): EditorObjectPart[] {
  return MASCOT_PART_SEEDS.map((seed, index) =>
    createPart({
      id: `part_${seed.category}_${index}`,
      label: humanPartLabel(seed.category),
      partCategory: seed.category,
      bbox: offsetBoundsToParent(seed.relativeBounds, rootBounds),
      parentPartId: seed.category === "face" ? `part_head_0` : undefined,
      estimated: true,
    })
  );
}

export function buildPartsFromSemanticChildren(
  rootObject: EditorObject,
  childLayers: EditorSemanticLayer[],
  visionObjectType?: AssetVisionObjectType
): EditorObjectPart[] {
  const parts: EditorObjectPart[] = [];
  const idByType = new Map<string, string>();

  for (const layer of childLayers) {
    if (layer.type === "background") continue;
    const category = semanticTypeToPartCategory(layer.type, layer.label);
    const classified = classifyEditorSemanticFeature(layer.label, visionObjectType ?? "unknown");
    const id = `part_${layer.id}`;
    const parentType = classified.parentType;
    const parentPartId = parentType ? idByType.get(parentType) : undefined;

    const part = createPart({
      id,
      label: humanPartLabel(category, layer.label),
      partCategory: category,
      bbox: layer.bounds,
      parentPartId,
      estimated: layer.metadata?.estimatedBounds ?? true,
      polygon: boundsToPolygon(layer.bounds),
    });
    parts.push(part);
    idByType.set(layer.type, id);
  }

  if (parts.length === 0 && (rootObject.category === "mascot" || rootObject.category === "person")) {
    return buildDefaultMascotParts(rootObject.bbox);
  }
  return parts;
}

export function buildObjectHierarchy(
  rootObject: EditorObject,
  layer: EditorCanvasLayer | null,
  semanticLayers: EditorSemanticLayer[],
  visionObjectType?: AssetVisionObjectType
): EditorObjectHierarchy {
  const childLayerIds = layer?.children ?? [];
  const childLayers = semanticLayers.filter(
    (l) => childLayerIds.includes(l.id) || l.parentId === layer?.id
  );

  const siblingLayers = semanticLayers.filter(
    (l) =>
      l.type !== "background" &&
      l.id !== layer?.id &&
      !childLayerIds.includes(l.id) &&
      l.bounds.x >= rootObject.bbox.x - 0.05 &&
      l.bounds.x + l.bounds.width <= rootObject.bbox.x + rootObject.bbox.width + 0.05
  );

  const allChildren = [...childLayers, ...siblingLayers.filter((s) => !childLayers.some((c) => c.id === s.id))];
  const parts = buildPartsFromSemanticChildren(rootObject, allChildren, visionObjectType);

  for (const part of parts) {
    if (part.parentPartId) {
      const parent = parts.find((p) => p.id === part.parentPartId);
      if (parent && !parent.childPartIds.includes(part.id)) {
        parent.childPartIds.push(part.id);
      }
    }
  }

  return {
    rootObjectId: rootObject.id,
    rootLayerId: rootObject.layerId,
    rootLabel: rootObject.label,
    parts,
  };
}

export function attachPartsToEditorObject(
  object: EditorObject,
  hierarchy: EditorObjectHierarchy
): EditorObject {
  return { ...object, parts: hierarchy.parts };
}

export function buildDocumentObjectHierarchies(
  objects: EditorObject[],
  layers: EditorCanvasLayer[],
  semanticLayers: EditorSemanticLayer[],
  visionObjectType?: AssetVisionObjectType
): Record<string, EditorObjectHierarchy> {
  const hierarchies: Record<string, EditorObjectHierarchy> = {};
  const layerById = new Map(layers.map((l) => [l.id, l]));

  for (const object of objects) {
    if (object.category === "background") continue;
    if (object.category === "mascot" || object.category === "person" || object.parts?.length) {
      const hierarchy = buildObjectHierarchy(
        object,
        layerById.get(object.layerId) ?? null,
        semanticLayers,
        visionObjectType
      );
      hierarchies[object.id] = hierarchy;
    }
  }
  return hierarchies;
}

export function findPartById(
  hierarchy: EditorObjectHierarchy,
  partId: string
): EditorObjectPart | null {
  return hierarchy.parts.find((p) => p.id === partId) ?? null;
}

export function partSupportsHierarchy(object: EditorObject): boolean {
  return (
    object.category === "mascot" ||
    object.category === "person" ||
    Boolean(object.parts?.length)
  );
}
