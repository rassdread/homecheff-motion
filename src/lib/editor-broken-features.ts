import type { EditorHumanActionId } from "@/lib/editor-human-first";
import type { EditorUxV7ObjectAction } from "@/lib/editor-ux-v7-contextual";
import type { EditorBackgroundToolId } from "@/types/homecheff-visual-editor";

/** Features hidden until they modify the visible compositor. */
export const HIDDEN_HUMAN_ACTIONS = new Set<EditorHumanActionId>([
  "change_clothing",
  "change_expression",
  "change_pose",
  "background_style",
  "background_lighting",
  "edit_appearance",
  "headwear",
  "outfit",
  "expression",
  "hands",
  "new_role",
  "refine_selection",
]);

export const HIDDEN_UX_V7_OBJECT_ACTIONS = new Set<EditorUxV7ObjectAction>([
  "background_blur",
  "animate",
  "resize",
  "move",
  "refine_selection",
  "cutout",
]);

/** Live canvas tools hidden in instruction studio pivot — use Generate Variant instead. */
export const HIDDEN_LIVE_CANVAS_TOOLS = new Set([
  "move",
  "resize",
  "select_object",
  "precise_mask",
  "refine_selection",
  "cut_out",
  "replace_via_mask",
  "lasso",
  "transform_handles",
] as const);

export const HIDDEN_BACKGROUND_TOOLS = new Set<EditorBackgroundToolId>(["blur", "sky"]);

export const HIDDEN_V7_PLAN_ACTIONS = new Set<string>(["translate_text", "quick_motion_gif"]);

export function isHumanActionHidden(actionId: EditorHumanActionId): boolean {
  return HIDDEN_HUMAN_ACTIONS.has(actionId);
}

export function isUxV7ObjectActionHidden(action: EditorUxV7ObjectAction): boolean {
  return HIDDEN_UX_V7_OBJECT_ACTIONS.has(action);
}

export function isBackgroundToolHidden(toolId: EditorBackgroundToolId): boolean {
  return HIDDEN_BACKGROUND_TOOLS.has(toolId);
}
