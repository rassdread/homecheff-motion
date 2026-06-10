import { editorReplaceShouldUseMask } from "@/lib/editor-mask-actions";
import { resolveEditorMaskOperationRegion } from "@/lib/editor-object-mask";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorSmartReplaceInput = {
  layer: EditorCanvasLayer;
  prompt?: string;
  replacementImageUrl?: string;
};

export type EditorSmartReplacePlan = {
  layerId: string;
  label: string;
  usesMask: boolean;
  maskUrl?: string;
  polygonPointCount: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  prompt?: string;
  replacementImageUrl?: string;
  constrainedToMask: boolean;
  ready: boolean;
  message: string;
};

export function planEditorSmartReplace(input: EditorSmartReplaceInput): EditorSmartReplacePlan {
  const { layer, prompt, replacementImageUrl } = input;
  const region = resolveEditorMaskOperationRegion(layer);
  const usesMask = editorReplaceShouldUseMask(layer);
  const hasInput = Boolean(prompt?.trim() || replacementImageUrl?.trim());

  return {
    layerId: layer.id,
    label: layer.label,
    usesMask,
    maskUrl: region?.maskUrl,
    polygonPointCount: region?.polygon?.length ?? 0,
    boundingBox: region?.boundingBox ?? layer.bounds,
    prompt: prompt?.trim(),
    replacementImageUrl: replacementImageUrl?.trim(),
    constrainedToMask: usesMask,
    ready: hasInput && (usesMask || region !== null),
    message: usesMask
      ? `Replace "${layer.label}" constrained to object mask`
      : `Replace "${layer.label}" using bounding region — refine selection for precision`,
  };
}

export function editorSmartReplaceRequiresRefine(plan: EditorSmartReplacePlan): boolean {
  return !plan.usesMask && plan.polygonPointCount < 4;
}
