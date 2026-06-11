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

/** UI-layer action options — maps to existing backend instruction actions. */
export function resolveDynamicActionsForObject(obj: EditorInstructionObjectV2): DynamicActionOption[] {
  const label = obj.label;

  if (obj.category === "character" || /\b(character|mascot|globe man)\b/i.test(label)) {
    if (/\bface\b/i.test(label) && !/\binterface\b/i.test(label)) {
      return [
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeExpression",
        },
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeEyes",
          promptHint: "eyes",
        },
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeSmile",
          promptHint: "smile",
        },
        {
          action: "change_style",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeFacialStyle",
        },
      ];
    }
    if (/\beyes?\b/i.test(label)) {
      return [
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeEyes",
          promptHint: "eyes",
        },
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeExpression",
        },
      ];
    }
    if (/\bmouth\b/i.test(label)) {
      return [
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeSmile",
          promptHint: "mouth and smile",
        },
        {
          action: "change_expression",
          labelKey: "editor.instructionStudio.v2.dynamic.face.changeExpression",
        },
      ];
    }
    return [
      {
        action: "change_style",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeAppearance",
      },
      {
        action: "change_expression",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeExpression",
      },
      {
        action: "change_pose",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changePose",
      },
      {
        action: "change_clothing",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeClothing",
      },
      {
        action: "change_style",
        labelKey: "editor.instructionStudio.v2.dynamic.character.changeProportions",
        promptHint: "body proportions",
      },
    ];
  }

  if (obj.category === "clothing") {
    return [
      { action: "add_logo", labelKey: actionLabelKey("add_logo") },
      { action: "replace_logo", labelKey: actionLabelKey("replace_logo") },
      { action: "change_color", labelKey: actionLabelKey("change_color") },
      { action: "change_material", labelKey: actionLabelKey("change_material") },
      {
        action: "add_logo",
        labelKey: "editor.instructionStudio.v2.dynamic.clothing.changeBranding",
        promptHint: "branding placement",
      },
    ];
  }

  if (obj.category === "logo") {
    return [
      { action: "replace_logo", labelKey: "editor.instructionStudio.v2.dynamic.logo.replace" },
      { action: "enlarge_logo", labelKey: "editor.instructionStudio.v2.dynamic.logo.resize" },
      { action: "move_logo", labelKey: "editor.instructionStudio.v2.dynamic.logo.reposition" },
      { action: "change_color", labelKey: "editor.instructionStudio.v2.dynamic.logo.recolor" },
    ];
  }

  if (obj.category === "background") {
    return [
      { action: "replace", labelKey: "editor.instructionStudio.v2.dynamic.background.replace" },
      { action: "blur", labelKey: actionLabelKey("blur") },
      { action: "remove", labelKey: actionLabelKey("remove") },
      {
        action: "replace",
        labelKey: "editor.instructionStudio.v2.dynamic.background.changeEnvironment",
        promptHint: "environment",
      },
    ];
  }

  return actionsForInstructionCategory(obj.category).map((action) => ({
    action,
    labelKey: actionLabelKey(action),
  }));
}

export function actionOptionKey(option: DynamicActionOption, index: number): string {
  return `${option.action}:${option.promptHint ?? ""}:${index}`;
}
