/**
 * S2B.3 — Approved-scene BASE resolution, delta intent, location/rerender routing helpers.
 */

import {
  mapMotionPresetToTransformationIntent,
  mapSceneRerenderToTransformationIntent,
  type TransformationSlotInput,
} from "@/lib/studio-image-transformation-map";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { buildSceneRerenderTransformationPrompt } from "@/lib/studio-scene-rerender-prompt";
import type { UnifiedProductionContext } from "@/types/studio-unified-production-context";
import type {
  ClothingMaskStatus,
  ClothingTransformationQa,
  ImageChangeTarget,
  ImageTransformationIntent,
  ImageTransformationOperation,
  ImageTransformationRoute,
  TransformationExecutionRecord,
  TransformationPlan,
  TransformationTrace,
} from "@/types/studio-image-transformation";

export type ApprovedSceneStillBase = {
  id: string;
  url: string;
  generationVersion: number;
  promptVersion: number;
};

export type SceneStillCandidate = {
  id: string;
  status: string;
  imageUrl: string;
  generationVersion?: number | null;
  promptVersion?: number | null;
};

/**
 * Deterministic BASE selection: selected/approved completed still only.
 * Never “latest row” without selected/current check.
 */
export function resolveApprovedSceneStillBase(input: {
  selectedSceneImageId: string | null | undefined;
  sceneImages: SceneStillCandidate[];
}): ApprovedSceneStillBase | null {
  const selectedId = input.selectedSceneImageId?.trim() || null;
  if (!selectedId) {
    return null;
  }
  const selected = input.sceneImages.find(
    (img) =>
      img.id === selectedId &&
      img.status === "completed" &&
      Boolean(img.imageUrl?.trim())
  );
  if (!selected) {
    return null;
  }
  return {
    id: selected.id,
    url: selected.imageUrl.trim(),
    generationVersion: selected.generationVersion ?? 0,
    promptVersion: selected.promptVersion ?? 0,
  };
}

export function classifySceneRerenderOperation(input: {
  changeTargets?: ImageChangeTarget[];
  correctionText?: string | null;
  hasLocationReference?: boolean;
  forceFullGeneration?: boolean;
}): ImageTransformationOperation {
  if (input.forceFullGeneration) {
    return "FULL_SCENE_GENERATION";
  }
  const targets = input.changeTargets ?? [];
  const text = (input.correctionText ?? "").toLowerCase();

  if (targets.includes("expression") || /\b(smile|smiling|expression|frown|laugh)\b/.test(text)) {
    return "EXPRESSION_CHANGE";
  }
  if (targets.includes("location") || targets.includes("background") || input.hasLocationReference) {
    return "LOCATION_TRANSFER";
  }
  if (targets.includes("camera.crop") || /\b(closer|wider|crop|zoom|framing)\b/.test(text)) {
    return "CAMERA_REFRAME";
  }
  if (targets.includes("pose") || /\b(pose|from the side|turn)\b/.test(text)) {
    return "POSE_CHANGE";
  }
  if (targets.includes("clothing") || targets.includes("clothing.outerwear")) {
    return "CLOTHING_TRANSFER";
  }
  if (targets.includes("object")) {
    return "OBJECT_TRANSFER";
  }
  if (targets.includes("hair")) {
    return "HAIR_CHANGE";
  }
  if (targets.includes("style")) {
    return "STYLE_CHANGE";
  }
  return "SCENE_RERENDER";
}

export function buildSceneRerenderIntent(input: {
  approvedStill: ApprovedSceneStillBase;
  upc?: UnifiedProductionContext | null;
  sceneId?: string | null;
  changeTargets?: ImageChangeTarget[];
  correctionText?: string | null;
  extraRefs?: TransformationSlotInput[];
  forceFullGeneration?: boolean;
}): ImageTransformationIntent {
  const hasLocationReference =
    Boolean(input.extraRefs?.some((r) => /location|background|red_carpet|lobby/.test(r.role))) ||
    Boolean(
      input.upc?.locations.some((l) => l.referenceUrl && (!input.sceneId || true))
    );
  const operation = classifySceneRerenderOperation({
    changeTargets: input.changeTargets,
    correctionText: input.correctionText,
    hasLocationReference:
      hasLocationReference ||
      Boolean(input.changeTargets?.includes("location") || input.changeTargets?.includes("background")),
    forceFullGeneration: input.forceFullGeneration,
  });

  const baseIntent = mapSceneRerenderToTransformationIntent({
    approvedStill: { id: input.approvedStill.id, url: input.approvedStill.url },
    upc: input.upc,
    sceneId: input.sceneId,
    changeTargets: input.changeTargets,
    extraRefs: input.extraRefs,
  });

  const protectedTargets = [...baseIntent.protectedTargets];
  if (operation === "EXPRESSION_CHANGE") {
    protectedTargets.push(
      { property: "hair", level: "MUST_PRESERVE" },
      { property: "clothing", level: "MUST_PRESERVE" },
      { property: "location", level: "MUST_PRESERVE" },
      { property: "body", level: "SHOULD_PRESERVE" },
      { property: "scene composition", level: "SHOULD_PRESERVE" }
    );
  }
  if (operation === "LOCATION_TRANSFER" || operation === "BACKGROUND_REPLACE") {
    protectedTargets.push(
      { property: "wardrobe continuity", level: "MUST_PRESERVE" },
      { property: "character identity", level: "MUST_PRESERVE" },
      {
        property: "people from location reference",
        level: "MUST_NOT_IMPORT_FROM_REFERENCE",
      }
    );
  }
  if (operation === "POSE_CHANGE") {
    return {
      ...baseIntent,
      operation,
      changeTargets: input.changeTargets?.length ? input.changeTargets : ["pose"],
      protectedTargets,
      providerDriftRisk: "HIGH",
      allowTextOnlyFallback: false,
    };
  }

  return {
    ...baseIntent,
    operation,
    changeTargets:
      input.changeTargets?.length
        ? input.changeTargets
        : operation === "EXPRESSION_CHANGE"
          ? ["expression"]
          : operation === "LOCATION_TRANSFER"
            ? ["location"]
            : operation === "CAMERA_REFRAME"
              ? ["camera.crop"]
              : ["scene.delta"],
    protectedTargets,
    providerDriftRisk: operation === "CAMERA_REFRAME" ? "LOW" : baseIntent.providerDriftRisk,
    allowTextOnlyFallback: operation === "FULL_SCENE_GENERATION",
  };
}

export function resolveSceneRerenderRoute(input: {
  approvedStill: ApprovedSceneStillBase;
  upc?: UnifiedProductionContext | null;
  sceneId?: string | null;
  changeTargets?: ImageChangeTarget[];
  correctionText?: string | null;
  extraRefs?: TransformationSlotInput[];
  forceFullGeneration?: boolean;
}) {
  const intent = buildSceneRerenderIntent(input);
  const routed = routeImageTransformation(intent);
  return { intent, ...routed };
}

export function shouldUseApprovedBaseEdit(input: {
  approvedStill: ApprovedSceneStillBase | null;
  isNetNewSceneGeneration: boolean;
  forceFullGeneration?: boolean;
}): boolean {
  if (input.forceFullGeneration || input.isNetNewSceneGeneration) {
    return false;
  }
  return Boolean(input.approvedStill?.url);
}

export function downgradeScenePlanForMaskFailure(
  plan: TransformationPlan,
  trace: TransformationTrace,
  reason: string
): { plan: TransformationPlan; trace: TransformationTrace } {
  const actualRoute: ImageTransformationRoute =
    plan.requestedRoute === "SEGMENT_COMPOSITE_EDIT" ||
    plan.requestedRoute === "MASKED_EDIT" ||
    plan.requestedRoute === "MASKED_MULTI_REFERENCE_EDIT"
      ? plan.origin === "FUSION_WIZARD"
        ? "FUSION"
        : "MULTI_REFERENCE_EDIT"
      : plan.actualRoute ?? "BASE_IMAGE_EDIT";

  const protectionLost =
    reason.includes("face")
      ? ["FACE_REGION_ISOLATION"]
      : reason.includes("foreground") || reason.includes("person")
        ? ["cutout location isolation", "REGION_LEVEL_FOREGROUND_ISOLATION"]
        : ["APPROVED_BASE_PIXEL_CONTINUITY"];

  return {
    plan: {
      ...plan,
      actualRoute:
        actualRoute === "MULTI_REFERENCE_EDIT" && !plan.references.length
          ? "BASE_IMAGE_EDIT"
          : actualRoute,
      downgradeReason: reason,
      protectionLost: [...new Set([...plan.protectionLost, ...protectionLost])],
      needsMask: [],
    },
    trace: {
      ...trace,
      actualRoute:
        actualRoute === "MULTI_REFERENCE_EDIT" && !plan.references.length
          ? "BASE_IMAGE_EDIT"
          : actualRoute,
      downgradeReason: reason,
      maskUsage: [],
    },
  };
}

export function assessSceneRerenderQa(input: {
  maskStatus: ClothingMaskStatus;
  providerSucceeded: boolean;
  plan: TransformationPlan;
  usedApprovedBase: boolean;
}): ClothingTransformationQa {
  return {
    identityPreservation: input.providerSucceeded
      ? input.usedApprovedBase
        ? "PASS"
        : "WARN"
      : "FAIL",
    requestedTransfer: input.providerSucceeded ? "UNKNOWN" : "FAIL",
    protectionIntegrity: input.providerSucceeded
      ? input.plan.actualRoute === "TEXT_TO_IMAGE"
        ? "WARN"
        : "PASS"
      : "FAIL",
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

export function buildSceneTransformationExecutionRecord(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  trace: TransformationTrace;
  maskStatus: ClothingMaskStatus;
  maskStorageKey: string | null;
  providerModel: string | null;
  providerCallCount: number;
  segmentationCallCount: number;
  qa: ClothingTransformationQa;
  baseSceneImageId?: string | null;
}): TransformationExecutionRecord {
  const clothingRef = input.intent.references.find((r) => r.role === "CLOTHING_REFERENCE");
  const locationRef = input.intent.references.find((r) => r.role === "LOCATION_REFERENCE");
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
    baseSceneImageId: input.baseSceneImageId ?? input.intent.baseAsset?.assetId ?? null,
    locationReferenceAssetId: locationRef?.assetId ?? null,
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

export function buildSceneRerenderExecutionPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  productionPrompt: string;
}): string {
  return buildSceneRerenderTransformationPrompt(input);
}

/** Red carpet still plan: one paid generation, combined identity-preserving edit. */
export function resolveRedCarpetStillTransformation(input: {
  personUrl: string;
  personAssetId?: string;
  luxuryOutfitUrl?: string | null;
  locationUrl?: string | null;
  locationSlotId?: string;
}) {
  const slots: TransformationSlotInput[] = [
    {
      slotId: "person_character",
      role: "character",
      url: input.personUrl,
      assetId: input.personAssetId ?? "person",
      required: true,
    },
  ];
  if (input.luxuryOutfitUrl?.trim()) {
    slots.push({
      slotId: "luxury_outfit",
      role: "outfit",
      url: input.luxuryOutfitUrl.trim(),
      required: false,
    });
  }
  if (input.locationUrl?.trim()) {
    slots.push({
      slotId: input.locationSlotId ?? "luxury_background",
      role: "background",
      url: input.locationUrl.trim(),
      required: false,
    });
  }

  const intent = mapMotionPresetToTransformationIntent({
    presetId: "red_carpet_moment",
    slots,
  });

  // Prefer identity-preserving still edit as BASE=person when location/outfit present.
  const stillIntent: ImageTransformationIntent = {
    ...intent,
    operation: input.luxuryOutfitUrl?.trim()
      ? "CLOTHING_TRANSFER"
      : input.locationUrl?.trim()
        ? "LOCATION_TRANSFER"
        : "IDENTITY_PRESERVING_EDIT",
    baseAsset: {
      assetId: input.personAssetId ?? "person",
      role: "BASE",
      pointer: intent.baseAsset?.pointer ?? input.personUrl,
      sourceSlotId: "person_character",
      required: true,
      transferAllowed: [],
    },
    allowTextOnlyFallback: false,
    providerDriftRisk: "MEDIUM",
  };

  const routed = routeImageTransformation(stillIntent);
  return { intent: stillIntent, ...routed, singleGeneration: true as const };
}

export function isLocationFusionWorkflow(workflowType: string): boolean {
  return workflowType === "person_background";
}
