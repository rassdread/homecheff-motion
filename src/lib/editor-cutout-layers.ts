import { boundsFromPolygon } from "@/lib/editor-object-mask";
import type {
  EditorCanvasLayer,
  EditorCutoutAsset,
  EditorObject,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";

export function buildEditorCutoutAsset(input: {
  object: EditorObject;
  layer: EditorCanvasLayer;
  cutoutUrl: string;
  maskUrl?: string;
  maskStorageKey?: string;
  polygon?: EditorShapePoint[];
}): EditorCutoutAsset {
  const polygon =
    input.polygon ??
    input.layer.selectionShape?.polygon ??
    input.object.polygon;
  const boundingBox =
    input.layer.selectionShape?.boundingBox ??
    (polygon?.length ? boundsFromPolygon(polygon) : input.object.bbox);

  return {
    id: `cutout_${input.object.id}`,
    objectId: input.object.id,
    layerId: input.layer.id,
    label: `${input.layer.label} Cutout`,
    cutoutUrl: input.cutoutUrl,
    maskUrl: input.maskUrl ?? input.layer.selectionShape?.maskUrl,
    maskStorageKey: input.maskStorageKey ?? input.layer.selectionShape?.maskStorageKey,
    polygon,
    boundingBox,
    createdAt: new Date().toISOString(),
  };
}

export function upsertEditorCutoutAsset(
  assets: EditorCutoutAsset[] | undefined,
  asset: EditorCutoutAsset
): EditorCutoutAsset[] {
  const list = assets ?? [];
  const without = list.filter((a) => a.layerId !== asset.layerId);
  return [...without, asset];
}

export function findEditorCutoutForLayer(
  assets: EditorCutoutAsset[] | undefined,
  layerId: string
): EditorCutoutAsset | null {
  return assets?.find((a) => a.layerId === layerId) ?? null;
}

export function editorCutoutReady(layer: EditorCanvasLayer | null): boolean {
  return Boolean(
    layer?.selectionShape?.cutoutUrl ||
      layer?.selectionShape?.maskUrl ||
      layer?.previewUrl
  );
}
