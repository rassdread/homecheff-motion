/**
 * S2B.4 — Product/logo transformation runtime helpers + safe transformation trace.
 */

import { buildProductLogoTransformationPrompt } from "@/lib/studio-product-logo-transformation-prompt";
import {
  mapFusionWizardToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { assessTransformationQa, toLegacyClothingQa } from "@/lib/studio-transform-qa";
import { COMPOSITE_REFERENCE_BOARD_DECISION } from "@/lib/studio-reference-budget";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  ClothingMaskStatus,
  ImageTransformationIntent,
  TransformationExecutionRecord,
  TransformationPlan,
  TransformationTrace,
} from "@/types/studio-image-transformation";

const PRODUCT_LOGO_WORKFLOWS = new Set<EditorFusionIntent>([
  "product_branding",
  "product_environment",
]);

export function isProductLogoFusionWorkflow(workflowType: EditorFusionIntent): boolean {
  return PRODUCT_LOGO_WORKFLOWS.has(workflowType);
}

export function mapProductLogoPayloadToIntent(input: {
  workflowType: EditorFusionIntent;
  primaryImageUrl: string;
  payload: FusionRenderPayload;
}): ImageTransformationIntent {
  const normalized = input.workflowType;
  const baseRole =
    normalized === "product_branding" || normalized === "product_environment" ? "product" : "person";
  const slots: TransformationSlotInput[] = [
    {
      slotId: baseRole,
      role: baseRole,
      url: input.primaryImageUrl,
      assetId: "base",
      required: true,
    },
  ];
  for (const ref of input.payload.references) {
    const role = (ref.role ?? "reference").toLowerCase();
    if (role === baseRole && ref.url === input.primaryImageUrl) {
      continue;
    }
    slots.push({
      slotId: ref.referenceId,
      role,
      url: ref.url,
      assetId: ref.referenceId,
      required: role === "logo" || role === "product",
    });
  }
  return mapFusionWizardToTransformationIntent({
    intentId: input.workflowType,
    slots,
    baseSlotId: baseRole,
    origin: "FUSION_WIZARD",
  });
}

export function resolveProductLogoRoute(input: {
  workflowType: EditorFusionIntent;
  primaryImageUrl: string;
  payload: FusionRenderPayload;
}) {
  const intent = mapProductLogoPayloadToIntent(input);
  const routed = routeImageTransformation(intent);
  return { intent, ...routed };
}

export function buildProductLogoExecutionPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  fusionIntelligencePrompt: string;
}): string {
  return buildProductLogoTransformationPrompt(input);
}

export function buildProductLogoExecutionRecord(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  trace: TransformationTrace;
  maskStatus?: ClothingMaskStatus;
  providerModel: string | null;
  providerCallCount: number;
  postCompositeCallCount: number;
  pixelCompositeApplied: boolean;
}): TransformationExecutionRecord {
  const product = input.intent.references.find((r) => r.role === "PRODUCT_REFERENCE");
  const logo = input.intent.references.find((r) => r.role === "LOGO_REFERENCE");
  const transformQa = assessTransformationQa({
    operation: input.intent.operation,
    plan: input.plan,
    providerSucceeded: true,
    usedApprovedBase: true,
    hasProductMustPreserve: product?.exactness === "MUST_PRESERVE",
    hasLogoMustPreserve: logo?.exactness === "MUST_PRESERVE",
    pixelCompositeApplied: input.pixelCompositeApplied,
  });

  return {
    version: input.intent.version,
    operation: input.intent.operation,
    origin: input.intent.origin,
    requestedRoute: input.plan.requestedRoute,
    actualRoute: input.plan.actualRoute,
    downgradeReason: input.plan.downgradeReason,
    protectionLost: input.plan.protectionLost,
    maskStatus: input.maskStatus ?? "MASK_UNAVAILABLE",
    maskStorageKey: null,
    maskRequested: false,
    maskUsed: false,
    baseAssetId: input.intent.baseAsset?.assetId ?? null,
    clothingReferenceAssetId: null,
    productReferenceAssetId: product?.assetId ?? null,
    logoReferenceAssetId: logo?.assetId ?? null,
    referenceRoles: input.plan.references.map((r) => r.role),
    referenceBudget: input.plan.references.length,
    droppedReferenceRoles: input.plan.droppedReferences.map((r) => r.role),
    exactnessRequirements: input.intent.references
      .filter((r) => r.exactness === "MUST_PRESERVE")
      .map((r) => `${r.role}:MUST_PRESERVE`),
    providerMode: input.plan.providerMode,
    providerModel: input.providerModel,
    providerCallCount: input.providerCallCount,
    segmentationCallCount: 0,
    postCompositeCallCount: input.postCompositeCallCount,
    qa: toLegacyClothingQa(transformQa),
    transformQa: {
      overall: transformQa.overall,
      recommendedEscalation: transformQa.recommendedEscalation,
      checkedDimensions: transformQa.checkedDimensions,
      productPreservation: transformQa.productPreservation,
      logoPreservation: transformQa.logoPreservation,
      secondaryIdentityPreservation: transformQa.secondaryIdentityPreservation,
      locationMatch: transformQa.locationMatch,
      clothingTransferMatch: transformQa.clothingTransferMatch,
    },
    upcHash: input.intent.upcHash ?? null,
    sceneContextHash: input.intent.sceneContextHash ?? null,
    sourcePreset: input.intent.sourcePreset ?? input.intent.sourceWizard ?? null,
    wizardId: input.intent.sourceWizard ?? null,
  };
}

export function logStudioTransformationTrace(record: {
  operation: string;
  origin: string;
  requestedRoute: string | null;
  actualRoute: string | null;
  referenceRoles: string[];
  referenceCount: number;
  referenceBudget?: number;
  maskStatus?: string;
  exactnessRequirements?: string[];
  downgrade?: string | null;
  protectionLost?: string[];
  qaBand?: string;
  providerCalls?: number;
}): void {
  console.info(
    "[studio-transformation]",
    JSON.stringify({
      operation: record.operation,
      origin: record.origin,
      requestedRoute: record.requestedRoute,
      actualRoute: record.actualRoute,
      referenceRoles: record.referenceRoles,
      referenceCount: record.referenceCount,
      referenceBudget: record.referenceBudget ?? null,
      maskStatus: record.maskStatus ?? null,
      exactnessRequirements: record.exactnessRequirements ?? [],
      downgrade: record.downgrade ?? null,
      protectionLost: record.protectionLost ?? [],
      qaBand: record.qaBand ?? null,
      providerCalls: record.providerCalls ?? null,
      compositeBoard: COMPOSITE_REFERENCE_BOARD_DECISION,
      timestamp: new Date().toISOString(),
    })
  );
}

/** Multi-character role association lines for provider prompts. */
export function buildMultiCharacterAssociationLines(
  identities: Array<{ assetId: string; name?: string | null; index: number }>
): string[] {
  if (identities.length < 2) {
    return [];
  }
  const lines = [
    "MULTI-CHARACTER IDENTITY ASSOCIATION:",
    "Each identity reference below is a distinct person. Do not blend faces or swap identities.",
  ];
  for (const id of identities) {
    const label = id.name?.trim() || `Character ${String.fromCharCode(65 + id.index)}`;
    lines.push(
      `- Identity reference ${id.index + 1} (${id.assetId}) = ${label}. Preserve ${label}'s face and identity only for that person.`
    );
  }
  lines.push('Do not treat references as "people for inspiration."');
  return lines;
}
