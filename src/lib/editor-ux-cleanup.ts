import type { TranslationKey } from "@/i18n";
import { isHumanActionHidden } from "@/lib/editor-broken-features";
import {
  resolveEditorHumanActions,
  resolveEditorObjectKind,
  type EditorHumanAction,
  type EditorHumanActionId,
  type EditorObjectKind,
  type EditorUiMode,
} from "@/lib/editor-human-first";
import {
  humanActionRequiresPixelMask,
  layerShowsRefineAction,
} from "@/lib/editor-selection-pipeline";
import { isTechnicalEditorTerm, sanitizeEditorUserLabel } from "@/lib/editor-part-human-labels";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorUiVisibility = "keep" | "hide" | "advanced_only";

export type HumanFirstObjectType =
  | "character"
  | "globe"
  | "logo"
  | "text"
  | "background"
  | "object";

export type EditReadiness = "works_live" | "partially_works" | "placeholder" | "no_effect";

export type EditorObjectStatus = "editable" | "locked" | "hidden";

export const HUMAN_FIRST_OBJECT_LABEL_KEYS: Record<HumanFirstObjectType, TranslationKey> = {
  character: "editor.ux.object.character",
  globe: "editor.ux.object.globe",
  logo: "editor.ux.object.logo",
  text: "editor.ux.object.text",
  background: "editor.ux.object.background",
  object: "editor.ux.object.generic",
};

export const EDITOR_VISIBILITY_AUDIT: Array<{
  id: string;
  visibility: EditorUiVisibility;
  reason: string;
}> = [
  { id: "layer_label", visibility: "keep", reason: "Primary selection affordance" },
  { id: "transform_handles", visibility: "keep", reason: "Live canvas update" },
  { id: "contextual_actions", visibility: "keep", reason: "Working edit operations" },
  { id: "body_sliders", visibility: "keep", reason: "Live body designer preview" },
  { id: "selection_tools", visibility: "keep", reason: "Mask/cutout workflows" },
  { id: "confidence", visibility: "advanced_only", reason: "Debug signal, no user action" },
  { id: "fingerprint", visibility: "hide", reason: "Not surfaced; no editor effect" },
  { id: "polygon_metadata", visibility: "advanced_only", reason: "Internal geometry only" },
  { id: "mask_url", visibility: "advanced_only", reason: "Internal asset reference" },
  { id: "hierarchy_tree", visibility: "advanced_only", reason: "Part debugging" },
  { id: "semantic_record", visibility: "hide", reason: "Backend metadata" },
  { id: "source_provider", visibility: "advanced_only", reason: "Detection provenance" },
  { id: "identity_relevance", visibility: "advanced_only", reason: "AI taxonomy" },
  { id: "selection_mode", visibility: "advanced_only", reason: "Segmentation internals" },
  { id: "composition_graph", visibility: "advanced_only", reason: "Developer preview" },
  { id: "sam2_status", visibility: "advanced_only", reason: "Provider diagnostics" },
  { id: "estimated_badge", visibility: "hide", reason: "Replaced by human selection hint" },
  { id: "part_face_labels", visibility: "hide", reason: "Collapsed into Personage" },
];

const TECHNICAL_SUBPART_PATTERNS = [
  "face",
  "round face",
  "large eyes",
  "small eyes",
  "identity record",
  "semantic record",
  "fingerprint",
  "left arm",
  "right arm",
  "left hand",
  "right hand",
  "tie",
  "hat",
  "head",
];

const ACTION_READINESS: Partial<Record<EditorHumanActionId, EditReadiness>> = {
  move: "works_live",
  resize: "works_live",
  logo_move: "works_live",
  logo_resize: "works_live",
  duplicate: "works_live",
  logo_duplicate: "works_live",
  remove: "works_live",
  replace: "partially_works",
  logo_replace: "partially_works",
  edit_appearance: "partially_works",
  adjust_body: "works_live",
  background_replace: "partially_works",
  background_expand: "partially_works",
  background_cleanup: "partially_works",
  background_style: "placeholder",
  background_lighting: "placeholder",
  change_clothing: "placeholder",
  change_expression: "placeholder",
  change_pose: "placeholder",
  headwear: "placeholder",
  outfit: "placeholder",
  expression: "placeholder",
  hands: "placeholder",
  new_role: "placeholder",
  prepare_animation: "partially_works",
  attach_logo: "partially_works",
  expand: "placeholder",
  animate: "partially_works",
  refine_selection: "works_live",
  more: "works_live",
};

export function actionEditReadiness(actionId: EditorHumanActionId): EditReadiness {
  return ACTION_READINESS[actionId] ?? "placeholder";
}

export function shouldShowActionInHumanUi(actionId: EditorHumanActionId): boolean {
  const readiness = actionEditReadiness(actionId);
  return readiness === "works_live" || readiness === "partially_works";
}

export function resolveHumanFirstObjectType(layer: EditorCanvasLayer): HumanFirstObjectType {
  if (layer.layerType === "background") {
    return "background";
  }
  const label = layer.label.toLowerCase();
  const category = (layer.category ?? "").toLowerCase();
  const semantic = (layer.semanticType ?? "").toLowerCase();

  if (category === "text" || semantic === "text" || label.includes("text") || label.includes("tekst")) {
    return "text";
  }
  if (category === "logo" || semantic === "logo" || label.includes("logo")) {
    return "logo";
  }
  if (
    category === "globe" ||
    semantic === "globe" ||
    label.includes("globe") ||
    label.includes("world") ||
    label.includes("wereldbol") ||
    label.includes("planet")
  ) {
    return "globe";
  }
  if (
    category === "character" ||
    semantic === "character" ||
    semantic === "subject" ||
    label.includes("mascot") ||
    label.includes("personage") ||
    label.includes("character") ||
    label.includes("chef") ||
    label.includes("person")
  ) {
    return "character";
  }
  return "object";
}

export function humanFirstObjectLabelKey(layer: EditorCanvasLayer): TranslationKey {
  return HUMAN_FIRST_OBJECT_LABEL_KEYS[resolveHumanFirstObjectType(layer)];
}

export function isTechnicalSubPartLayer(layer: EditorCanvasLayer): boolean {
  if (layer.metadata?.promptCreatedSubLayer) {
    return false;
  }
  if (layer.parentObjectId) {
    return true;
  }
  const label = layer.label.toLowerCase();
  if (isTechnicalEditorTerm(label)) {
    return true;
  }
  if (TECHNICAL_SUBPART_PATTERNS.some((part) => label.includes(part))) {
    const type = resolveHumanFirstObjectType(layer);
    if (type === "character" && (label.includes("face") || label.includes("eyes"))) {
      return true;
    }
    if (type !== "character" && type !== "object") {
      return false;
    }
    return label !== "mascot" && !label.includes("personage");
  }
  return false;
}

export function layersForHumanFirstTree(layers: EditorCanvasLayer[]): EditorCanvasLayer[] {
  return layers.filter((layer) => {
    if (layer.layerType === "background") {
      return true;
    }
    return !isTechnicalSubPartLayer(layer);
  });
}

export function humanFirstDisplayLabel(layer: EditorCanvasLayer): string {
  if (layer.layerSource === "manual" && !isTechnicalEditorTerm(layer.label)) {
    return layer.label;
  }
  return sanitizeEditorUserLabel(layer.label);
}

export function resolveObjectStatus(layer: EditorCanvasLayer): EditorObjectStatus {
  if (!layer.visible) {
    return "hidden";
  }
  if (layer.locked) {
    return "locked";
  }
  return "editable";
}

export function objectStatusLabelKey(status: EditorObjectStatus): TranslationKey {
  switch (status) {
    case "editable":
      return "editor.ux.status.editable";
    case "locked":
      return "editor.ux.status.locked";
    case "hidden":
      return "editor.ux.status.hidden";
  }
}

export function objectTypeLabelKey(layer: EditorCanvasLayer): TranslationKey {
  const humanType = resolveHumanFirstObjectType(layer);
  return HUMAN_FIRST_OBJECT_LABEL_KEYS[humanType];
}

export function shouldShowTechnicalMetadata(showAiAnalysis: boolean): boolean {
  return showAiAnalysis;
}

export function editorAdminCanShowAiAnalysis(isAdmin: boolean): boolean {
  return isAdmin;
}

export function filterHumanVisibleActions(actions: EditorHumanAction[]): EditorHumanAction[] {
  return actions.filter(
    (action) => shouldShowActionInHumanUi(action.id) && !isHumanActionHidden(action.id)
  );
}

function gateHumanActions(layer: EditorCanvasLayer, picked: EditorHumanAction[]): EditorHumanAction[] {
  const gated = picked.filter((action) => {
    if (humanActionRequiresPixelMask(action.id)) {
      return !layerShowsRefineAction(layer);
    }
    return true;
  });
  if (layerShowsRefineAction(layer)) {
    return filterHumanVisibleActions([
      {
        id: "refine_selection",
        labelKey: "editor.selectionFix.refine",
        icon: "✨",
      },
      ...gated,
    ]);
  }
  return filterHumanVisibleActions(gated);
}

export function resolveContextualHumanActions(layer: EditorCanvasLayer | null): EditorHumanAction[] {
  if (!layer) {
    return [];
  }
  const kind = resolveEditorObjectKind(layer);
  const actions = resolveEditorHumanActions(layer);

  if (kind === "person" || kind === "character" || kind === "mascot") {
    const characterActions: EditorHumanActionId[] = [
      "edit_appearance",
      "replace",
      "remove",
    ];
    const picked = actions.filter((a) => characterActions.includes(a.id));
    return filterHumanVisibleActions(gateHumanActions(layer, picked));
  }
  if (resolveHumanFirstObjectType(layer) === "text") {
    return filterHumanVisibleActions(
      gateHumanActions(
        layer,
        actions.filter((a) => ["move", "resize", "remove"].includes(a.id))
      )
    );
  }
  if (kind === "logo") {
    return filterHumanVisibleActions(
      gateHumanActions(
        layer,
        actions.filter((a) =>
          ["logo_replace", "logo_move", "logo_resize", "remove"].includes(a.id)
        )
      )
    );
  }
  if (kind === "background") {
    return filterHumanVisibleActions(
      actions.filter((a) =>
        ["background_replace", "background_cleanup", "remove"].includes(a.id)
      )
    );
  }
  return filterHumanVisibleActions(gateHumanActions(layer, actions));
}

export function resolveContextualToolbarActionIds(
  layer: EditorCanvasLayer | null
): EditorHumanActionId[] {
  const actions = resolveContextualHumanActions(layer);
  const ids = actions.map((a) => a.id).slice(0, 5);
  if (!ids.includes("more")) {
    ids.push("more");
  }
  return ids;
}

export const LIVE_EDIT_CONTROL_IDS = [
  "transform_x",
  "transform_y",
  "transform_scale",
  "transform_rotation",
  "body_slider",
] as const;

export type LiveEditControlId = (typeof LIVE_EDIT_CONTROL_IDS)[number];

export function controlEditReadiness(controlId: string): EditReadiness {
  if (LIVE_EDIT_CONTROL_IDS.includes(controlId as LiveEditControlId)) {
    return "works_live";
  }
  if (controlId === "confidence" || controlId === "polygon" || controlId === "fingerprint") {
    return "no_effect";
  }
  if (controlId === "change_clothing" || controlId === "change_expression") {
    return "placeholder";
  }
  return "no_effect";
}

export function shouldShowControlInHumanUi(controlId: string, showAiAnalysis: boolean): boolean {
  const readiness = controlEditReadiness(controlId);
  if (readiness === "no_effect" || readiness === "placeholder") {
    return showAiAnalysis;
  }
  return true;
}

export function editorHumanUiHidesTechnicalTerms(mode: EditorUiMode, showAiAnalysis: boolean): boolean {
  return mode === "visual" || !showAiAnalysis;
}

export const EDIT_READINESS_AUDIT: Array<{ control: string; readiness: EditReadiness }> = [
  { control: "transform_x", readiness: "works_live" },
  { control: "transform_y", readiness: "works_live" },
  { control: "transform_scale", readiness: "works_live" },
  { control: "transform_rotation", readiness: "works_live" },
  { control: "body_slider", readiness: "works_live" },
  { control: "remove", readiness: "partially_works" },
  { control: "replace", readiness: "partially_works" },
  { control: "change_clothing", readiness: "placeholder" },
  { control: "change_expression", readiness: "placeholder" },
  { control: "confidence", readiness: "no_effect" },
  { control: "polygon", readiness: "no_effect" },
  { control: "fingerprint", readiness: "no_effect" },
  { control: "hierarchy", readiness: "no_effect" },
  { control: "semantic_record", readiness: "no_effect" },
];

export function kindUsesSelectionTools(kind: EditorObjectKind): boolean {
  return kind !== "background" && kind !== "logo";
}
