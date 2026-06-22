import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  EditorFusionIntent,
  EditorInstructionChangePlanItem,
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import {
  logEditorVariantPreflightDev,
  preflightEditorInstructionVariant,
  type EditorVariantTriggerSource,
} from "@/lib/editor-instruction-variant-preflight";
import {
  recordEditorVariantTrace,
  type EditorVariantTraceRoute,
} from "@/lib/editor-instruction-variant-trace";
import {
  logEditorVariantBlockedDev,
  logEditorVariantRequestDev,
  logEditorVariantSentDev,
} from "@/lib/editor-variant-dev-log";
import {
  missingFieldsForVariantValidationCode,
  validateEditorInstructionVariantRequest,
} from "@/lib/editor-instruction-variant-validation";

export class EditorVariantPreflightBlockedError extends Error {
  readonly code: string;
  readonly missingFields: string[];

  constructor(message: string, code: string, missingFields: string[]) {
    super(message);
    this.name = "EditorVariantPreflightBlockedError";
    this.code = code;
    this.missingFields = missingFields;
  }
}

export type EditorInstructionVariantApiResponse = {
  ok: boolean;
  resultUrl?: string;
  storageKey?: string;
  provider?: string;
  model?: string;
  costEstimateUsd?: number;
  instruction?: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  prompt?: string;
  sourceImageUrl?: string;
  versionNote?: string;
  variantName?: string;
  error?: string;
  code?: string;
  missingFields?: string[];
  receivedKeys?: string[];
  triggerSource?: string;
  librarySaved?: boolean;
  libraryAssetId?: string | null;
  estimatedCredits?: number;
  creditGate?: boolean;
  fusionRun?: import("@/types/editor-fusion-intelligence").FusionRunRecord;
  providerSupportsMultiReference?: boolean;
  referenceImageCount?: number;
  fusionCreditsCharged?: number;
};

export type EditorVariantTraceMeta = {
  componentName: string;
  buttonName: string;
};

function traceMeta(input: {
  trace?: EditorVariantTraceMeta;
  triggerSource: EditorVariantTriggerSource | string;
}): EditorVariantTraceMeta {
  return {
    componentName: input.trace?.componentName ?? "EditorInstructionVariantClient",
    buttonName: input.trace?.buttonName ?? String(input.triggerSource),
  };
}

export async function executeEditorInstructionVariantApi(input: {
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
  changePlan?: EditorInstructionChangePlanItem[];
  references?: EditorInstructionReference[];
  variantName?: string;
  parentVariantId?: string | null;
  document?: EditorCanvasDocument;
  triggerSource?: EditorVariantTriggerSource;
  trace?: EditorVariantTraceMeta;
  debug?: { isAdmin?: boolean };
  fusionWorkflowType?: EditorFusionIntent;
  fusionRenderPayload?: FusionRenderPayload | null;
  confirmed?: boolean;
}): Promise<EditorInstructionVariantApiResponse> {
  const triggerSource = input.triggerSource ?? "variant_api_client";
  const route: EditorVariantTraceRoute = "/api/editor/instruction/variant";
  const meta = traceMeta({ trace: input.trace, triggerSource });
  const audit = preflightEditorInstructionVariant({
    triggerSource,
    sessionId: input.sessionId,
    imageUrl: input.imageUrl,
    prompt: input.prompt,
    instruction: input.instruction,
    changePlan: input.changePlan,
    document: input.document,
  });
  logEditorVariantPreflightDev(audit, input.debug);
  logEditorVariantRequestDev({
    triggerSource,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    validationPassed: audit.validation.ok,
    missingFields: audit.missingFields,
    payload: audit.payload,
  });

  if (!audit.validation.ok) {
    logEditorVariantBlockedDev({
      triggerSource,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
      code: audit.validation.code,
      missingFields: audit.missingFields,
    });
    recordEditorVariantTrace({
      triggerSource,
      sessionId: input.sessionId,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
      route,
      blocked: true,
      sent: false,
      responseStatus: "client_blocked",
      validationCode: audit.validation.code,
    });
    if (process.env.NODE_ENV === "development") {
      throw new EditorVariantPreflightBlockedError(
        audit.validation.error,
        audit.validation.code,
        audit.missingFields
      );
    }
    return {
      ok: false,
      error: audit.validation.error,
      code: audit.validation.code,
      missingFields: audit.missingFields,
      receivedKeys: audit.receivedKeys,
      triggerSource,
    };
  }

  logEditorVariantSentDev({
    triggerSource,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    route,
  });

  const res = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: input.sessionId,
      imageUrl: input.imageUrl,
      prompt: input.prompt,
      instruction: input.instruction,
      changePlan: input.changePlan,
      references: input.references,
      variantName: input.variantName,
      parentVariantId: input.parentVariantId,
      triggerSource,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
      hcProjectId: input.document?.instructionStudioState?.hcProjectId ?? null,
      projectTitle: input.document?.name ?? null,
      fusionWorkflowType: input.fusionWorkflowType,
      fusionRenderPayload: input.fusionRenderPayload ?? null,
      fusionMetadata: input.fusionWorkflowType
        ? { fusionIntent: input.fusionWorkflowType, workflow: "combine" as const }
        : null,
      confirmed: input.confirmed ?? true,
    }),
    credentials: "include",
  });
  const body = (await res.json()) as EditorInstructionVariantApiResponse;

  if (!res.ok && body.creditGate) {
    return {
      ok: false,
      error: body.error ?? "Insufficient credits",
      code: body.code ?? "insufficient_credits",
      estimatedCredits: body.estimatedCredits,
      creditGate: true,
    };
  }

  recordEditorVariantTrace({
    triggerSource,
    sessionId: input.sessionId,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    route,
    blocked: false,
    sent: true,
    responseStatus: res.status,
    validationCode: body.ok ? "ok" : body.code,
  });

  return body;
}

export async function executeEditorInstructionBulkVariantApi(input: {
  sessionId: string;
  imageUrl: string;
  instruction: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  plans: Array<{ id: string; name: string; promptSuffix: string; action?: EditorInstructionSelection["action"] }>;
  document?: EditorCanvasDocument;
  triggerSource?: EditorVariantTriggerSource;
  trace?: EditorVariantTraceMeta;
  debug?: { isAdmin?: boolean };
}): Promise<{ ok: boolean; results: EditorInstructionVariantApiResponse[]; error?: string; code?: string }> {
  const triggerSource = input.triggerSource ?? "instruction_bulk_generate";
  const route: EditorVariantTraceRoute = "/api/editor/instruction/variant/bulk";
  const meta = traceMeta({ trace: input.trace, triggerSource });
  const audit = preflightEditorInstructionVariant({
    triggerSource,
    sessionId: input.sessionId,
    imageUrl: input.imageUrl,
    prompt: input.plans[0]?.promptSuffix || "bulk",
    instruction: input.instruction,
    document: input.document,
  });
  logEditorVariantPreflightDev(audit, input.debug);
  logEditorVariantRequestDev({
    triggerSource,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    validationPassed: audit.validation.ok,
    missingFields: audit.missingFields,
    payload: audit.payload,
  });

  if (!audit.validation.ok) {
    logEditorVariantBlockedDev({
      triggerSource,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
      code: audit.validation.code,
      missingFields: audit.missingFields,
    });
    recordEditorVariantTrace({
      triggerSource,
      sessionId: input.sessionId,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
      route,
      blocked: true,
      sent: false,
      responseStatus: "client_blocked",
      validationCode: audit.validation.code,
    });
    if (process.env.NODE_ENV === "development") {
      throw new EditorVariantPreflightBlockedError(
        audit.validation.error,
        audit.validation.code,
        audit.missingFields
      );
    }
    return {
      ok: false,
      results: [],
      error: audit.validation.error,
      code: audit.validation.code,
    };
  }

  logEditorVariantSentDev({
    triggerSource,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    route,
  });

  const res = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      triggerSource,
      componentName: meta.componentName,
      buttonName: meta.buttonName,
    }),
    credentials: "include",
  });
  const body = (await res.json()) as {
    ok: boolean;
    results: EditorInstructionVariantApiResponse[];
    error?: string;
    code?: string;
  };

  recordEditorVariantTrace({
    triggerSource,
    sessionId: input.sessionId,
    componentName: meta.componentName,
    buttonName: meta.buttonName,
    route,
    blocked: false,
    sent: true,
    responseStatus: res.status,
    validationCode: body.ok ? "ok" : body.code,
  });

  return body;
}

export function recordEditorVariantPreflightBlock(input: {
  triggerSource: EditorVariantTriggerSource | string;
  sessionId?: string;
  route: EditorVariantTraceRoute;
  trace: EditorVariantTraceMeta;
  validationCode: string;
}): void {
  recordEditorVariantTrace({
    triggerSource: input.triggerSource,
    sessionId: input.sessionId,
    componentName: input.trace.componentName,
    buttonName: input.trace.buttonName,
    route: input.route,
    blocked: true,
    sent: false,
    responseStatus: "client_blocked",
    validationCode: input.validationCode,
  });
}

export function buildVariantRouteValidationError(input: {
  validation: ReturnType<typeof validateEditorInstructionVariantRequest>;
  receivedKeys: string[];
  triggerSource?: string;
}): {
  ok: false;
  error: string;
  code: string;
  missingFields: string[];
  receivedKeys: string[];
  triggerSource?: string;
} {
  if (input.validation.ok) {
    throw new Error("buildVariantRouteValidationError requires a failed validation.");
  }
  return {
    ok: false,
    error: input.validation.error,
    code: input.validation.code,
    missingFields: missingFieldsForVariantValidationCode(input.validation.code),
    receivedKeys: input.receivedKeys,
    triggerSource: input.triggerSource,
  };
}
