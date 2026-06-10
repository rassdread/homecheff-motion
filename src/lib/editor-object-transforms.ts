import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorCanvasTransform,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
} from "@/types/homecheff-visual-editor";

export type EditorTransformOperation = "move" | "scale" | "rotate" | "duplicate" | "hide" | "lock";

export function defaultLocalTransform(): EditorCanvasTransform {
  return { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
}

export function applyPartTransform(
  part: EditorObjectPart,
  patch: Partial<EditorCanvasTransform>
): EditorObjectPart {
  return {
    ...part,
    transform: { ...part.transform, ...patch },
  };
}

export function applyObjectLocalTransform(
  object: EditorObject,
  patch: Partial<EditorCanvasTransform>
): EditorObject {
  return {
    ...object,
    localTransform: { ...(object.localTransform ?? defaultLocalTransform()), ...patch },
  };
}

export function transformPartInHierarchy(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  patch: Partial<EditorCanvasTransform>
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) => (p.id === partId ? applyPartTransform(p, patch) : p)),
  };
}

export function setPartVisibility(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  visible: boolean
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) => (p.id === partId ? { ...p, visible } : p)),
  };
}

export function setPartLocked(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  locked: boolean
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) => (p.id === partId ? { ...p, locked } : p)),
  };
}

export function duplicatePartInHierarchy(
  hierarchy: EditorObjectHierarchy,
  partId: string
): EditorObjectHierarchy {
  const source = hierarchy.parts.find((p) => p.id === partId);
  if (!source) return hierarchy;
  const copy: EditorObjectPart = {
    ...source,
    id: `${source.id}_copy_${Date.now()}`,
    label: `${source.label} Copy`,
    bbox: {
      ...source.bbox,
      x: Math.min(0.9, source.bbox.x + 0.04),
      y: Math.min(0.9, source.bbox.y + 0.04),
    },
    childPartIds: [],
  };
  return { ...hierarchy, parts: [...hierarchy.parts, copy] };
}

export function applyTransformToDocument(
  document: EditorCanvasDocument,
  input: {
    rootObjectId: string;
    partId?: string;
    operation: EditorTransformOperation;
    transformPatch?: Partial<EditorCanvasTransform>;
  }
): EditorCanvasDocument {
  const hierarchies = { ...(document.objectHierarchies ?? {}) };
  const hierarchy = hierarchies[input.rootObjectId];
  if (!hierarchy) return document;

  let nextHierarchy = hierarchy;
  if (input.partId) {
    switch (input.operation) {
      case "move":
      case "scale":
      case "rotate":
        nextHierarchy = transformPartInHierarchy(
          hierarchy,
          input.partId,
          input.transformPatch ?? {}
        );
        break;
      case "hide":
        nextHierarchy = setPartVisibility(hierarchy, input.partId, false);
        break;
      case "lock":
        nextHierarchy = setPartLocked(hierarchy, input.partId, true);
        break;
      case "duplicate":
        nextHierarchy = duplicatePartInHierarchy(hierarchy, input.partId);
        break;
    }
  }

  hierarchies[input.rootObjectId] = nextHierarchy;

  const detectedObjects = (document.detectedObjects ?? []).map((obj) =>
    obj.id === input.rootObjectId
      ? { ...obj, parts: nextHierarchy.parts, localTransform: input.transformPatch ? applyObjectLocalTransform(obj, input.transformPatch).localTransform : obj.localTransform }
      : obj
  );

  let objects = document.objects;
  if (!input.partId && input.transformPatch) {
    const layerId = hierarchy.rootLayerId;
    objects = document.objects.map((layer) =>
      layer.id === layerId
        ? { ...layer, transform: { ...layer.transform, ...input.transformPatch } }
        : layer
    );
  }

  return {
    ...document,
    objectHierarchies: hierarchies,
    detectedObjects,
    objects,
    updatedAt: new Date().toISOString(),
  };
}

export function patchPartMask(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  mask: { maskUrl?: string; maskStorageKey?: string; polygon?: EditorObjectPart["polygon"]; cutoutUrl?: string }
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) =>
      p.id === partId
        ? {
            ...p,
            mask: mask.maskUrl ?? p.mask,
            maskStorageKey: mask.maskStorageKey ?? p.maskStorageKey,
            polygon: mask.polygon ?? p.polygon,
            cutoutUrl: mask.cutoutUrl ?? p.cutoutUrl,
            estimatedBounds: false,
            confidence: 0.9,
          }
        : p
    ),
  };
}

export function layerTransformFromPart(part: EditorObjectPart): EditorCanvasTransform {
  return part.transform;
}

export function mergePartTransformOntoLayer(
  layer: EditorCanvasLayer,
  part: EditorObjectPart
): EditorCanvasLayer {
  return {
    ...layer,
    bounds: part.bbox,
    transform: part.transform,
    visible: part.visible,
    locked: part.locked,
  };
}
