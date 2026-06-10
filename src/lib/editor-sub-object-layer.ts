import {
  applyEditorSegmentApiShape,
  type EditorSegmentApiShape,
} from "@/lib/editor-apply-segment-result";
import {
  editorLayerHasPreciseShape,
  isApproximateEditorSelection,
} from "@/lib/editor-object-mask";
import { maskHitTest, pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { normalizeEditorSegmentPrompt } from "@/lib/editor-segmentation-prompt";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorPartCategory,
  EditorShapePoint,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

export function isPromptCreatedSubLayer(layer: EditorCanvasLayer | null | undefined): boolean {
  return Boolean(layer?.metadata?.promptCreatedSubLayer);
}

export function promptToPartCategory(prompt: string): EditorPartCategory {
  const normalized = normalizeEditorSegmentPrompt(prompt);
  const map: Record<string, EditorPartCategory> = {
    globe: "globe",
    logo: "logo",
    tie: "tie",
    head: "head",
    person: "torso",
    text: "prop",
    product: "prop",
    background: "prop",
  };
  return map[normalized] ?? "prop";
}

export function promptToDisplayLabel(prompt: string): string {
  const normalized = normalizeEditorSegmentPrompt(prompt);
  const labels: Record<string, string> = {
    globe: "Globe",
    logo: "Logo",
    tie: "Tie",
    head: "Head",
    person: "Person",
    text: "Text",
    product: "Product",
    background: "Background",
  };
  return labels[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function segmentPromptSuccessMessageKey(prompt: string): string {
  const normalized = normalizeEditorSegmentPrompt(prompt);
  const keys: Record<string, string> = {
    globe: "editor.clickSegment.selectedGlobe",
    logo: "editor.clickSegment.selectedLogo",
    tie: "editor.clickSegment.selectedTie",
    text: "editor.clickSegment.selectedText",
    person: "editor.clickSegment.selectedPerson",
    product: "editor.clickSegment.selectedProduct",
    head: "editor.clickSegment.selectedObject",
  };
  return keys[normalized] ?? "editor.clickSegment.selectedObject";
}

function clickBoundsAroundPoint(point: EditorShapePoint, size = 0.2) {
  return {
    x: Math.max(0, Math.min(1 - size, point.x - size / 2)),
    y: Math.max(0, Math.min(1 - size, point.y - size / 2)),
    width: size,
    height: size,
  };
}

export function resolveParentLayerAtClick(
  objects: EditorCanvasLayer[],
  point: EditorShapePoint,
  detectedObjects: EditorObject[]
): EditorCanvasLayer | null {
  const hit = pickTopEditorObjectAtPoint(point, detectedObjects);
  if (!hit) {
    return null;
  }
  const layer = objects.find((o) => o.id === hit.object.layerId) ?? null;
  if (!layer || layer.layerType === "background") {
    return null;
  }
  if (isPromptCreatedSubLayer(layer) && editorLayerHasPreciseShape(layer)) {
    return null;
  }
  if (isApproximateEditorSelection(layer) || hit.method === "bbox") {
    return layer;
  }
  if (layer.parentObjectId) {
    return objects.find((o) => o.id === layer.parentObjectId) ?? layer;
  }
  return layer;
}

export function createSubObjectLayer(input: {
  point: EditorShapePoint;
  prompt: string;
  sourceKind: EditorSourceKind;
  sourceAssetId: string | null;
  backgroundStorageKey?: string;
  backgroundUrl: string;
  parentLayer?: EditorCanvasLayer | null;
  labelOverride?: string;
}): EditorCanvasLayer {
  const prompt = normalizeEditorSegmentPrompt(input.prompt);
  const label = input.labelOverride ?? promptToDisplayLabel(prompt);
  const parent = input.parentLayer ?? null;
  const bounds = parent ? { ...parent.bounds } : clickBoundsAroundPoint(input.point);
  const id = `sub_${prompt}_${Date.now()}`;

  return {
    id,
    label,
    sourceKind: input.sourceKind,
    assetId: input.sourceAssetId,
    storageKey: input.backgroundStorageKey ?? "",
    previewUrl: input.backgroundUrl,
    transform: {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      scale: 1,
      rotation: 0,
    },
    locked: false,
    visible: true,
    parentObjectId: parent?.id,
    bounds,
    layerType: "semantic",
    confidence: 0.7,
    semanticType: prompt,
    category: promptToPartCategory(prompt) === "globe" ? "brand_element" : "prop",
    layerSource: "segment_prompt",
    editable: true,
    children: [],
    metadata: {
      promptCreatedSubLayer: true,
      segmentPrompt: prompt,
      parentLayerId: parent?.id,
      approximateSelection: true,
      estimatedBounds: true,
      bootstrapRegion: false,
    },
  };
}

/** Attach child under parent without mutating the parent layer's geometry or label. */
export function attachSubObjectLayer(
  objects: EditorCanvasLayer[],
  childLayer: EditorCanvasLayer
): EditorCanvasLayer[] {
  const parentId = childLayer.parentObjectId ?? childLayer.metadata?.parentLayerId;
  const withChild = [...objects, childLayer];
  if (!parentId) {
    return withChild;
  }
  return withChild.map((layer) => {
    if (layer.id !== parentId) {
      return layer;
    }
    const children = [...(layer.children ?? [])];
    if (!children.includes(childLayer.id)) {
      children.push(childLayer.id);
    }
    return { ...layer, children };
  });
}

export function applySegmentToSubObjectLayer(
  layer: EditorCanvasLayer,
  result: EditorSegmentApiShape
): EditorCanvasLayer {
  return applyEditorSegmentApiShape(layer, {
    ...result,
    segmentationSource: result.segmentationSource ?? "replicate_sam3",
    providerUsed: result.providerUsed ?? "replicate_sam3",
  });
}

export function pickPromptSubObjectAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[],
  layers: EditorCanvasLayer[]
): EditorObject | null {
  const promptLayers = new Set(
    layers.filter((l) => isPromptCreatedSubLayer(l) && editorLayerHasPreciseShape(l)).map((l) => l.id)
  );
  const candidates = objects.filter(
    (o) => promptLayers.has(o.layerId) && o.visible && maskHitTest(point, o)
  );
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => {
    const areaA = a.bbox.width * a.bbox.height;
    const areaB = b.bbox.width * b.bbox.height;
    if (areaA !== areaB) {
      return areaA - areaB;
    }
    return b.zIndex - a.zIndex;
  });
  return candidates[0] ?? null;
}

export function realSubLayerCategoriesAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[],
  layers: EditorCanvasLayer[]
): Set<EditorPartCategory> {
  const categories = new Set<EditorPartCategory>();
  for (const layer of layers) {
    if (!isPromptCreatedSubLayer(layer) || !editorLayerHasPreciseShape(layer)) {
      continue;
    }
    const obj = objects.find((o) => o.layerId === layer.id);
    if (!obj || !maskHitTest(point, obj)) {
      continue;
    }
    categories.add(promptToPartCategory(layer.metadata?.segmentPrompt ?? layer.semanticType ?? layer.label));
  }
  return categories;
}
