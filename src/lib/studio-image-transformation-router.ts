/**
 * S2B.1 — TransformationRouter.
 * Routes ImageTransformationIntent onto existing Studio engines.
 * Does not execute providers and does not add extra generation calls.
 */

import { resolveSceneStillCapability } from "@/lib/studio-generation-provider-capabilities";
import {
  preferredMaskForOperation,
  requiredRolesForOperation,
} from "@/lib/studio-image-transformation-roles";
import {
  budgetReferencesForOperation,
  PROVIDER_MAX_ADDITIONAL_REFERENCES,
  roleCollisionPriority,
} from "@/lib/studio-reference-budget";
import {
  IMAGE_TRANSFORMATION_VERSION,
  type ImageMaskRegionKind,
  type ImagePromptPolicy,
  type ImageTransformationAsset,
  type ImageTransformationIntent,
  type ImageTransformationOperation,
  type ImageTransformationRole,
  type ImageTransformationRoute,
  type TransformationPlan,
  type TransformationRuntimeCapabilities,
  type TransformationTrace,
} from "@/types/studio-image-transformation";

const IDENTITY_ROLES = new Set<ImageTransformationRole>([
  "BASE",
  "IDENTITY_REFERENCE",
  "FACE_REFERENCE",
  "BODY_REFERENCE",
]);

export function resolveTransformationCapabilities(
  overrides?: Partial<TransformationRuntimeCapabilities>
): TransformationRuntimeCapabilities {
  const still = resolveSceneStillCapability();
  const defaults: TransformationRuntimeCapabilities = {
    supportsBaseEdit: still.editsClass === "IMAGE_EDIT" || still.editsClass === "MULTI_REFERENCE",
    supportsMultiReference: still.editsClass === "MULTI_REFERENCE",
    supportsMask: true,
    supportsPixelComposite: true,
    supportsCommercialInject: true,
    stillReferenceEditEnabled: still.useReferenceEdit,
    // Align with OpenAI still/edit adapter hard cap (S2B.4). Do not advertise 16.
    maxReferenceImages:
      still.editsClass === "MULTI_REFERENCE"
        ? PROVIDER_MAX_ADDITIONAL_REFERENCES
        : still.editsClass === "IMAGE_EDIT"
          ? 1
          : 0,
  };
  return { ...defaults, ...overrides };
}

function hasRole(intent: ImageTransformationIntent, role: ImageTransformationRole): boolean {
  if (intent.baseAsset?.role === role) {
    return true;
  }
  return intent.references.some((r) => r.role === role);
}

function hasUsableMask(intent: ImageTransformationIntent, region: ImageMaskRegionKind): boolean {
  return intent.masks.some((m) => m.region === region && m.pointer);
}

function identityLike(asset: ImageTransformationAsset | null): boolean {
  return Boolean(asset && IDENTITY_ROLES.has(asset.role));
}

function requestedRouteFor(intent: ImageTransformationIntent): ImageTransformationRoute {
  const faceMask = hasUsableMask(intent, "FACE_REGION");
  const personMask = hasUsableMask(intent, "PERSON_FOREGROUND");
  switch (intent.operation) {
    case "CLOTHING_TRANSFER":
      return "MASKED_MULTI_REFERENCE_EDIT";
    case "LOGO_PRESERVE":
      return "PIXEL_COMPOSITE";
    case "PRODUCT_PRESERVE":
      return intent.references.some((r) => r.exactness === "MUST_PRESERVE")
        ? "COMMERCIAL_INJECT"
        : "MULTI_REFERENCE_EDIT";
    case "EXPRESSION_CHANGE":
      return faceMask ? "MASKED_EDIT" : "BASE_IMAGE_EDIT";
    case "HAIR_CHANGE":
      return "MASKED_EDIT";
    case "BACKGROUND_REPLACE":
    case "LOCATION_TRANSFER":
      return personMask ? "SEGMENT_COMPOSITE_EDIT" : "MULTI_REFERENCE_EDIT";
    case "SCENE_RERENDER":
      return intent.references.length > 0 ? "MULTI_REFERENCE_EDIT" : "BASE_IMAGE_EDIT";
    case "FULL_SCENE_GENERATION":
      return "TEXT_TO_IMAGE";
    case "MOTION_ONLY":
      return "BASE_IMAGE_EDIT";
    case "POSE_CHANGE":
      return "BASE_IMAGE_EDIT";
    case "STYLE_CHANGE":
      return identityLike(intent.baseAsset) ? "BASE_IMAGE_EDIT" : "TEXT_TO_IMAGE";
    case "MULTI_CHARACTER_COMPOSITION":
    case "CHARACTER_REFERENCE_GENERATION":
    case "OBJECT_TRANSFER":
    case "IDENTITY_PRESERVING_EDIT":
      return intent.references.length > 0 ? "MULTI_REFERENCE_EDIT" : "BASE_IMAGE_EDIT";
    default:
      return "BASE_IMAGE_EDIT";
  }
}

function adapterFor(route: ImageTransformationRoute, origin: ImageTransformationIntent["origin"]): string {
  switch (route) {
    case "FUSION":
      return "editor-fusion-render-service";
    case "MASKED_EDIT":
    case "MASKED_MULTI_REFERENCE_EDIT":
      return "editor-masked-openai-edit";
    case "PIXEL_COMPOSITE":
      return "brand-asset-post-composite";
    case "COMMERCIAL_INJECT":
      return "studio-commercial-scene-assign";
    case "SEGMENT_COMPOSITE_EDIT":
      return "editor-compositor";
    case "MULTI_REFERENCE_EDIT":
      return origin === "FUSION_WIZARD" || origin === "MORPH" ? "editor-fusion-render-service" : "openai-image-edits";
    case "BASE_IMAGE_EDIT":
      return "openai-image-edits";
    case "TEXT_TO_IMAGE":
      return "openai-image-generations";
    case "LEGACY_ADAPTER":
      return "legacy-inferred";
    default:
      return "openai-image-edits";
  }
}

function rolePriority(operation: ImageTransformationOperation, role: ImageTransformationRole): number {
  return roleCollisionPriority(operation, role);
}

function budgetReferences(
  intent: ImageTransformationIntent,
  max: number
): {
  kept: ImageTransformationAsset[];
  dropped: ImageTransformationAsset[];
  compositeRecommended: boolean;
  protectionLost: string[];
} {
  const budget = budgetReferencesForOperation(intent, max);
  return {
    kept: budget.kept,
    dropped: budget.dropped,
    compositeRecommended: budget.compositeRecommended,
    protectionLost: budget.protectionLost,
  };
}

function promptPolicies(intent: ImageTransformationIntent): ImagePromptPolicy[] {
  const policies: ImagePromptPolicy[] = [];
  if (intent.operation === "SCENE_RERENDER" || intent.operation === "EXPRESSION_CHANGE") {
    policies.push("DELTA_ONLY");
  }
  if (intent.baseAsset) {
    policies.push("PRESERVE_BASE");
  }
  if (intent.protectedTargets.some((p) => p.property.includes("identity") && p.level === "MUST_PRESERVE")) {
    policies.push("PROTECT_IDENTITY");
  }
  if (intent.references.some((r) => r.transferAllowed.length > 0)) {
    policies.push("TRANSFER_REFERENCE_ATTRIBUTE");
  }
  if (
    intent.operation === "CLOTHING_TRANSFER" ||
    intent.protectedTargets.some((p) => p.level === "MUST_NOT_IMPORT_FROM_REFERENCE")
  ) {
    policies.push("DO_NOT_IMPORT_REFERENCE_IDENTITY");
  }
  return policies;
}

function qaHooks(intent: ImageTransformationIntent): string[] {
  switch (intent.operation) {
    case "CLOTHING_TRANSFER":
      return ["identity preservation", "clothing transfer success"];
    case "LOGO_PRESERVE":
      return ["exact logo preservation"];
    case "PRODUCT_PRESERVE":
      return ["product geometry preservation"];
    case "LOCATION_TRANSFER":
    case "BACKGROUND_REPLACE":
      return ["identity preserved", "location match"];
    case "EXPRESSION_CHANGE":
      return ["identity preservation", "expression change"];
    case "SCENE_RERENDER":
      return ["identity preservation", "delta applied", "not fresh t2i unless downgraded"];
    case "MULTI_CHARACTER_COMPOSITION":
      return ["each character identity associated"];
    default:
      return ["identity preservation"];
  }
}

function motionHints(intent: ImageTransformationIntent): string[] {
  if (intent.family === "RED_CARPET_CELEBRITY" || intent.sourcePreset === "red_carpet_moment") {
    return ["walk", "pose", "camera flashes"];
  }
  return [];
}

function missingRequired(intent: ImageTransformationIntent): ImageTransformationRole[] {
  const missing: ImageTransformationRole[] = [];
  const needsBase =
    intent.operation !== "FULL_SCENE_GENERATION" &&
    intent.family !== "NOT_TRANSFORMATION_RELEVANT";
  if (needsBase && !intent.baseAsset) {
    missing.push("BASE");
  }
  if (
    (intent.operation === "CLOTHING_TRANSFER" ||
      intent.operation === "EXPRESSION_CHANGE" ||
      intent.operation === "POSE_CHANGE" ||
      intent.operation === "HAIR_CHANGE" ||
      intent.operation === "LOCATION_TRANSFER" ||
      intent.operation === "BACKGROUND_REPLACE") &&
    intent.baseAsset &&
    !identityLike({ ...intent.baseAsset, role: intent.baseAsset.role })
  ) {
    const clothingAsBase = intent.baseAsset.role === "CLOTHING_REFERENCE";
    if (clothingAsBase || intent.baseAsset.role === "LOCATION_REFERENCE") {
      missing.push("IDENTITY_REFERENCE");
    }
  }
  if (intent.operation === "CLOTHING_TRANSFER" && intent.baseAsset && !identityLike(intent.baseAsset)) {
    if (!missing.includes("IDENTITY_REFERENCE")) {
      missing.push("IDENTITY_REFERENCE");
    }
  }
  for (const role of requiredRolesForOperation(intent.operation, intent.sourcePreset ?? intent.sourceWizard)) {
    if (!hasRole(intent, role) && intent.baseAsset?.role !== role) {
      missing.push(role);
    }
  }
  return [...new Set(missing)];
}

function chooseActualRoute(
  intent: ImageTransformationIntent,
  requested: ImageTransformationRoute,
  cap: TransformationRuntimeCapabilities,
  missing: ImageTransformationRole[]
): {
  actual: ImageTransformationRoute | null;
  reason: string | null;
  lost: string[];
  unsupported: string[];
} {
  const lost: string[] = [];
  const unsupported: string[] = [];
  if (missing.length > 0 && !intent.allowTextOnlyFallback) {
    return {
      actual: null,
      reason: "MISSING_REQUIRED_REFERENCE",
      lost: ["cannot execute without required roles"],
      unsupported: missing,
    };
  }

  const clothingMask = hasUsableMask(intent, "CLOTHING_REGION");
  const faceMask = hasUsableMask(intent, "FACE_REGION");
  const personMask = hasUsableMask(intent, "PERSON_FOREGROUND");
  const fusionOrigin = intent.origin === "FUSION_WIZARD" || intent.origin === "MORPH";

  const asFusionOrMulti = (): ImageTransformationRoute =>
    fusionOrigin && cap.supportsMultiReference ? "FUSION" : cap.supportsMultiReference ? "MULTI_REFERENCE_EDIT" : "BASE_IMAGE_EDIT";

  if (intent.operation === "CLOTHING_TRANSFER") {
    if (clothingMask && cap.supportsMask && cap.supportsMultiReference) {
      return { actual: "MASKED_MULTI_REFERENCE_EDIT", reason: null, lost, unsupported };
    }
    if (cap.supportsMultiReference) {
      return {
        actual: fusionOrigin ? "FUSION" : "MULTI_REFERENCE_EDIT",
        reason: clothingMask ? null : "clothing mask unavailable",
        lost: clothingMask ? [] : ["region-level clothing isolation"],
        unsupported: clothingMask ? [] : ["clothing_mask"],
      };
    }
    if (cap.supportsBaseEdit) {
      return {
        actual: "BASE_IMAGE_EDIT",
        reason: "multi-reference unavailable",
        lost: ["clothing reference isolation"],
        unsupported: ["multi_reference"],
      };
    }
    if (intent.allowTextOnlyFallback) {
      return {
        actual: "TEXT_TO_IMAGE",
        reason: "no edit path; text-only fallback allowed",
        lost: ["identity lock", "clothing transfer fidelity"],
        unsupported: ["base_edit", "multi_reference"],
      };
    }
    return {
      actual: null,
      reason: "no capable clothing route",
      lost: ["clothing transfer"],
      unsupported: ["base_edit", "multi_reference"],
    };
  }

  if (intent.operation === "LOGO_PRESERVE") {
    if (cap.supportsPixelComposite) {
      return { actual: "PIXEL_COMPOSITE", reason: null, lost, unsupported };
    }
    if (cap.supportsCommercialInject) {
      return {
        actual: "COMMERCIAL_INJECT",
        reason: "pixel composite unavailable",
        lost: [],
        unsupported: ["pixel_composite"],
      };
    }
    if (hasUsableMask(intent, "LOGO_PLACEMENT") && cap.supportsMask) {
      return {
        actual: "MASKED_EDIT",
        reason: "deterministic logo path unavailable",
        lost: ["exact pixel logo"],
        unsupported: ["pixel_composite", "commercial_inject"],
      };
    }
    const fallback = asFusionOrMulti();
    return {
      actual: fallback,
      reason: "exact logo path unavailable; generative reference only",
      lost: ["exact logo preservation"],
      unsupported: ["pixel_composite"],
    };
  }

  if (intent.operation === "PRODUCT_PRESERVE") {
    if (intent.references.some((r) => r.exactness === "MUST_PRESERVE") && cap.supportsCommercialInject) {
      return { actual: "COMMERCIAL_INJECT", reason: null, lost, unsupported };
    }
    if (cap.supportsPixelComposite && hasRole(intent, "LOGO_REFERENCE")) {
      return { actual: "PIXEL_COMPOSITE", reason: null, lost, unsupported };
    }
    if (cap.supportsMultiReference) {
      return { actual: asFusionOrMulti(), reason: null, lost, unsupported };
    }
    if (cap.supportsBaseEdit) {
      return { actual: "BASE_IMAGE_EDIT", reason: "multi-reference unavailable", lost: [], unsupported: ["multi_reference"] };
    }
  }

  if (intent.operation === "EXPRESSION_CHANGE") {
    if (faceMask && cap.supportsMask) {
      return { actual: "MASKED_EDIT", reason: null, lost, unsupported };
    }
    if (cap.supportsBaseEdit) {
      return {
        actual: "BASE_IMAGE_EDIT",
        reason: faceMask ? null : "face mask unavailable",
        lost: faceMask ? [] : ["region-level expression isolation"],
        unsupported: faceMask ? [] : ["face_mask"],
      };
    }
  }

  if (intent.operation === "LOCATION_TRANSFER" || intent.operation === "BACKGROUND_REPLACE") {
    if (personMask && cap.supportsMask) {
      return { actual: "SEGMENT_COMPOSITE_EDIT", reason: null, lost, unsupported };
    }
    if (cap.supportsMultiReference) {
      return {
        actual: asFusionOrMulti(),
        reason: personMask ? null : "person foreground mask unavailable",
        lost: personMask ? [] : ["cutout location isolation"],
        unsupported: personMask ? [] : ["person_foreground_mask"],
      };
    }
    if (cap.supportsBaseEdit) {
      return { actual: "BASE_IMAGE_EDIT", reason: "multi-reference unavailable", lost: [], unsupported: ["multi_reference"] };
    }
  }

  if (intent.operation === "SCENE_RERENDER") {
    if (cap.supportsMultiReference && intent.references.length > 0) {
      return { actual: "MULTI_REFERENCE_EDIT", reason: null, lost, unsupported };
    }
    if (cap.supportsBaseEdit && intent.baseAsset) {
      return {
        actual: "BASE_IMAGE_EDIT",
        reason: cap.supportsMultiReference ? null : "multi-reference unavailable",
        lost: [],
        unsupported: cap.supportsMultiReference ? [] : ["multi_reference"],
      };
    }
    if (intent.allowTextOnlyFallback) {
      return {
        actual: "TEXT_TO_IMAGE",
        reason: "base edit unavailable",
        lost: ["approved still as visual anchor"],
        unsupported: ["base_edit"],
      };
    }
    return {
      actual: null,
      reason: "scene rerender cannot silently fall back to text-only",
      lost: ["approved still as visual anchor"],
      unsupported: ["base_edit"],
    };
  }

  if (intent.operation === "FULL_SCENE_GENERATION") {
    return { actual: "TEXT_TO_IMAGE", reason: null, lost, unsupported };
  }

  if (intent.family === "NOT_TRANSFORMATION_RELEVANT") {
    return {
      actual: null,
      reason: "not transformation relevant",
      lost: [],
      unsupported: [],
    };
  }

  if (requested === "TEXT_TO_IMAGE") {
    return { actual: "TEXT_TO_IMAGE", reason: null, lost, unsupported };
  }

  if (cap.supportsMultiReference && intent.references.length > 0) {
    return { actual: asFusionOrMulti(), reason: null, lost, unsupported };
  }
  if (cap.supportsBaseEdit && intent.baseAsset) {
    return { actual: "BASE_IMAGE_EDIT", reason: intent.references.length ? "multi-reference unavailable" : null, lost, unsupported };
  }
  if (intent.allowTextOnlyFallback || intent.origin === "LEGACY") {
    return {
      actual: "TEXT_TO_IMAGE",
      reason: "legacy/text fallback allowed",
      lost: ["base-anchored edit"],
      unsupported: ["base_edit"],
    };
  }
  return {
    actual: null,
    reason: "no capable route",
    lost: [],
    unsupported: ["base_edit", "multi_reference"],
  };
}

export function buildTransformationTrace(
  intent: ImageTransformationIntent,
  plan: TransformationPlan
): TransformationTrace {
  return {
    operation: intent.operation,
    origin: intent.origin,
    family: intent.family,
    baseAssetId: intent.baseAsset?.assetId ?? null,
    referenceRoles: plan.references.map((r) => r.role),
    changeTargets: intent.changeTargets,
    protectedTargets: intent.protectedTargets.map((p) => `${p.property}:${p.level}`),
    requestedRoute: plan.requestedRoute,
    actualRoute: plan.actualRoute,
    providerMode: plan.providerMode,
    maskUsage: plan.masks.map((m) => m.region),
    downgradeReason: plan.downgradeReason,
    upcHash: intent.upcHash ?? null,
    sceneContextHash: intent.sceneContextHash ?? null,
    status: plan.status,
  };
}

export function routeImageTransformation(
  intent: ImageTransformationIntent,
  capabilities?: Partial<TransformationRuntimeCapabilities>
): { plan: TransformationPlan; trace: TransformationTrace } {
  const cap = resolveTransformationCapabilities(capabilities);
  const requested = requestedRouteFor(intent);
  const missing = missingRequired(intent);
  const { actual, reason, lost, unsupported } = chooseActualRoute(intent, requested, cap, missing);
  const budget = budgetReferences(intent, cap.maxReferenceImages);
  const needsMask = preferredMaskForOperation(intent.operation).filter(() => {
    if (intent.operation === "CLOTHING_TRANSFER") {
      return actual === "MASKED_MULTI_REFERENCE_EDIT" || actual === "MASKED_EDIT";
    }
    if (intent.operation === "EXPRESSION_CHANGE") {
      return actual === "MASKED_EDIT";
    }
    if (intent.operation === "LOCATION_TRANSFER" || intent.operation === "BACKGROUND_REPLACE") {
      return actual === "SEGMENT_COMPOSITE_EDIT" || actual === "MASKED_MULTI_REFERENCE_EDIT";
    }
    return actual === "MASKED_EDIT" || actual === "MASKED_MULTI_REFERENCE_EDIT";
  });

  let status: TransformationPlan["status"] = "ready";
  if (intent.family === "NOT_TRANSFORMATION_RELEVANT") {
    status = "not_transformation_relevant";
  } else if (missing.length > 0) {
    status = "missing_required_reference";
  } else if (intent.origin === "LEGACY") {
    status = "legacy_inferred";
  }

  const postProcess: TransformationPlan["postProcess"] = [];
  if (actual === "PIXEL_COMPOSITE") {
    postProcess.push("PIXEL_COMPOSITE");
  } else if (actual === "COMMERCIAL_INJECT") {
    postProcess.push("COMMERCIAL_INJECT");
  } else if (intent.operation === "LOGO_PRESERVE" && cap.supportsPixelComposite) {
    postProcess.push("PIXEL_COMPOSITE");
  } else {
    postProcess.push("NONE");
  }

  const plan: TransformationPlan = {
    version: IMAGE_TRANSFORMATION_VERSION,
    status,
    operation: intent.operation,
    origin: intent.origin,
    family: intent.family,
    requestedRoute: requested,
    actualRoute: status === "missing_required_reference" ? null : actual,
    adapter: actual ? adapterFor(actual, intent.origin) : "none",
    base: intent.baseAsset,
    references: budget.kept,
    droppedReferences: budget.dropped,
    masks: intent.masks,
    needsMask,
    providerMode:
      actual === "TEXT_TO_IMAGE"
        ? "generations"
        : actual === "PIXEL_COMPOSITE" || actual === "COMMERCIAL_INJECT"
          ? "post_composite"
          : actual === "FUSION"
            ? "fusion_multi_reference"
            : "edits",
    requiredCapabilities: [
      ...(requested.includes("MASK") ? ["mask"] : []),
      ...(requested.includes("MULTI") || requested === "FUSION" ? ["multi_reference"] : []),
      ...(requested === "PIXEL_COMPOSITE" ? ["pixel_composite"] : []),
      ...(requested === "BASE_IMAGE_EDIT" ? ["base_edit"] : []),
    ],
    protectionPolicy: intent.protectedTargets,
    promptPolicy: promptPolicies(intent),
    postProcess,
    qaHooks: qaHooks(intent),
    motionHints: motionHints(intent),
    compositeReferenceRecommended: budget.compositeRecommended,
    missingRequired: missing,
    downgradeReason: status === "missing_required_reference" ? "MISSING_REQUIRED_REFERENCE" : reason,
    protectionLost: [...new Set([...lost, ...budget.protectionLost])],
    unsupportedCapabilities: unsupported,
    providerDriftRisk: intent.operation === "POSE_CHANGE" ? "HIGH" : intent.providerDriftRisk ?? "MEDIUM",
  };

  return { plan, trace: buildTransformationTrace(intent, plan) };
}
