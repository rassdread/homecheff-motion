import { editorDeleteShouldInpaintMask } from "@/lib/editor-mask-actions";
import { resolveEditorMaskOperationRegion } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorSmartRemovePlan = {
  layerId: string;
  label: string;
  inpaintMaskedArea: boolean;
  maskUrl?: string;
  polygonPointCount: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  preserveSurrounding: boolean;
  ready: boolean;
  message: string;
};

export function planEditorSmartRemove(layer: EditorCanvasLayer): EditorSmartRemovePlan {
  const region = resolveEditorMaskOperationRegion(layer);
  const inpaint = editorDeleteShouldInpaintMask(layer);

  return {
    layerId: layer.id,
    label: layer.label,
    inpaintMaskedArea: inpaint,
    maskUrl: region?.maskUrl,
    polygonPointCount: region?.polygon?.length ?? 0,
    boundingBox: region?.boundingBox ?? layer.bounds,
    preserveSurrounding: true,
    ready: inpaint || Boolean(region),
    message: inpaint
      ? `Remove "${layer.label}" and inpaint only the masked area`
      : `Remove "${layer.label}" — refine selection for inpaint precision`,
  };
}

export function editorSmartRemoveIsNonDestructive(layer: EditorCanvasLayer): boolean {
  return layer.layerType !== "background";
}
