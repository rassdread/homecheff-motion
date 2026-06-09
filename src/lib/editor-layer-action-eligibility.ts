import type {
  EditorCanvasLayer,
  EditorLayerActionEligibility,
  EditorObjectOperation,
} from "@/types/homecheff-visual-editor";

const ALL_ENABLED: EditorLayerActionEligibility = {
  move: true,
  scale: true,
  rotate: true,
  replace: true,
  delete: true,
  duplicate: true,
  visibility: true,
  lock: true,
  rename: true,
  reset: true,
};

export function resolveEditorLayerActionEligibility(
  layer: EditorCanvasLayer | null | undefined
): EditorLayerActionEligibility {
  if (!layer || layer.layerType === "background") {
    return {
      ...ALL_ENABLED,
      move: false,
      scale: false,
      rotate: false,
      duplicate: false,
      delete: false,
      replace: true,
      rename: false,
      reset: false,
    };
  }

  const relevance = layer.metadata?.identityRelevance ?? "none";
  const isIdentityMarker =
    relevance === "identity_marker" || layer.semanticType === "identity_shape_marker";
  const isProtectedBrand = relevance === "protected_brand_element";
  const isBackground = layer.category === "background" || layer.semanticType === "background";

  if (isIdentityMarker) {
    return {
      move: false,
      scale: false,
      rotate: false,
      replace: false,
      delete: false,
      duplicate: false,
      visibility: true,
      lock: true,
      rename: false,
      reset: false,
    };
  }

  if (isProtectedBrand) {
    return {
      move: true,
      scale: true,
      rotate: false,
      replace: true,
      delete: false,
      duplicate: true,
      visibility: true,
      lock: true,
      rename: true,
      reset: true,
    };
  }

  if (isBackground) {
    return {
      move: false,
      scale: false,
      rotate: false,
      replace: true,
      delete: true,
      duplicate: false,
      visibility: true,
      lock: true,
      rename: false,
      reset: false,
    };
  }

  if (relevance === "placement_target") {
    return {
      move: true,
      scale: true,
      rotate: true,
      replace: true,
      delete: true,
      duplicate: true,
      visibility: true,
      lock: true,
      rename: true,
      reset: true,
    };
  }

  if (layer.editable === false || layer.locked) {
    return {
      ...ALL_ENABLED,
      move: !layer.locked,
      scale: !layer.locked,
      rotate: !layer.locked,
      replace: !layer.locked,
      delete: !layer.locked,
      duplicate: !layer.locked,
      rename: !layer.locked,
      reset: !layer.locked,
    };
  }

  return ALL_ENABLED;
}

export function isEditorOperationAllowed(
  layer: EditorCanvasLayer | null | undefined,
  operation: EditorObjectOperation
): boolean {
  return resolveEditorLayerActionEligibility(layer)[operation];
}
