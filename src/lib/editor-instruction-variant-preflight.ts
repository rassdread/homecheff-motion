import { isPublicDebugUiEnabled } from "@/lib/debug-ui";
import {
  EDITOR_VARIANT_VALIDATION_I18N,
  missingFieldsForVariantValidationCode,
  type EditorInstructionVariantValidationResult,
  validateEditorInstructionVariantRequest,
} from "@/lib/editor-instruction-variant-validation";
import type {
  EditorInstructionChangePlanItem,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorVariantTriggerSource =
  | "instruction_generate_variant"
  | "instruction_generate_from_plan"
  | "instruction_bulk_generate"
  | "combine_generate"
  | "combine_sequence_step"
  | "variant_api_client";

export type EditorVariantCallAudit = {
  triggerSource: EditorVariantTriggerSource;
  validation: EditorInstructionVariantValidationResult;
  blocked: boolean;
  missingFields: string[];
  receivedKeys: string[];
  payload: {
    sessionId?: string;
    imageUrl?: string;
    prompt?: string;
    instruction?: Partial<EditorInstructionSelection>;
    changePlan?: EditorInstructionChangePlanItem[];
    objectKey?: string;
    category?: string;
    action?: string;
  };
  at: string;
};

export function receivedKeysFromVariantPayload(input: {
  sessionId?: string;
  imageUrl?: string;
  prompt?: string;
  instruction?: Partial<EditorInstructionSelection>;
  changePlan?: EditorInstructionChangePlanItem[];
  triggerSource?: string;
}): string[] {
  const keys: string[] = [];
  if (input.sessionId !== undefined) keys.push("sessionId");
  if (input.imageUrl !== undefined) keys.push("imageUrl");
  if (input.prompt !== undefined) keys.push("prompt");
  if (input.instruction !== undefined) keys.push("instruction");
  if (input.changePlan !== undefined) keys.push("changePlan");
  if (input.triggerSource !== undefined) keys.push("triggerSource");
  return keys;
}

export function preflightEditorInstructionVariant(input: {
  triggerSource: EditorVariantTriggerSource;
  sessionId?: string;
  imageUrl?: string;
  prompt?: string;
  instruction?: Partial<EditorInstructionSelection>;
  changePlan?: EditorInstructionChangePlanItem[];
  document?: EditorCanvasDocument;
}): EditorVariantCallAudit {
  const validation = validateEditorInstructionVariantRequest({
    sessionId: input.sessionId,
    imageUrl: input.imageUrl,
    prompt: input.prompt,
    instruction: input.instruction,
    changePlan: input.changePlan,
    document: input.document,
  });

  const instruction = input.instruction ?? {};
  const missingFields =
    validation.ok ? [] : missingFieldsForVariantValidationCode(validation.code);

  return {
    triggerSource: input.triggerSource,
    validation,
    blocked: !validation.ok,
    missingFields,
    receivedKeys: receivedKeysFromVariantPayload(input),
    payload: {
      sessionId: input.sessionId,
      imageUrl: input.imageUrl,
      prompt: input.prompt,
      instruction,
      changePlan: input.changePlan,
      objectKey: instruction.objectKey,
      category: instruction.category,
      action: instruction.action,
    },
    at: new Date().toISOString(),
  };
}

export function variantValidationMessageKey(
  validation: EditorInstructionVariantValidationResult
): string | null {
  if (validation.ok) {
    return null;
  }
  return EDITOR_VARIANT_VALIDATION_I18N[validation.code];
}

export function logEditorVariantPreflightDev(
  audit: EditorVariantCallAudit,
  options?: { isAdmin?: boolean }
): void {
  if (process.env.NODE_ENV === "production" && !isPublicDebugUiEnabled() && !options?.isAdmin) {
    return;
  }
  const level = audit.blocked ? "warn" : "info";
  const payload = {
    triggerSource: audit.triggerSource,
    blocked: audit.blocked,
    code: audit.validation.ok ? "ok" : audit.validation.code,
    missingFields: audit.missingFields,
    receivedKeys: audit.receivedKeys,
    sessionId: audit.payload.sessionId,
    imageUrl: audit.payload.imageUrl,
    prompt: audit.payload.prompt?.slice(0, 240),
    objectKey: audit.payload.objectKey,
    category: audit.payload.category,
    action: audit.payload.action,
    changePlanCount: audit.payload.changePlan?.length ?? 0,
  };
  if (level === "warn") {
    console.warn("[editor.variant.preflight]", payload);
  } else {
    console.info("[editor.variant.preflight]", payload);
  }
}
