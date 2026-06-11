import type {
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
} from "@/types/editor-instruction-studio";

const CATEGORY_ACTIONS: Record<EditorInstructionObjectCategory, EditorInstructionDynamicAction[]> = {
  clothing: ["add_logo", "replace_logo", "change_color", "change_material", "remove"],
  packaging: [
    "add_logo",
    "replace_logo",
    "redesign_packaging",
    "premium_packaging",
    "eco_packaging",
    "remove",
  ],
  text: ["rewrite", "translate", "replace", "remove"],
  background: ["replace", "blur", "transparent", "remove"],
  character: ["change_clothing", "change_expression", "change_pose", "add_item", "remove_item"],
  logo: ["replace_logo", "enlarge_logo", "move_logo", "remove_logo"],
  product: ["add_logo", "replace_logo", "change_color", "replace", "remove"],
  tool: ["replace", "remove", "change_color"],
  food: ["replace", "change_style", "remove"],
  environment: ["replace", "blur", "change_style"],
  vehicle: ["add_logo", "replace_logo", "redesign_packaging", "remove"],
  building: ["add_logo", "replace_logo", "remove"],
  signage: ["add_logo", "replace_logo", "rewrite", "remove"],
  other: ["replace", "remove", "change_color", "change_style"],
};

export const BRANDING_ACTIONS = new Set<EditorInstructionDynamicAction>([
  "add_logo",
  "replace_logo",
]);

export const BRANDING_OBJECT_CATEGORIES = new Set<EditorInstructionObjectCategory>([
  "clothing",
  "packaging",
  "product",
  "vehicle",
  "building",
  "signage",
]);

export function actionsForInstructionCategory(
  category: EditorInstructionObjectCategory
): EditorInstructionDynamicAction[] {
  return CATEGORY_ACTIONS[category] ?? CATEGORY_ACTIONS.other;
}

export function isBrandingAction(action: EditorInstructionDynamicAction): boolean {
  return BRANDING_ACTIONS.has(action);
}

export function categorySupportsBranding(category: EditorInstructionObjectCategory): boolean {
  return BRANDING_OBJECT_CATEGORIES.has(category);
}

export function defaultActionForCategory(
  category: EditorInstructionObjectCategory
): EditorInstructionDynamicAction {
  const actions = actionsForInstructionCategory(category);
  return actions[0] ?? "replace";
}

export function actionLabelKey(action: EditorInstructionDynamicAction): string {
  return `editor.instructionStudio.v2.action.${action}`;
}

export function categoryLabelKey(category: EditorInstructionObjectCategory): string {
  return `editor.instructionStudio.v2.category.${category}`;
}
