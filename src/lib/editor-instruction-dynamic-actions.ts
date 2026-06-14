import {
  actionLabelKey,
  actionsForInstructionCategory,
} from "@/lib/editor-instruction-actions";
import type {
  EditorInstructionDynamicAction,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";

export type DynamicActionOption = {
  action: EditorInstructionDynamicAction;
  labelKey: string;
  promptHint?: string;
};

const UNIVERSAL_PART_ACTIONS: DynamicActionOption[] = [
  { action: "replace", labelKey: "editor.instructionStudio.v2.partActions.replace" },
  { action: "change_color", labelKey: "editor.instructionStudio.v2.partActions.recolor" },
  { action: "remove", labelKey: "editor.instructionStudio.v2.partActions.remove" },
  { action: "detach_asset", labelKey: "editor.instructionStudio.v2.partActions.extract" },
  { action: "duplicate", labelKey: "editor.instructionStudio.v2.partActions.duplicate" },
  { action: "protect_part", labelKey: "editor.instructionStudio.v2.partActions.protect" },
  { action: "refine_selection", labelKey: "editor.instructionStudio.v2.partActions.refine" },
  {
    action: "change_style",
    labelKey: "editor.instructionStudio.v2.partActions.describe",
    promptHint: "custom change",
  },
];

function withCategoryExtras(
  obj: EditorInstructionObjectV2,
  base: DynamicActionOption[]
): DynamicActionOption[] {
  const label = obj.label.toLowerCase();
  const extras: DynamicActionOption[] = [];

  if (obj.category === "logo") {
    extras.push(
      { action: "replace_logo", labelKey: actionLabelKey("replace_logo") },
      { action: "move_logo", labelKey: actionLabelKey("move_logo") }
    );
  }
  if (obj.category === "background") {
    extras.push(
      {
        action: "replace",
        labelKey: "editor.instructionStudio.v2.partActions.replaceBackground",
        promptHint: "new background",
      },
      { action: "transparent", labelKey: actionLabelKey("transparent") }
    );
  }
  if (/\bglobe\b|prop|ball|earth/.test(label)) {
    extras.unshift({
      action: "replace",
      labelKey: "editor.instructionStudio.v2.partActions.replaceProp",
      promptHint: "replacement prop",
    });
  }
  if (/\btie\b|shoe|jacket|clothing/.test(label)) {
    extras.unshift({
      action: "change_color",
      labelKey: "editor.instructionStudio.v2.partActions.recolorClothing",
      promptHint: "clothing color",
    });
  }

  const seen = new Set<string>();
  return [...extras, ...base].filter((opt) => {
    const key = `${opt.action}:${opt.promptHint ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/** UI-layer action options — every V6 part gets the full actionable set. */
export function resolveDynamicActionsForObject(obj: EditorInstructionObjectV2): DynamicActionOption[] {
  if (obj.source === "semanticLayers" || obj.layerId?.startsWith("v6_")) {
    return withCategoryExtras(obj, UNIVERSAL_PART_ACTIONS);
  }

  const label = obj.label;

  if (obj.category === "character" || /\b(character|mascot|globe man)\b/i.test(label)) {
    if (/\bface\b/i.test(label) && !/\binterface\b/i.test(label)) {
      return withCategoryExtras(obj, [
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeExpression",
        },
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeEyes",
          promptHint: "eyes",
        },
        ...UNIVERSAL_PART_ACTIONS,
      ]);
    }
    return withCategoryExtras(obj, [
      {
        action: "change_expression",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeExpression",
      },
      {
        action: "change_clothing",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeClothing",
      },
      ...UNIVERSAL_PART_ACTIONS,
    ]);
  }

  if (obj.category === "clothing") {
    return withCategoryExtras(obj, UNIVERSAL_PART_ACTIONS);
  }

  if (obj.category === "logo") {
    return withCategoryExtras(obj, UNIVERSAL_PART_ACTIONS);
  }

  if (obj.category === "background") {
    return withCategoryExtras(obj, UNIVERSAL_PART_ACTIONS);
  }

  if (obj.category === "product" || /\bglobe\b/i.test(label)) {
    return withCategoryExtras(obj, UNIVERSAL_PART_ACTIONS);
  }

  return withCategoryExtras(
    obj,
    actionsForInstructionCategory(obj.category).map((action) => ({
      action,
      labelKey: actionLabelKey(action),
    }))
  );
}

export function actionOptionKey(option: DynamicActionOption, index: number): string {
  return `${option.action}:${option.promptHint ?? ""}:${index}`;
}
