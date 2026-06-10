import type { TranslationKey } from "@/i18n";
import { isEditorOperationAllowed } from "@/lib/editor-layer-action-eligibility";
import { documentSupportsBodyDesigner, inferEditorObjectType } from "@/lib/editor-body-designer";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorObjectOperation,
} from "@/types/homecheff-visual-editor";

export type EditorUiMode = "visual" | "advanced";

export type EditorObjectKind =
  | "person"
  | "character"
  | "mascot"
  | "background"
  | "logo"
  | "product"
  | "prop"
  | "generic";

export type EditorHumanActionId =
  | "edit_appearance"
  | "resize"
  | "adjust_body"
  | "change_clothing"
  | "change_expression"
  | "change_pose"
  | "prepare_animation"
  | "remove"
  | "replace"
  | "duplicate"
  | "move"
  | "headwear"
  | "outfit"
  | "expression"
  | "hands"
  | "new_role"
  | "background_replace"
  | "background_expand"
  | "background_cleanup"
  | "background_style"
  | "background_lighting"
  | "logo_resize"
  | "logo_move"
  | "logo_replace"
  | "logo_duplicate"
  | "attach_logo"
  | "expand"
  | "animate"
  | "more";

export type EditorHumanAction = {
  id: EditorHumanActionId;
  labelKey: TranslationKey;
  icon: string;
  operation?: EditorObjectOperation;
};

export type EditorHumanSuggestion = {
  id: string;
  labelKey: TranslationKey;
};

const PERSON_ACTIONS: EditorHumanAction[] = [
  { id: "edit_appearance", labelKey: "editor.human.action.editAppearance", icon: "✏️" },
  { id: "resize", labelKey: "editor.human.action.resize", icon: "📏", operation: "scale" },
  { id: "adjust_body", labelKey: "editor.human.action.adjustBody", icon: "💪" },
  { id: "change_clothing", labelKey: "editor.human.action.changeClothing", icon: "👕", operation: "replace" },
  { id: "change_expression", labelKey: "editor.human.action.changeExpression", icon: "😀", operation: "replace" },
  { id: "change_pose", labelKey: "editor.human.action.changePose", icon: "🧍", operation: "replace" },
  { id: "prepare_animation", labelKey: "editor.human.action.prepareAnimation", icon: "🎬" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

const MASCOT_ACTIONS: EditorHumanAction[] = [
  { id: "headwear", labelKey: "editor.human.action.headwear", icon: "🎩", operation: "replace" },
  { id: "outfit", labelKey: "editor.human.action.outfit", icon: "👕", operation: "replace" },
  { id: "expression", labelKey: "editor.human.action.changeExpression", icon: "😀", operation: "replace" },
  { id: "hands", labelKey: "editor.human.action.hands", icon: "✋", operation: "replace" },
  { id: "new_role", labelKey: "editor.human.action.newRole", icon: "🎭", operation: "replace" },
  { id: "prepare_animation", labelKey: "editor.human.action.prepareAnimation", icon: "🎬" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

const BACKGROUND_ACTIONS: EditorHumanAction[] = [
  { id: "background_replace", labelKey: "editor.human.action.replaceBackground", icon: "🌆", operation: "replace" },
  { id: "background_expand", labelKey: "editor.human.action.expand", icon: "✨", operation: "scale" },
  { id: "background_cleanup", labelKey: "editor.human.action.cleanup", icon: "🧹", operation: "replace" },
  { id: "background_style", labelKey: "editor.human.action.changeStyle", icon: "🎨", operation: "replace" },
  { id: "background_lighting", labelKey: "editor.human.action.lighting", icon: "🌤", operation: "replace" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

const LOGO_ACTIONS: EditorHumanAction[] = [
  { id: "logo_resize", labelKey: "editor.human.action.resize", icon: "📏", operation: "scale" },
  { id: "logo_move", labelKey: "editor.human.action.move", icon: "📍", operation: "move" },
  { id: "logo_replace", labelKey: "editor.human.action.replace", icon: "🔄", operation: "replace" },
  { id: "logo_duplicate", labelKey: "editor.human.action.duplicate", icon: "📋", operation: "duplicate" },
  { id: "attach_logo", labelKey: "editor.human.action.attachLogo", icon: "📎" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

const PRODUCT_ACTIONS: EditorHumanAction[] = [
  { id: "resize", labelKey: "editor.human.action.resize", icon: "📏", operation: "scale" },
  { id: "replace", labelKey: "editor.human.action.replace", icon: "🔄", operation: "replace" },
  { id: "attach_logo", labelKey: "editor.human.action.attachLogo", icon: "📎" },
  { id: "prepare_animation", labelKey: "editor.human.action.prepareAnimation", icon: "🎬" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

const GENERIC_ACTIONS: EditorHumanAction[] = [
  { id: "move", labelKey: "editor.human.action.move", icon: "📍", operation: "move" },
  { id: "resize", labelKey: "editor.human.action.resize", icon: "📏", operation: "scale" },
  { id: "replace", labelKey: "editor.human.action.replace", icon: "🔄", operation: "replace" },
  { id: "duplicate", labelKey: "editor.human.action.duplicate", icon: "📋", operation: "duplicate" },
  { id: "prepare_animation", labelKey: "editor.human.action.prepareAnimation", icon: "🎬" },
  { id: "remove", labelKey: "editor.human.action.remove", icon: "🗑", operation: "delete" },
];

export function resolveEditorObjectKind(layer: EditorCanvasLayer | null): EditorObjectKind {
  if (!layer || layer.layerType === "background") {
    return "background";
  }
  const label = layer.label.toLowerCase();
  const category = layer.category ?? "";
  const semantic = layer.semanticType ?? "";

  if (
    category === "background" ||
    semantic === "background" ||
    label.includes("background")
  ) {
    return "background";
  }
  if (category === "logo" || semantic === "logo" || label.includes("logo")) {
    return "logo";
  }
  if (category === "product" || semantic.includes("product") || label.includes("product")) {
    return "product";
  }
  if (
    label.includes("mascot") ||
    label.includes("chef") ||
    label.includes("garden") ||
    label.includes("designer")
  ) {
    return "mascot";
  }
  if (
    category === "character" ||
    semantic === "character" ||
    label.includes("character") ||
    label.includes("sergio") ||
    semantic === "subject"
  ) {
    return label.includes("mascot") ? "mascot" : "character";
  }
  if (label.includes("person") || semantic === "face" || semantic === "body") {
    return "person";
  }
  return "prop";
}

export function resolveEditorHumanActions(layer: EditorCanvasLayer | null): EditorHumanAction[] {
  if (!layer) {
    return [];
  }
  const kind = resolveEditorObjectKind(layer);
  const base =
    kind === "person" || kind === "character"
      ? PERSON_ACTIONS
      : kind === "mascot"
        ? MASCOT_ACTIONS
        : kind === "background"
          ? BACKGROUND_ACTIONS
          : kind === "logo"
            ? LOGO_ACTIONS
            : kind === "product"
              ? PRODUCT_ACTIONS
              : GENERIC_ACTIONS;

  return base.filter((action) => {
    if (!action.operation) {
      return true;
    }
    return isEditorOperationAllowed(layer, action.operation);
  });
}

export function resolveEditorMaskSuggestions(layer: EditorCanvasLayer | null): EditorHumanSuggestion[] {
  if (!layer || layer.layerType === "background") {
    return [];
  }
  const suggestions: EditorHumanSuggestion[] = [];
  if (isApproximateEditorSelection(layer)) {
    suggestions.push({ id: "refine_selection", labelKey: "editor.mask.refineAi" });
    suggestions.push({ id: "outline_manual", labelKey: "editor.mask.outlineManual" });
  }
  suggestions.push({ id: "remove_bg", labelKey: "editor.human.suggest.removeBackground" });
  if (!isApproximateEditorSelection(layer)) {
    suggestions.push({ id: "detach_object", labelKey: "editor.mask.detachObject" });
  }
  return suggestions;
}

export function resolveEditorAiSuggestions(
  document: EditorCanvasDocument,
  layer: EditorCanvasLayer | null
): EditorHumanSuggestion[] {
  if (!layer) {
    return [];
  }
  const kind = resolveEditorObjectKind(layer);
  const objectType = inferEditorObjectType(document);
  const maskSuggestions = resolveEditorMaskSuggestions(layer);

  if (kind === "mascot" || kind === "character") {
    return [
      ...maskSuggestions,
      { id: "garden_version", labelKey: "editor.human.suggest.gardenVersion" },
      { id: "animation_ready", labelKey: "editor.human.suggest.animationReady" },
      { id: "canonical", labelKey: "editor.human.suggest.canonicalCharacter" },
      { id: "new_outfit", labelKey: "editor.human.suggest.newOutfit" },
    ];
  }
  if (kind === "product" || objectType === "product" || objectType === "packaging") {
    return [
      ...maskSuggestions,
      { id: "poster", labelKey: "editor.human.suggest.createPoster" },
      { id: "marketing", labelKey: "editor.human.suggest.marketingVersion" },
      { id: "social", labelKey: "editor.human.suggest.socialAsset" },
    ];
  }
  if (kind === "logo") {
    return [
      { id: "duplicate", labelKey: "editor.human.suggest.duplicateLogo" },
      { id: "attach", labelKey: "editor.human.suggest.attachElsewhere" },
    ];
  }
  if (kind === "background") {
    return [
      { id: "cleanup", labelKey: "editor.human.suggest.cleanupBackground" },
      { id: "expand", labelKey: "editor.human.suggest.expandBackground" },
    ];
  }
  return [...maskSuggestions, { id: "animate", labelKey: "editor.human.suggest.prepareAnimation" }];
}

export function editorHumanUiHidesMaskTerminology(mode: EditorUiMode): boolean {
  return mode === "visual";
}

export function layerSupportsHumanBodyEdit(
  document: EditorCanvasDocument,
  layer: EditorCanvasLayer | null
): boolean {
  if (!layer || !documentSupportsBodyDesigner(document)) {
    return false;
  }
  const kind = resolveEditorObjectKind(layer);
  return kind === "person" || kind === "character" || kind === "mascot";
}

export function markEditorLayerAnimationReady(
  document: EditorCanvasDocument,
  layerId: string
): EditorCanvasDocument {
  return {
    ...document,
    objects: document.objects.map((obj) =>
      obj.id === layerId
        ? {
            ...obj,
            metadata: {
              ...obj.metadata,
              identityRelevance: obj.metadata?.identityRelevance ?? "placement_target",
              rawFeature: obj.metadata?.rawFeature ?? "animation_ready",
            },
          }
        : obj
    ),
    workflowStep: "visual_editor",
    updatedAt: new Date().toISOString(),
  };
}

export const EDITOR_HUMAN_BODY_SLIDER_KEYS = [
  { key: "headScale" as const, labelKey: "editor.human.body.head" as TranslationKey },
  { key: "shoulderWidth" as const, labelKey: "editor.human.body.shoulders" as TranslationKey },
  { key: "armThickness" as const, labelKey: "editor.human.body.arms" as TranslationKey },
  { key: "waistWidth" as const, labelKey: "editor.human.body.waist" as TranslationKey },
  { key: "legLength" as const, labelKey: "editor.human.body.legs" as TranslationKey },
  { key: "height" as const, labelKey: "editor.human.body.height" as TranslationKey },
  { key: "handSize" as const, labelKey: "editor.human.body.hands" as TranslationKey },
  { key: "footSize" as const, labelKey: "editor.human.body.feet" as TranslationKey },
];

export function defaultEditorUiMode(): EditorUiMode {
  return "visual";
}
