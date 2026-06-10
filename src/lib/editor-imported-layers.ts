import { nextImportedLayerZIndex } from "@/lib/editor-dual-composer";
import type {
  EditorCanvasDocument,
  EditorCanvasTransform,
  EditorImportedLayer,
} from "@/types/homecheff-visual-editor";

export type CutoutDragPayload = {
  label: string;
  sourceAssetId?: string | null;
  sourceImageUrl: string;
  sourceStorageKey?: string;
  maskUrl?: string;
  cutoutUrl?: string;
  maskStorageKey?: string;
  dropPoint?: { x: number; y: number };
};

function defaultTransform(dropPoint?: { x: number; y: number }): EditorCanvasTransform {
  return {
    x: dropPoint?.x ?? 0.5,
    y: dropPoint?.y ?? 0.5,
    scale: 1,
    rotation: 0,
  };
}

export function createImportedLayerFromCutout(payload: CutoutDragPayload): EditorImportedLayer {
  const now = new Date().toISOString();
  const id = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    label: payload.label,
    sourceAssetId: payload.sourceAssetId ?? null,
    sourceImageUrl: payload.sourceImageUrl,
    sourceStorageKey: payload.sourceStorageKey,
    maskUrl: payload.maskUrl,
    cutoutUrl: payload.cutoutUrl ?? payload.sourceImageUrl,
    maskStorageKey: payload.maskStorageKey,
    transform: defaultTransform(payload.dropPoint),
    zIndex: 10,
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
}

export function dropCutoutIntoTarget(
  document: EditorCanvasDocument,
  payload: CutoutDragPayload
): EditorCanvasDocument {
  const layer = createImportedLayerFromCutout(payload);
  layer.zIndex = nextImportedLayerZIndex(document.importedLayers);
  return {
    ...document,
    importedLayers: [...(document.importedLayers ?? []), layer],
    workspaceMode: "compose",
    updatedAt: new Date().toISOString(),
  };
}

export function updateImportedLayer(
  document: EditorCanvasDocument,
  layerId: string,
  patch: Partial<EditorImportedLayer>
): EditorCanvasDocument {
  return {
    ...document,
    importedLayers: (document.importedLayers ?? []).map((l) =>
      l.id === layerId ? { ...l, ...patch } : l
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeImportedLayer(
  document: EditorCanvasDocument,
  layerId: string
): EditorCanvasDocument {
  return {
    ...document,
    importedLayers: (document.importedLayers ?? []).filter((l) => l.id !== layerId),
    updatedAt: new Date().toISOString(),
  };
}

export function importedLayerUsesCutout(layer: EditorImportedLayer): boolean {
  return Boolean(layer.cutoutUrl || layer.maskUrl);
}

export function cutoutReadyForDrop(input: {
  cutoutUrl?: string;
  maskUrl?: string;
}): boolean {
  return Boolean(input.cutoutUrl || input.maskUrl);
}
