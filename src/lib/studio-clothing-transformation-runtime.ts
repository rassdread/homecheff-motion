/**
 * S2B.2 — Runtime clothing transformation execution via S2B.1 router.
 */

import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { resolveFusionVariantImageSlots } from "@/lib/editor-fusion-variant-render";
import {
  mapFusionWizardToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import {
  buildClothingTransformationPrompt,
} from "@/lib/studio-clothing-transformation-prompt";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  ClothingMaskStatus,
  ClothingTransformationQa,
  ImageTransformationIntent,
  ImageTransformationRoute,
  TransformationExecutionRecord,
  TransformationPlan,
  TransformationTrace,
} from "@/types/studio-image-transformation";

const CLOTHING_FUSION_WORKFLOWS = new Set<EditorFusionIntent>([
  "outfit_from_reference",
  "person_outfit",
]);

export function isClothingFusionWorkflow(workflowType: EditorFusionIntent): boolean {
  return CLOTHING_FUSION_WORKFLOWS.has(normalizeFusionIntent(workflowType));
}

export function mapFusionRenderPayloadToTransformationIntent(input: {
  workflowType: EditorFusionIntent;
  primaryImageUrl: string;
  payload: FusionRenderPayload;
}): ImageTransformationIntent {
  const normalized = normalizeFusionIntent(input.workflowType);
  const slots: TransformationSlotInput[] = [
    {
      slotId: "person",
      role: "person",
      url: input.primaryImageUrl,
      assetId: "person",
      required: true,
    },
  ];

  for (const ref of input.payload.references) {
    const role = (ref.role ?? "reference").toLowerCase();
    slots.push({
      slotId: ref.referenceId,
      role,
      url: ref.url,
      assetId: ref.referenceId,
      required: role === "outfit" || role === "clothing_item" || role === "clothing",
    });
  }

  return mapFusionWizardToTransformationIntent({
    intentId: normalized,
    slots,
    baseSlotId: "person",
    origin: "FUSION_WIZARD",
  });
}

export function assessClothingTransformationQa(input: {
  maskStatus: ClothingMaskStatus;
  providerSucceeded: boolean;
  plan: TransformationPlan;
}): ClothingTransformationQa {
  const maskOk = input.maskStatus === "MASK_VALID";
  const maskedRoute = input.plan.actualRoute === "MASKED_MULTI_REFERENCE_EDIT";
  return {
    identityPreservation:
      input.providerSucceeded && (maskedRoute ? maskOk : true) ? "PASS" : input.providerSucceeded ? "WARN" : "FAIL",
    requestedTransfer: input.providerSucceeded ? "UNKNOWN" : "FAIL",
    protectionIntegrity: input.providerSucceeded ? "PASS" : "FAIL",
    negativeTransferLeak: "UNKNOWN",
    maskIntegrity:
      input.maskStatus === "MASK_VALID"
        ? "PASS"
        : input.maskStatus === "MASK_LOW_CONFIDENCE"
          ? "WARN"
          : input.maskStatus === "MASK_UNAVAILABLE"
            ? "UNKNOWN"
            : "FAIL",
  };
}

export function buildTransformationExecutionRecord(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  trace: TransformationTrace;
  maskStatus: ClothingMaskStatus;
  maskStorageKey: string | null;
  providerModel: string | null;
  providerCallCount: number;
  segmentationCallCount: number;
  qa: ClothingTransformationQa;
}): TransformationExecutionRecord {
  const clothingRef = input.intent.references.find((r) => r.role === "CLOTHING_REFERENCE");
  return {
    version: input.intent.version,
    operation: input.intent.operation,
    origin: input.intent.origin,
    requestedRoute: input.plan.requestedRoute,
    actualRoute: input.plan.actualRoute,
    downgradeReason: input.plan.downgradeReason,
    protectionLost: input.plan.protectionLost,
    maskStatus: input.maskStatus,
    maskStorageKey: input.maskStorageKey,
    baseAssetId: input.intent.baseAsset?.assetId ?? null,
    clothingReferenceAssetId: clothingRef?.assetId ?? null,
    providerMode: input.plan.providerMode,
    providerModel: input.providerModel,
    providerCallCount: input.providerCallCount,
    segmentationCallCount: input.segmentationCallCount,
    qa: input.qa,
    upcHash: input.intent.upcHash ?? null,
    sceneContextHash: input.intent.sceneContextHash ?? null,
    sourcePreset: input.intent.sourcePreset ?? input.intent.sourceWizard ?? null,
  };
}

export function downgradePlanForMaskFailure(
  plan: TransformationPlan,
  trace: TransformationTrace,
  reason: string
): { plan: TransformationPlan; trace: TransformationTrace } {
  const actualRoute: ImageTransformationRoute =
    plan.origin === "FUSION_WIZARD" || plan.origin === "MORPH" ? "FUSION" : "MULTI_REFERENCE_EDIT";
  return {
    plan: {
      ...plan,
      actualRoute,
      adapter: "editor-fusion-render-service",
      providerMode: "fusion_multi_reference",
      downgradeReason: reason,
      protectionLost: [...new Set([...plan.protectionLost, "region-level clothing isolation"])],
      needsMask: [],
    },
    trace: {
      ...trace,
      actualRoute,
      downgradeReason: reason,
      maskUsage: [],
    },
  };
}

export function resolveClothingTransformationRoute(input: {
  workflowType: EditorFusionIntent;
  primaryImageUrl: string;
  payload: FusionRenderPayload;
}) {
  const intent = mapFusionRenderPayloadToTransformationIntent(input);
  const routed = routeImageTransformation(intent);
  return { intent, ...routed };
}

export function fusionPayloadHasClothingReference(payload: FusionRenderPayload): boolean {
  return payload.references.some((ref) => {
    const role = (ref.role ?? "").toLowerCase();
    return role === "outfit" || role === "clothing" || role === "clothing_item";
  });
}

export function buildClothingExecutionPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  fusionIntelligencePrompt: string;
}): string {
  return buildClothingTransformationPrompt({
    intent: input.intent,
    plan: input.plan,
    fusionIntelligencePrompt: input.fusionIntelligencePrompt,
  });
}

export function countClothingReferenceSlots(payload: FusionRenderPayload, primaryImageUrl: string): number {
  return resolveFusionVariantImageSlots({ primaryImageUrl, payload }).length;
}
