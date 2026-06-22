import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { executeEditorInstructionVariant } from "@/server/editor/editor-instruction-variant-service";
import {
  buildVariantRouteValidationError,
} from "@/lib/editor-instruction-variant-client";
import { receivedKeysFromVariantPayload } from "@/lib/editor-instruction-variant-preflight";
import { logEditorVariantRouteDev } from "@/lib/editor-variant-dev-log";
import { validateEditorInstructionVariantRequest } from "@/lib/editor-instruction-variant-validation";
import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import { buildFusionLibraryFields } from "@/lib/library-consistency-completion";
import {
  buildFusionWorkflowCostLog,
  recordEditorFusionProviderCost,
} from "@/server/editor/editor-fusion-provider-cost";
import {
  FUSION_RENDER_ACTION_TYPE,
  resolveFusionRenderActionType,
  resolveFusionRenderCreditsRequired,
} from "@/server/editor/editor-fusion-render-billing";
import { fusionWorkflowUsesIntelligence } from "@/lib/editor-fusion-workflow-credits";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { LibraryFusionMetadata } from "@/types/library-consistency";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

export const runtime = "nodejs";

function normalizeInstruction(
  instruction: Partial<EditorInstructionSelection>
): EditorInstructionSelection | null {
  if (!instruction.objectKey || !instruction.category || !instruction.action) {
    return null;
  }
  return {
    objectKey: instruction.objectKey,
    objectLabel: instruction.objectLabel?.trim() || instruction.objectKey,
    category: instruction.category,
    action: instruction.action,
    replacement: instruction.replacement?.trim(),
    customPrompt: instruction.customPrompt?.trim(),
    sliders: {
      ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      ...instruction.sliders,
    },
    preserveCharacter: instruction.preserveCharacter ?? true,
    logoReferenceId: instruction.logoReferenceId,
    styleReferenceId: instruction.styleReferenceId,
    productReferenceId: instruction.productReferenceId,
    brandingPlacementHint: instruction.brandingPlacementHint,
  };
}

function variantPayloadShape(body: {
  sessionId?: string;
  imageUrl?: string;
  prompt?: string;
  instruction?: Partial<EditorInstructionSelection>;
  changePlan?: unknown[];
  triggerSource?: string;
  componentName?: string;
  buttonName?: string;
}): Record<string, unknown> {
  return {
    hasSessionId: Boolean(body.sessionId?.trim()),
    hasImageUrl: Boolean(body.imageUrl?.trim()),
    promptLength: body.prompt?.trim().length ?? 0,
    instructionObjectKey: body.instruction?.objectKey ?? null,
    instructionAction: body.instruction?.action ?? null,
    changePlanCount: Array.isArray(body.changePlan) ? body.changePlan.length : 0,
    triggerSource: body.triggerSource ?? "unknown",
    componentName: body.componentName ?? null,
    buttonName: body.buttonName ?? null,
  };
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    sessionId?: string;
    imageUrl?: string;
    prompt?: string;
    instruction?: Partial<EditorInstructionSelection>;
    changePlan?: import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem[];
    references?: EditorInstructionReference[];
    variantName?: string;
    parentVariantId?: string | null;
    confirmed?: boolean;
    triggerSource?: string;
    componentName?: string;
    buttonName?: string;
    hcProjectId?: string | null;
    projectTitle?: string | null;
    fusionMetadata?: LibraryFusionMetadata | null;
    fusionWorkflowType?: EditorFusionIntent;
    fusionRenderPayload?: FusionRenderPayload | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    logEditorVariantRouteDev({
      status: 400,
      code: "invalid_json",
      error: "Invalid JSON body.",
      triggerSource: "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
        code: "invalid_json",
        missingFields: [],
        receivedKeys: [],
      },
      { status: 400 }
    );
  }

  const triggerSource = body.triggerSource?.trim() || "unknown";
  const payloadShape = variantPayloadShape(body);

  const receivedKeys = receivedKeysFromVariantPayload({
    sessionId: body.sessionId,
    imageUrl: body.imageUrl,
    prompt: body.prompt,
    instruction: body.instruction,
    changePlan: body.changePlan,
    triggerSource: body.triggerSource,
  });

  const validation = validateEditorInstructionVariantRequest({
    sessionId: body.sessionId,
    imageUrl: body.imageUrl,
    prompt: body.prompt,
    instruction: body.instruction,
    changePlan: body.changePlan,
  });

  if (!validation.ok) {
    const errorBody = buildVariantRouteValidationError({
      validation,
      receivedKeys,
      triggerSource: body.triggerSource,
    });
    logEditorVariantRouteDev({
      status: 400,
      code: errorBody.code,
      error: errorBody.error,
      triggerSource,
      componentName: body.componentName,
      buttonName: body.buttonName,
      missingFields: errorBody.missingFields,
      receivedKeys,
      payloadShape,
    });
    return NextResponse.json(errorBody, { status: 400 });
  }

  const sessionId = body.sessionId!.trim();
  const imageUrl = body.imageUrl!.trim();
  const prompt = body.prompt!.trim();
  const normalizedInstruction = body.instruction ? normalizeInstruction(body.instruction) : null;
  const changePlan = body.changePlan?.length ? body.changePlan : undefined;

  const instruction =
    normalizedInstruction ??
    (changePlan
      ? {
          objectKey: changePlan[0]!.objectId,
          objectLabel: changePlan[0]!.objectLabel,
          category: changePlan[0]!.objectCategory,
          action: changePlan[0]!.action,
          sliders: {
            ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
            changeStrength: changePlan[0]!.strength,
            preserveStyle: changePlan[0]!.preserveStyle,
            brandPreservation: changePlan[0]!.preserveBrand,
          },
        }
      : null);

  if (!instruction) {
    logEditorVariantRouteDev({
      status: 400,
      code: "missing_instruction",
      error: "Invalid instruction payload.",
      triggerSource,
      componentName: body.componentName,
      buttonName: body.buttonName,
      missingFields: ["instruction", "changePlan"],
      receivedKeys,
      payloadShape,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid instruction payload.",
        code: "missing_instruction",
        missingFields: ["instruction", "changePlan"],
        receivedKeys,
        triggerSource: body.triggerSource,
      },
      { status: 400 }
    );
  }

  const fusionWorkflowType = body.fusionWorkflowType
    ? normalizeFusionIntent(body.fusionWorkflowType)
    : body.fusionRenderPayload?.blueprint.workflowType
      ? normalizeFusionIntent(body.fusionRenderPayload.blueprint.workflowType)
      : body.fusionMetadata?.fusionIntent &&
          fusionWorkflowUsesIntelligence(body.fusionMetadata.fusionIntent as EditorFusionIntent)
        ? normalizeFusionIntent(body.fusionMetadata.fusionIntent as EditorFusionIntent)
        : null;

  const billingActionType = resolveFusionRenderActionType(fusionWorkflowType);
  const fusionCreditsRequired =
    fusionWorkflowType && billingActionType === FUSION_RENDER_ACTION_TYPE
      ? resolveFusionRenderCreditsRequired(fusionWorkflowType)
      : undefined;

  const gated = await withStudioCreditGate({
    user,
    actionType: billingActionType,
    projectId: sessionId,
    confirmed: body.confirmed,
    overrideCredits: fusionCreditsRequired,
    execute: () =>
      executeEditorInstructionVariant({
        userId: user.id,
        sessionId,
        imageUrl,
        prompt,
        instruction,
        references: body.references,
        fusionWorkflowType: fusionWorkflowType ?? undefined,
        fusionRenderPayload: body.fusionRenderPayload ?? null,
        fusionCreditsCharged: fusionCreditsRequired,
      }),
    isFailure: (result) => !result.ok,
    buildCostEvent: async (result) => {
      if (!fusionWorkflowType || billingActionType !== FUSION_RENDER_ACTION_TYPE) {
        return null;
      }
      const costLog = buildFusionWorkflowCostLog({
        workflowType: fusionWorkflowType,
        creditsCharged: fusionCreditsRequired ?? 0,
        renderCostUsd: result.ok ? (result.costEstimateUsd ?? 0.04) : 0.04,
        referenceCount: result.referenceImageCount,
        imageCount: result.referenceImageCount,
        durationMs: result.durationMs,
        status: result.ok ? "completed" : "failed",
        errorCode: result.ok ? null : result.code,
        provider: result.ok ? result.provider : "openai",
        model: result.ok ? result.model : undefined,
      });
      await recordEditorFusionProviderCost({
        userId: user.id,
        sessionId,
        workflowType: fusionWorkflowType,
        blueprintId: body.fusionRenderPayload?.blueprint.id ?? null,
        status: result.ok ? "completed" : "failed",
        costLog,
        provider: result.ok ? result.provider : "openai",
        model: result.ok ? result.model : undefined,
        referenceCount: result.referenceImageCount,
        providerSupportsMultiReference: result.providerSupportsMultiReference,
        errorCode: result.ok ? null : result.code,
      });
      return null;
    },
  });

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
  if (!result.ok) {
    logEditorVariantRouteDev({
      status: result.code === "VALIDATION" ? 400 : 502,
      code: result.code,
      error: result.message,
      triggerSource,
      componentName: body.componentName,
      buttonName: body.buttonName,
      missingFields: result.code === "VALIDATION" ? ["imageUrl"] : [],
      receivedKeys,
      payloadShape,
    });
    return NextResponse.json(
      {
        ok: false,
        error: result.message,
        code: result.code,
        missingFields: result.code === "VALIDATION" ? ["imageUrl"] : [],
        receivedKeys,
        triggerSource: body.triggerSource,
        componentName: body.componentName,
        buttonName: body.buttonName,
      },
      { status: result.code === "VALIDATION" ? 400 : 502 }
    );
  }

  let libraryRecord: Awaited<ReturnType<typeof ensureCompletedGenerationInLibrary>> | null = null;
  try {
    const fusion = buildFusionLibraryFields(body.fusionMetadata);
    libraryRecord = await ensureCompletedGenerationInLibrary({
      ownerId: user.id,
      createdBy: user.id,
      generationType: "editor_variant",
      assetUrl: result.resultUrl,
      storageKey: result.storageKey,
      thumbnailUrl: result.resultUrl,
      assetName:
        body.variantName?.trim() ||
        (changePlan
          ? `Plan variant (${changePlan.length})`
          : `${instruction.action} ${instruction.objectLabel}`),
      promptSummary: prompt.slice(0, 240),
      projectId: body.hcProjectId?.trim() || sessionId,
      projectTitle: body.projectTitle?.trim() || null,
      sourceModule: "editor",
      backingId: result.storageKey.split("/").pop()?.replace(/\.png$/i, "") ?? undefined,
      assetType: fusion.fusionArchetype || fusion.fusionIntent ? "fusion_output" : "editor_variant",
      workflow: fusion.workflow,
      fusionIntent: fusion.fusionIntent,
      fusionArchetype: fusion.fusionArchetype,
      fusionMetadata: fusion.fusionMetadata,
      usedInModules: ["editor", "studio"],
    });
  } catch (error) {
    console.error("[library-consistency] editor variant register failed", error);
  }

  return NextResponse.json({
    ok: true,
    resultUrl: result.resultUrl,
    storageKey: result.storageKey,
    provider: result.provider,
    model: result.model,
    costEstimateUsd: result.costEstimateUsd,
    instruction,
    changePlan: body.changePlan,
    references: body.references,
    prompt,
    sourceImageUrl: imageUrl,
    variantName: body.variantName,
    fusionRun: result.fusionRun,
    providerSupportsMultiReference: result.providerSupportsMultiReference,
    referenceImageCount: result.referenceImageCount,
    fusionCreditsCharged: fusionCreditsRequired,
    estimatedCredits: gated.estimatedCredits,
    versionNote:
      body.variantName ??
      (changePlan
        ? `Change plan (${changePlan.length} edits)`
        : `Variant: ${instruction.action} ${instruction.objectLabel}`),
    triggerSource: body.triggerSource,
    librarySaved: Boolean(libraryRecord),
    libraryAssetId: libraryRecord?.registryAssetId ?? null,
  });
}
