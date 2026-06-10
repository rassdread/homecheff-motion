import { visibleEditorPlacements } from "@/lib/editor-placement-canvas";
import type {
  EditorCanvasDocument,
  EditorCanvasTransform,
  EditorImportedLayer,
  EditorPlacementItem,
} from "@/types/homecheff-visual-editor";

export const EDITOR_COMPOSITOR_LAYER_KINDS = [
  "background",
  "imported",
  "cutout",
  "placement",
  "text",
] as const;

export type EditorCompositorLayerKind = (typeof EDITOR_COMPOSITOR_LAYER_KINDS)[number];

export type EditorCompositorLayer = {
  id: string;
  kind: EditorCompositorLayerKind;
  label: string;
  imageUrl: string;
  transform: EditorCanvasTransform;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  sourceRef?: string;
};

export function resolveCompositorLayerImageUrl(layer: {
  cutoutUrl?: string;
  sourceImageUrl?: string;
  previewUrl?: string;
  imageUrl?: string;
}): string {
  return layer.cutoutUrl ?? layer.previewUrl ?? layer.sourceImageUrl ?? layer.imageUrl ?? "";
}

export function importedLayerToCompositor(layer: EditorImportedLayer): EditorCompositorLayer {
  const imageUrl = resolveCompositorLayerImageUrl(layer);
  return {
    id: `imported:${layer.id}`,
    kind: layer.cutoutUrl ? "cutout" : "imported",
    label: layer.label,
    imageUrl,
    transform: layer.transform,
    width: 0.28,
    height: 0.28,
    opacity: layer.opacity,
    zIndex: layer.zIndex,
    visible: layer.visible !== false,
    locked: layer.locked,
    sourceRef: layer.id,
  };
}

export function placementToCompositor(placement: EditorPlacementItem): EditorCompositorLayer | null {
  if (!placement.previewUrl?.trim()) {
    return null;
  }
  return {
    id: `placement:${placement.id}`,
    kind: "placement",
    label: placement.sourceName,
    imageUrl: placement.previewUrl,
    transform: placement.canvasTransform,
    width: (placement.canvasWidth ?? 0.2) * placement.canvasTransform.scale,
    height: (placement.canvasHeight ?? 0.15) * placement.canvasTransform.scale,
    opacity: placement.opacity ?? 1,
    zIndex: 20 + (placement.zIndex ?? 0),
    visible: placement.visible !== false,
    locked: placement.canvasLocked,
    sourceRef: placement.id,
  };
}

export function buildEditorCompositorLayers(document: EditorCanvasDocument): EditorCompositorLayer[] {
  const layers: EditorCompositorLayer[] = [];

  if (document.backgroundUrl?.trim()) {
    layers.push({
      id: "background:main",
      kind: "background",
      label: "Background",
      imageUrl: document.backgroundUrl,
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      width: 1,
      height: 1,
      opacity: 1,
      zIndex: 0,
      visible: true,
      locked: true,
    });
  }

  const importedIds = new Set<string>();
  for (const imported of document.importedLayers ?? []) {
    if (!imported.visible) {
      continue;
    }
    const imageUrl = resolveCompositorLayerImageUrl(imported);
    if (!imageUrl) {
      continue;
    }
    importedIds.add(imported.id);
    layers.push(importedLayerToCompositor(imported));
  }

  const promotedCutoutUrls = new Set(
    (document.importedLayers ?? [])
      .map((layer) => layer.cutoutUrl?.trim())
      .filter((url): url is string => Boolean(url))
  );

  for (const cutout of document.cutoutAssets ?? []) {
    if (!cutout.cutoutUrl || promotedCutoutUrls.has(cutout.cutoutUrl)) {
      continue;
    }
    const objectLayer = document.objects.find((o) => o.id === cutout.layerId);
    const transform = objectLayer?.transform ?? {
      x: cutout.boundingBox.x + cutout.boundingBox.width / 2,
      y: cutout.boundingBox.y + cutout.boundingBox.height / 2,
      scale: 1,
      rotation: 0,
    };
    layers.push({
      id: `cutout:${cutout.id}`,
      kind: "cutout",
      label: cutout.label,
      imageUrl: cutout.cutoutUrl,
      transform,
      width: cutout.boundingBox.width,
      height: cutout.boundingBox.height,
      opacity: 1,
      zIndex: 15,
      visible: true,
      locked: false,
      sourceRef: cutout.id,
    });
  }

  for (const text of document.textLayers ?? []) {
    if (!text.visible) {
      continue;
    }
    layers.push({
      id: `text:${text.id}`,
      kind: "text",
      label: text.content.slice(0, 24),
      imageUrl: "",
      transform: {
        x: text.bbox.x + text.bbox.width / 2,
        y: text.bbox.y + text.bbox.height / 2,
        scale: 1,
        rotation: 0,
      },
      width: text.bbox.width,
      height: text.bbox.height,
      opacity: 1,
      zIndex: 25,
      visible: true,
      locked: text.locked,
      sourceRef: text.id,
    });
  }

  for (const placement of visibleEditorPlacements(document)) {
    const compositor = placementToCompositor(placement as EditorPlacementItem);
    if (compositor) {
      layers.push(compositor);
    }
  }

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

/** Preview overlays — placements stay on the interactive placement stack. */
export function compositorOverlayLayers(document: EditorCanvasDocument): EditorCompositorLayer[] {
  return buildEditorCompositorLayers(document).filter(
    (layer) => layer.kind !== "background" && layer.kind !== "placement"
  );
}

export function parseCompositorLayerId(compositorId: string): {
  kind: EditorCompositorLayerKind;
  sourceId: string;
} | null {
  const idx = compositorId.indexOf(":");
  if (idx <= 0) {
    return null;
  }
  const kind = compositorId.slice(0, idx) as EditorCompositorLayerKind;
  if (!EDITOR_COMPOSITOR_LAYER_KINDS.includes(kind)) {
    return null;
  }
  return { kind, sourceId: compositorId.slice(idx + 1) };
}

export function promoteCutoutToImportedLayer(
  document: EditorCanvasDocument,
  params: {
    cutoutUrl: string;
    label: string;
    layerId: string;
    maskUrl?: string;
    dropPoint?: { x: number; y: number };
  }
): EditorCanvasDocument {
  const objectLayer = document.objects.find((o) => o.id === params.layerId);
  const existing = (document.importedLayers ?? []).find(
    (l) => l.cutoutUrl === params.cutoutUrl || l.label === `${params.label} — cutout`
  );
  if (existing) {
    return document;
  }
  const now = new Date().toISOString();
  const imported: EditorImportedLayer = {
    id: `imported_cutout_${params.layerId}_${Date.now()}`,
    label: `${params.label} — cutout`,
    sourceAssetId: document.sourceAssetId,
    sourceImageUrl: params.cutoutUrl,
    cutoutUrl: params.cutoutUrl,
    maskUrl: params.maskUrl,
    transform: objectLayer?.transform ?? { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    zIndex: Math.max(...(document.importedLayers ?? []).map((l) => l.zIndex), 10) + 1,
    blendMode: "normal",
    opacity: 1,
    shadow: false,
    softEdge: 0,
    locked: false,
    visible: true,
    flippedX: false,
    flippedY: false,
    matchLighting: false,
    matchColor: false,
    createdAt: now,
  };
  return {
    ...document,
    importedLayers: [...(document.importedLayers ?? []), imported],
    updatedAt: now,
  };
}

export function syncCompositorMasterBackground(document: EditorCanvasDocument, flattenedUrl: string): EditorCanvasDocument {
  return {
    ...document,
    backgroundUrl: flattenedUrl,
    updatedAt: new Date().toISOString(),
  };
}
