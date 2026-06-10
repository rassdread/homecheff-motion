import type { TranslationKey } from "@/i18n";
import type { EditorCanvasLayer, EditorV6QuickAction } from "@/types/homecheff-visual-editor";

export const EDITOR_V6_QUICK_ACTION_LABEL_KEYS: Record<EditorV6QuickAction, TranslationKey> = {
  replace: "editor.v6.quick.replace",
  remove: "editor.v6.quick.remove",
  cutout: "editor.v6.quick.cutout",
  save: "editor.v6.quick.save",
  animate: "editor.v6.quick.animate",
  duplicate: "editor.v6.quick.duplicate",
};

export function quickActionsForLayer(layer: EditorCanvasLayer | null): EditorV6QuickAction[] {
  if (!layer) {
    return [];
  }
  if (layer.layerType === "background") {
    return ["replace", "save"];
  }
  return ["replace", "remove", "cutout", "save", "animate", "duplicate"];
}

export function quickActionMapsToHumanAction(
  action: EditorV6QuickAction
): "replace" | "remove" | "duplicate" | "prepare_animation" | "cutout" | "save" | null {
  switch (action) {
    case "replace":
      return "replace";
    case "remove":
      return "remove";
    case "duplicate":
      return "duplicate";
    case "animate":
      return "prepare_animation";
    case "cutout":
      return "cutout";
    case "save":
      return "save";
    default:
      return null;
  }
}
