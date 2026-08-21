/**
 * S2B.3 — Location / person_background Fusion execution via TransformationRouter.
 * Person BASE + LOCATION_REFERENCE; foreground composite downgrades to multi-ref when compositor unavailable.
 */

import { buildSceneRerenderTransformationPrompt } from "@/lib/studio-scene-rerender-prompt";
import {
  assessSceneRerenderQa,
  buildSceneTransformationExecutionRecord,
  downgradeScenePlanForMaskFailure,
  isLocationFusionWorkflow,
} from "@/lib/studio-scene-rerender-runtime";
import {
  mapFusionWizardToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
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
import type {
  ClothingMaskStatus,
  TransformationExecutionRecord,
} from "@/types/studio-image-transformation";

export type LocationFusionExecuteInput = {
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

export type LocationFusionExecuteResult = EditorInstructionVariantResult & {
  transformationExecution?: TransformationExecutionRecord;
};

function mapLocationPayloadToIntent(input: {
  primaryImageUrl: string;
  payload: FusionRenderPayload;
  personMaskPointer?: string | null;
}) {
  const slots: TransformationSlotInput[] = [
    {
      slotId: "person",
      role: "person",
      url: input.primaryImageUrl,
      assetId: "person",
      required: true,
      maskPointer: input.personMaskPointer ?? undefined,
    },
  ];
  for (const ref of input.payload.references) {
    const role = (ref.role ?? "reference").toLowerCase();
    slots.push({
      slotId: ref.referenceId,
      role,
      url: ref.url,
      assetId: ref.referenceId,
      required: role === "background" || role === "location",
    });
  }
  return mapFusionWizardToTransformationIntent({
    intentId: "person_background",
    slots,
    baseSlotId: "person",
    origin: "FUSION_WIZARD",
  });
}

export async function executeLocationFusionTransformation(
  params: LocationFusionExecuteInput
): Promise<LocationFusionExecuteResult> {
  const intent = mapLocationPayloadToIntent({
    primaryImageUrl: params.imageUrl,
    payload: params.fusionRenderPayload,
  });
  let { plan, trace } = routeImageTransformation(intent);

  const maskStatus: ClothingMaskStatus = "MASK_UNAVAILABLE";
  const maskStorageKey: string | null = null;
  const segmentationCallCount = 0;

  // SEGMENT_COMPOSITE_EDIT requires editor-compositor; not wired for Fusion location yet.
  // Explicit downgrade to Fusion/multi-ref — never silent T2I, never edit person via wrong mask.
  if (plan.actualRoute === "SEGMENT_COMPOSITE_EDIT") {
    const downgraded = downgradeScenePlanForMaskFailure(
      plan,
      trace,
      "FOREGROUND_COMPOSITOR_UNAVAILABLE"
    );
    plan = {
      ...downgraded.plan,
      actualRoute: "FUSION",
      adapter: "editor-fusion-render-service",
      providerMode: "fusion_multi_reference",
    };
    trace = {
      ...downgraded.trace,
      actualRoute: "FUSION",
      downgradeReason: "FOREGROUND_COMPOSITOR_UNAVAILABLE",
    };
  }

  const locationPrompt = buildSceneRerenderTransformationPrompt({
    intent,
    plan,
    productionPrompt: params.prompt,
  });

  const result = await executeEditorInstructionVariant({
    userId: params.userId,
    sessionId: params.sessionId,
    imageUrl: params.imageUrl,
    prompt: locationPrompt,
    instruction: params.instruction,
    references: params.references,
    fusionWorkflowType: params.fusionWorkflowType,
    fusionRenderPayload: params.fusionRenderPayload,
    fusionCreditsCharged: params.fusionCreditsCharged,
    forceInputFidelity: "high",
    providerRouteLabel: plan.actualRoute ?? plan.requestedRoute,
  });

  const qa = assessSceneRerenderQa({
    maskStatus,
    providerSucceeded: result.ok,
    plan,
    usedApprovedBase: true,
  });

  const transformationExecution = buildSceneTransformationExecutionRecord({
    intent,
    plan,
    trace,
    maskStatus,
    maskStorageKey,
    providerModel: result.ok ? result.model : null,
    providerCallCount: 1,
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

  return { ...result, transformationExecution };
}

export function shouldUseLocationTransformationRuntime(input: {
  workflowType: EditorFusionIntent;
}): boolean {
  return isLocationFusionWorkflow(input.workflowType);
}
