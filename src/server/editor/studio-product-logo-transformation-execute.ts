/**
 * S2B.4 — Product/logo Fusion execution via TransformationRouter + existing pixel post-composite.
 */

import {
  buildProductLogoExecutionPrompt,
  buildProductLogoExecutionRecord,
  isProductLogoFusionWorkflow,
  logStudioTransformationTrace,
  mapProductLogoPayloadToIntent,
} from "@/lib/studio-product-logo-transformation-runtime";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import {
  executeEditorInstructionVariant,
  type EditorInstructionVariantResult,
} from "@/server/editor/editor-instruction-variant-service";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  EditorFusionIntent,
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { TransformationExecutionRecord } from "@/types/studio-image-transformation";

export type ProductLogoFusionExecuteInput = {
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

export type ProductLogoFusionExecuteResult = EditorInstructionVariantResult & {
  transformationExecution?: TransformationExecutionRecord;
};

export async function executeProductLogoFusionTransformation(
  params: ProductLogoFusionExecuteInput
): Promise<ProductLogoFusionExecuteResult> {
  const intent = mapProductLogoPayloadToIntent({
    workflowType: params.fusionWorkflowType,
    primaryImageUrl: params.imageUrl,
    payload: params.fusionRenderPayload,
  });
  const { plan, trace } = routeImageTransformation(intent);

  const prompt = buildProductLogoExecutionPrompt({
    intent,
    plan,
    fusionIntelligencePrompt: params.prompt,
  });

  const result = await executeEditorInstructionVariant({
    userId: params.userId,
    sessionId: params.sessionId,
    imageUrl: params.imageUrl,
    prompt,
    instruction: params.instruction,
    references: params.references,
    fusionWorkflowType: params.fusionWorkflowType,
    fusionRenderPayload: params.fusionRenderPayload,
    fusionCreditsCharged: params.fusionCreditsCharged,
    forceInputFidelity: "high",
    providerRouteLabel: plan.actualRoute ?? plan.requestedRoute,
  });

  const pixelCompositeApplied = Boolean(
    result.ok && result.fusionRun?.brandProtectionLog?.postCompositeApplied
  );
  const postCompositeCallCount = pixelCompositeApplied ? 1 : 0;

  const transformationExecution = buildProductLogoExecutionRecord({
    intent,
    plan,
    trace,
    providerModel: result.ok ? result.model : null,
    providerCallCount: 1,
    postCompositeCallCount,
    pixelCompositeApplied,
  });

  logStudioTransformationTrace({
    operation: transformationExecution.operation,
    origin: transformationExecution.origin,
    requestedRoute: transformationExecution.requestedRoute,
    actualRoute: transformationExecution.actualRoute,
    referenceRoles: transformationExecution.referenceRoles ?? [],
    referenceCount: transformationExecution.referenceRoles?.length ?? 0,
    referenceBudget: transformationExecution.referenceBudget,
    exactnessRequirements: transformationExecution.exactnessRequirements,
    downgrade: transformationExecution.downgradeReason,
    protectionLost: transformationExecution.protectionLost,
    qaBand: transformationExecution.transformQa?.overall,
    providerCalls: transformationExecution.providerCallCount,
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

  return { ...result, transformationExecution };
}

export function shouldUseProductLogoTransformationRuntime(input: {
  workflowType: EditorFusionIntent;
}): boolean {
  return isProductLogoFusionWorkflow(input.workflowType);
}
