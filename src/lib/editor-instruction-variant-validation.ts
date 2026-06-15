import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import type {
  EditorInstructionChangePlanItem,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const EDITOR_VARIANT_VALIDATION_CODES = {
  missing_session: "missing_session",
  missing_image: "missing_image",
  missing_prompt: "missing_prompt",
  missing_object: "missing_object",
  missing_action: "missing_action",
  missing_instruction: "missing_instruction",
} as const;

export type EditorVariantValidationCode =
  (typeof EDITOR_VARIANT_VALIDATION_CODES)[keyof typeof EDITOR_VARIANT_VALIDATION_CODES];

export type EditorInstructionVariantValidationResult =
  | { ok: true }
  | { ok: false; error: string; code: EditorVariantValidationCode };

export const EDITOR_VARIANT_VALIDATION_I18N: Record<EditorVariantValidationCode, string> = {
  missing_session: "editor.instructionStudio.variantValidation.missingSession",
  missing_image: "editor.instructionStudio.variantValidation.missingImage",
  missing_prompt: "editor.instructionStudio.variantValidation.missingPrompt",
  missing_object: "editor.instructionStudio.variantValidation.missingObject",
  missing_action: "editor.instructionStudio.variantValidation.missingAction",
  missing_instruction: "editor.instructionStudio.variantValidation.missingInstruction",
};

const COMBINE_OBJECT_KEYS = new Set(["combine"]);

function hasValidChangePlan(changePlan?: EditorInstructionChangePlanItem[]): boolean {
  return Boolean(
    changePlan?.length &&
      changePlan.every(
        (item) =>
          item.objectId?.trim() &&
          item.objectLabel?.trim() &&
          item.objectCategory &&
          item.action
      )
  );
}

function listKnownInstructionObjectIds(document: EditorCanvasDocument): string[] {
  try {
    return listInstructionObjectsV2(document).map((object) => object.id);
  } catch {
    return [];
  }
}

function instructionResolvesToKnownObject(
  instruction: Partial<EditorInstructionSelection>,
  document?: EditorCanvasDocument
): boolean {
  const objectKey = instruction.objectKey?.trim();
  if (!objectKey) {
    return false;
  }
  if (COMBINE_OBJECT_KEYS.has(objectKey)) {
    return true;
  }
  if (!document) {
    return false;
  }
  return listKnownInstructionObjectIds(document).includes(objectKey);
}

function promptNeedsUserBrief(instruction: Partial<EditorInstructionSelection>): boolean {
  if (instruction.action === "replace") {
    return !instruction.replacement?.trim() && !instruction.customPrompt?.trim();
  }
  if (instruction.action === "change_color") {
    return (
      !instruction.replacement?.trim() &&
      !instruction.customPrompt?.trim() &&
      !instruction.color?.trim()
    );
  }
  if (instruction.action === "accessory_add") {
    if (!instruction.accessoryType) {
      return true;
    }
    if (instruction.accessoryType === "custom") {
      return !instruction.customPrompt?.trim();
    }
    return false;
  }
  return !instruction.customPrompt?.trim();
}

export function missingFieldsForVariantValidationCode(
  code: EditorVariantValidationCode
): string[] {
  switch (code) {
    case "missing_session":
      return ["sessionId"];
    case "missing_image":
      return ["imageUrl"];
    case "missing_prompt":
      return ["prompt", "customPrompt", "replacement", "color"];
    case "missing_object":
      return ["objectKey", "category"];
    case "missing_action":
      return ["action"];
    case "missing_instruction":
      return ["instruction", "changePlan"];
    default:
      return [];
  }
}

export function validateEditorInstructionVariantRequest(input: {
  sessionId?: string;
  imageUrl?: string;
  prompt?: string;
  instruction?: Partial<EditorInstructionSelection>;
  changePlan?: EditorInstructionChangePlanItem[];
  document?: EditorCanvasDocument;
}): EditorInstructionVariantValidationResult {
  const sessionId = input.sessionId?.trim();
  const imageUrl = input.imageUrl?.trim();
  const prompt = input.prompt?.trim();
  const instruction = input.instruction ?? {};
  const hasPlan = hasValidChangePlan(input.changePlan);

  if (!sessionId) {
    return {
      ok: false,
      error: "Session ID is required.",
      code: EDITOR_VARIANT_VALIDATION_CODES.missing_session,
    };
  }
  if (!imageUrl) {
    return {
      ok: false,
      error: "Source image URL is required.",
      code: EDITOR_VARIANT_VALIDATION_CODES.missing_image,
    };
  }

  if (!hasPlan) {
    if (!instructionResolvesToKnownObject(instruction, input.document)) {
      return {
        ok: false,
        error: "Select a part to edit.",
        code: EDITOR_VARIANT_VALIDATION_CODES.missing_object,
      };
    }
    if (!instruction.action) {
      return {
        ok: false,
        error: "Select an action.",
        code: EDITOR_VARIANT_VALIDATION_CODES.missing_action,
      };
    }
    if (!instruction.category) {
      return {
        ok: false,
        error: "Select a part to edit.",
        code: EDITOR_VARIANT_VALIDATION_CODES.missing_object,
      };
    }
  }

  if (!prompt) {
    return {
      ok: false,
      error: "Describe what you want to create or change.",
      code: EDITOR_VARIANT_VALIDATION_CODES.missing_prompt,
    };
  }

  if (!hasPlan && promptNeedsUserBrief(instruction)) {
    return {
      ok: false,
      error: "Describe what you want to create or change.",
      code: EDITOR_VARIANT_VALIDATION_CODES.missing_prompt,
    };
  }

  if (!hasPlan && !instruction.objectKey?.trim()) {
    return {
      ok: false,
      error: "Select an object and action, or add a valid change plan.",
      code: EDITOR_VARIANT_VALIDATION_CODES.missing_instruction,
    };
  }

  return { ok: true };
}
