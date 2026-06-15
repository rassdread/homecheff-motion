import { isPublicDebugUiEnabled } from "@/lib/debug-ui";
import type { EditorInstructionChangePlanItem, EditorInstructionSelection } from "@/types/editor-instruction-studio";

export function editorVariantDevLoggingEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || isPublicDebugUiEnabled();
}

export type EditorVariantDevPayload = {
  sessionId?: string;
  imageUrl?: string;
  prompt?: string;
  instruction?: Partial<EditorInstructionSelection>;
  changePlan?: EditorInstructionChangePlanItem[];
  objectKey?: string;
  category?: string;
  action?: string;
};

export function sanitizeEditorVariantDevPayload(
  payload: EditorVariantDevPayload
): EditorVariantDevPayload {
  return {
    sessionId: payload.sessionId,
    imageUrl: payload.imageUrl ? payload.imageUrl.slice(0, 240) : undefined,
    prompt: payload.prompt ? payload.prompt.slice(0, 240) : undefined,
    instruction: payload.instruction
      ? {
          objectKey: payload.instruction.objectKey,
          objectLabel: payload.instruction.objectLabel,
          category: payload.instruction.category,
          action: payload.instruction.action,
          color: payload.instruction.color,
        }
      : undefined,
    changePlan: payload.changePlan?.map((item) => ({
      objectId: item.objectId,
      objectLabel: item.objectLabel,
      objectCategory: item.objectCategory,
      action: item.action,
      instruction: item.instruction?.slice(0, 120),
    })) as EditorInstructionChangePlanItem[] | undefined,
    objectKey: payload.objectKey,
    category: payload.category,
    action: payload.action,
  };
}

export function logEditorVariantRequestDev(input: {
  triggerSource?: string;
  componentName?: string;
  buttonName?: string;
  validationPassed: boolean;
  missingFields?: string[];
  payload: EditorVariantDevPayload;
}): void {
  if (!editorVariantDevLoggingEnabled()) {
    return;
  }
  console.warn("[variant-request]", {
    triggerSource: input.triggerSource ?? "unknown",
    component: input.componentName ?? input.buttonName ?? "unknown",
    validationPassed: input.validationPassed,
    missingFields: input.missingFields ?? [],
    payload: sanitizeEditorVariantDevPayload(input.payload),
  });
}

export function logEditorVariantBlockedDev(input: {
  triggerSource?: string;
  componentName?: string;
  buttonName?: string;
  code?: string;
  missingFields?: string[];
}): void {
  if (!editorVariantDevLoggingEnabled()) {
    return;
  }
  console.warn("[variant-blocked]", input);
}

export function logEditorVariantSentDev(input: {
  triggerSource?: string;
  componentName?: string;
  buttonName?: string;
  route: string;
}): void {
  if (!editorVariantDevLoggingEnabled()) {
    return;
  }
  console.warn("[variant-sent]", input);
}

export function logEditorVariantRouteDev(input: {
  status: number;
  code?: string;
  error?: string;
  triggerSource?: string;
  componentName?: string;
  buttonName?: string;
  missingFields?: string[];
  receivedKeys?: string[];
  payloadShape?: Record<string, unknown>;
}): void {
  if (!editorVariantDevLoggingEnabled()) {
    return;
  }
  const level = input.status >= 400 ? "warn" : "info";
  const row = {
    status: input.status,
    code: input.code,
    error: input.error,
    triggerSource: input.triggerSource ?? "unknown",
    componentName: input.componentName,
    buttonName: input.buttonName,
    missingFields: input.missingFields ?? [],
    receivedKeys: input.receivedKeys ?? [],
    payloadShape: input.payloadShape,
  };
  if (level === "warn") {
    console.warn("[variant-route]", row);
  } else {
    console.info("[variant-route]", row);
  }
}
