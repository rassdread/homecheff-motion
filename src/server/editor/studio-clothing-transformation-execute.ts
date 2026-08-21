/**
 * S2B.2 — Server-side clothing transformation execution (router-active).
 */

import { buildOpenAiInpaintMaskBuffer } from "@/server/editor/editor-masked-openai-edit";
import { generateClothingRegionMask } from "@/server/editor/editor-clothing-region-mask";
import {
  executeEditorInstructionVariant,
  type EditorInstructionVariantResult,
} from "@/server/editor/editor-instruction-variant-service";
import {
  assessClothingTransformationQa,
  buildClothingExecutionPrompt,
  buildTransformationExecutionRecord,
  downgradePlanForMaskFailure,
  isClothingFusionWorkflow,
  mapFusionRenderPayloadToTransformationIntent,
  resolveClothingTransformationRoute,
} from "@/lib/studio-clothing-transformation-runtime";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
  EditorFusionIntent,
} from "@/types/editor-instruction-studio";
import type {
  ClothingMaskStatus,
  TransformationExecutionRecord,
  TransformationPlan,
  TransformationTrace,
} from "@/types/studio-image-transformation";

export type ClothingFusionExecuteInput = {
  userId: string;
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  fusionWorkflowType: EditorFusionIntent;
  fusionRenderPayload: FusionRenderPayload;
  fusionCreditsCharged?: number;
};

export type ClothingFusionExecuteResult = EditorInstructionVariantResult & {
  transformationExecution?: TransformationExecutionRecord;
};

function maskUnavailableReason(status: ClothingMaskStatus): string {
  switch (status) {
    case "MASK_UNAVAILABLE":
      return "CLOTHING_MASK_UNAVAILABLE";
    case "MASK_INVALID":
      return "CLOTHING_MASK_INVALID";
    case "MASK_LOW_CONFIDENCE":
      return "CLOTHING_MASK_LOW_CONFIDENCE";
    default:
      return "CLOTHING_MASK_UNAVAILABLE";
  }
}

export async function executeClothingFusionTransformation(
  params: ClothingFusionExecuteInput
): Promise<ClothingFusionExecuteResult> {
  const { intent, plan: initialPlan, trace: initialTrace } = resolveClothingTransformationRoute({
    workflowType: params.fusionWorkflowType,
    primaryImageUrl: params.imageUrl,
    payload: params.fusionRenderPayload,
  });

  if (initialPlan.status === "missing_required_reference") {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Outfit reference is required for this transformation.",
      durationMs: 0,
    };
  }

  let plan: TransformationPlan = initialPlan;
  let trace: TransformationTrace = initialTrace;
  let maskStatus: ClothingMaskStatus = "MASK_UNAVAILABLE";
  let maskStorageKey: string | null = null;
  let openAiMaskBuffer: Buffer | undefined;
  let segmentationCallCount = 0;

  const clothingPrompt = buildClothingExecutionPrompt({
    intent,
    plan,
    fusionIntelligencePrompt: params.prompt,
  });

  const shouldAttemptMask =
    plan.requestedRoute === "MASKED_MULTI_REFERENCE_EDIT" &&
    plan.actualRoute === "MASKED_MULTI_REFERENCE_EDIT";

  if (shouldAttemptMask) {
    const existingMask = intent.masks.find((m) => m.region === "CLOTHING_REGION")?.pointer;
    const maskResult = await generateClothingRegionMask({
      userId: params.userId,
      sessionId: params.sessionId,
      imageUrl: params.imageUrl,
      existingMaskUrl: existingMask?.startsWith("http") ? existingMask : null,
    });
    segmentationCallCount = maskResult.ok ? (maskResult.providerUsed === "existing_mask" ? 0 : 1) : 1;

    if (maskResult.ok && (maskResult.status === "MASK_VALID" || maskResult.status === "MASK_LOW_CONFIDENCE")) {
      maskStatus = maskResult.status;
      maskStorageKey = maskResult.maskStorageKey;
      openAiMaskBuffer = await buildOpenAiInpaintMaskBuffer(maskResult.maskBuffer);
    } else {
      maskStatus = maskResult.ok ? maskResult.status : maskResult.status;
      const downgraded = downgradePlanForMaskFailure(
        plan,
        trace,
        maskUnavailableReason(maskStatus)
      );
      plan = downgraded.plan;
      trace = downgraded.trace;
    }
  } else if (plan.actualRoute === "FUSION" || plan.actualRoute === "MULTI_REFERENCE_EDIT") {
    maskStatus = "MASK_UNAVAILABLE";
  }

  const providerCallCount = 1;
  const result = await executeEditorInstructionVariant({
    userId: params.userId,
    sessionId: params.sessionId,
    imageUrl: params.imageUrl,
    prompt: clothingPrompt,
    instruction: params.instruction,
    references: params.references,
    fusionWorkflowType: params.fusionWorkflowType,
    fusionRenderPayload: params.fusionRenderPayload,
    fusionCreditsCharged: params.fusionCreditsCharged,
    maskBuffer: openAiMaskBuffer,
    forceInputFidelity: "high",
    providerRouteLabel: plan.actualRoute ?? plan.requestedRoute,
  });

  const qa = assessClothingTransformationQa({
    maskStatus,
    providerSucceeded: result.ok,
    plan,
  });

  const transformationExecution = buildTransformationExecutionRecord({
    intent,
    plan,
    trace,
    maskStatus,
    maskStorageKey,
    providerModel: result.ok ? result.model : null,
    providerCallCount,
    segmentationCallCount,
    qa,
  });

  if (result.ok && result.fusionRun) {
    return {
      ...result,
      fusionRun: {
        ...result.fusionRun,
        transformationExecution,
      },
      transformationExecution,
    };
  }

  return {
    ...result,
    transformationExecution,
  };
}

export function shouldUseClothingTransformationRuntime(input: {
  workflowType: EditorFusionIntent;
  payload: FusionRenderPayload;
}): boolean {
  return isClothingFusionWorkflow(input.workflowType);
}

/** Re-route after injecting mask pointer into intent (for tests). */
export function routeClothingWithMaskPointer(input: {
  workflowType: EditorFusionIntent;
  primaryImageUrl: string;
  payload: FusionRenderPayload;
  maskUrl: string;
}) {
  const intent = mapFusionRenderPayloadToTransformationIntent({
    workflowType: input.workflowType,
    primaryImageUrl: input.primaryImageUrl,
    payload: input.payload,
  });
  intent.masks = [
    {
      region: "CLOTHING_REGION",
      purpose: "change",
      pointer: input.maskUrl,
      source: "segmentation",
    },
  ];
  return routeImageTransformation(intent);
}
