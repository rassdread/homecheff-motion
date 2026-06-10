import type { TranslationKey } from "@/i18n";
import { isUxV7ObjectActionHidden } from "@/lib/editor-broken-features";
import { resolveEditorObjectKind } from "@/lib/editor-human-first";
import {
  layerShowsRefineAction,
  uxV7ActionAllowed,
} from "@/lib/editor-selection-pipeline";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export const EDITOR_UX_V7_NO_SELECTION_ACTIONS = [
  "edit_photo",
  "add_object",
  "background",
  "gif",
  "export",
] as const;

export type EditorUxV7NoSelectionAction = (typeof EDITOR_UX_V7_NO_SELECTION_ACTIONS)[number];

export const EDITOR_UX_V7_OBJECT_ACTIONS = [
  "refine_selection",
  "replace",
  "remove",
  "cutout",
  "animate",
  "duplicate",
  "resize",
  "move",
  "background_replace",
  "background_remove",
  "background_expand",
  "background_blur",
] as const;

export type EditorUxV7ObjectAction = (typeof EDITOR_UX_V7_OBJECT_ACTIONS)[number];

export const EDITOR_UX_V7_NO_SELECTION_LABEL_KEYS: Record<EditorUxV7NoSelectionAction, TranslationKey> = {
  edit_photo: "editor.uxV7.noSelection.editPhoto",
  add_object: "editor.uxV7.noSelection.addObject",
  background: "editor.uxV7.noSelection.background",
  gif: "editor.uxV7.noSelection.gif",
  export: "editor.uxV7.noSelection.export",
};

export const EDITOR_UX_V7_OBJECT_ACTION_LABEL_KEYS: Record<EditorUxV7ObjectAction, TranslationKey> = {
  refine_selection: "editor.selectionFix.refine",
  replace: "editor.uxV7.action.replace",
  remove: "editor.uxV7.action.remove",
  cutout: "editor.uxV7.action.cutout",
  animate: "editor.uxV7.action.animate",
  duplicate: "editor.uxV7.action.duplicate",
  resize: "editor.uxV7.action.resize",
  move: "editor.uxV7.action.move",
  background_replace: "editor.uxV7.action.replaceBackground",
  background_remove: "editor.uxV7.action.removeBackground",
  background_expand: "editor.uxV7.action.expandBackground",
  background_blur: "editor.uxV7.action.blurBackground",
};

const CHARACTER_ACTIONS: EditorUxV7ObjectAction[] = [
  "replace",
  "remove",
  "cutout",
  "animate",
  "duplicate",
];

const LOGO_ACTIONS: EditorUxV7ObjectAction[] = ["replace", "resize", "move", "remove"];

const BACKGROUND_ACTIONS: EditorUxV7ObjectAction[] = [
  "background_replace",
  "background_remove",
  "background_expand",
  "background_blur",
];

const TEXT_ACTIONS: EditorUxV7ObjectAction[] = ["replace", "move", "remove"];

export function resolveUxV7NoSelectionActions(): EditorUxV7NoSelectionAction[] {
  return [...EDITOR_UX_V7_NO_SELECTION_ACTIONS];
}

function filterVisibleUxV7Actions(actions: EditorUxV7ObjectAction[]): EditorUxV7ObjectAction[] {
  return actions.filter((action) => !isUxV7ObjectActionHidden(action));
}

function gateUxV7Actions(
  layer: EditorCanvasLayer,
  actions: EditorUxV7ObjectAction[]
): EditorUxV7ObjectAction[] {
  const gated = actions.filter((action) => uxV7ActionAllowed(layer, action));
  if (layerShowsRefineAction(layer)) {
    return ["refine_selection", ...gated];
  }
  return gated;
}

export function resolveUxV7ObjectActions(layer: EditorCanvasLayer | null): EditorUxV7ObjectAction[] {
  if (!layer) {
    return [];
  }

  const humanType = resolveHumanFirstObjectType(layer);
  const kind = resolveEditorObjectKind(layer);

  let base: EditorUxV7ObjectAction[];
  if (layer.layerType === "background" || humanType === "background") {
    base = filterVisibleUxV7Actions(BACKGROUND_ACTIONS);
  } else if (humanType === "logo" || kind === "logo") {
    base = filterVisibleUxV7Actions(LOGO_ACTIONS);
  } else if (humanType === "text") {
    base = filterVisibleUxV7Actions(TEXT_ACTIONS);
  } else if (
    humanType === "character" ||
    humanType === "globe" ||
    kind === "person" ||
    kind === "character" ||
    kind === "mascot"
  ) {
    base = filterVisibleUxV7Actions(CHARACTER_ACTIONS);
  } else {
    base = filterVisibleUxV7Actions(["replace", "remove", "duplicate"]);
  }
  return gateUxV7Actions(layer, base);
}

export function uxV7ObjectActionIcon(action: EditorUxV7ObjectAction): string {
  switch (action) {
    case "refine_selection":
      return "✨";
    case "replace":
    case "background_replace":
      return "🔄";
    case "remove":
    case "background_remove":
      return "🗑";
    case "cutout":
      return "✂️";
    case "animate":
      return "🎬";
    case "duplicate":
      return "📋";
    case "resize":
      return "📏";
    case "move":
      return "📍";
    case "background_expand":
      return "↔️";
    case "background_blur":
      return "🌫";
    default:
      return "✨";
  }
}

export function uxV7NoSelectionIcon(action: EditorUxV7NoSelectionAction): string {
  switch (action) {
    case "edit_photo":
      return "🖼";
    case "add_object":
      return "➕";
    case "background":
      return "🌄";
    case "gif":
      return "🎞";
    case "export":
      return "📤";
    default:
      return "✨";
  }
}
