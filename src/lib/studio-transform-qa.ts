/**
 * S2B.4 — Operation-aware transformation QA (PASS/WARN/FAIL/UNKNOWN, no fake precision).
 * No automatic retry loops — escalate as recommendations only.
 */

import type {
  ClothingMaskStatus,
  ClothingTransformationQaBand,
  ImageTransformationOperation,
  TransformationPlan,
} from "@/types/studio-image-transformation";

export type TransformQaBand = ClothingTransformationQaBand;

export type TransformQaEscalation =
  | "USE_MASK"
  | "FORCE_BASE_EDIT"
  | "REDUCE_REFERENCES"
  | "RAISE_IDENTITY_PRIORITY"
  | "PIXEL_COMPOSITE"
  | "SEGMENT_COMPOSITE"
  | "PROVIDER_LIMITATION"
  | "MANUAL_REVIEW"
  | "NONE";

export type TransformQaResult = {
  operation: ImageTransformationOperation;
  requestedChangeMatch: TransformQaBand;
  identityPreservation: TransformQaBand;
  secondaryIdentityPreservation: TransformQaBand;
  productPreservation: TransformQaBand;
  logoPreservation: TransformQaBand;
  locationMatch: TransformQaBand;
  clothingTransferMatch: TransformQaBand;
  protectedRegionStability: TransformQaBand;
  negativeTransferViolation: TransformQaBand;
  compositionStability: TransformQaBand;
  overall: TransformQaBand;
  recommendedEscalation: TransformQaEscalation;
  checkedDimensions: string[];
};

function overallFrom(bands: TransformQaBand[]): TransformQaBand {
  if (bands.includes("FAIL")) return "FAIL";
  if (bands.includes("WARN")) return "WARN";
  if (bands.every((b) => b === "UNKNOWN")) return "UNKNOWN";
  if (bands.includes("PASS") && bands.every((b) => b === "PASS" || b === "UNKNOWN")) return "PASS";
  return "WARN";
}

export function qaDimensionsForOperation(operation: ImageTransformationOperation): string[] {
  switch (operation) {
    case "CLOTHING_TRANSFER":
      return [
        "requestedChangeMatch",
        "identityPreservation",
        "clothingTransferMatch",
        "negativeTransferViolation",
        "protectedRegionStability",
      ];
    case "LOCATION_TRANSFER":
    case "BACKGROUND_REPLACE":
      return [
        "requestedChangeMatch",
        "identityPreservation",
        "locationMatch",
        "negativeTransferViolation",
        "productPreservation",
        "logoPreservation",
      ];
    case "PRODUCT_PRESERVE":
      return ["requestedChangeMatch", "productPreservation", "logoPreservation", "compositionStability"];
    case "LOGO_PRESERVE":
      return ["requestedChangeMatch", "logoPreservation", "compositionStability"];
    case "EXPRESSION_CHANGE":
      return [
        "requestedChangeMatch",
        "identityPreservation",
        "protectedRegionStability",
        "compositionStability",
      ];
    case "MULTI_CHARACTER_COMPOSITION":
    case "SCENE_RERENDER":
      return [
        "requestedChangeMatch",
        "identityPreservation",
        "secondaryIdentityPreservation",
        "productPreservation",
        "logoPreservation",
        "compositionStability",
      ];
    default:
      return ["requestedChangeMatch", "identityPreservation", "protectedRegionStability"];
  }
}

export function assessTransformationQa(input: {
  operation: ImageTransformationOperation;
  plan: Pick<TransformationPlan, "actualRoute" | "downgradeReason" | "protectionLost" | "postProcess">;
  providerSucceeded: boolean;
  usedApprovedBase?: boolean;
  maskStatus?: ClothingMaskStatus;
  identityCount?: number;
  hasProductMustPreserve?: boolean;
  hasLogoMustPreserve?: boolean;
  pixelCompositeApplied?: boolean;
}): TransformQaResult {
  const dims = qaDimensionsForOperation(input.operation);
  const unknown: TransformQaBand = "UNKNOWN";
  const failOrWarn = (ok: boolean, warnWhenPartial = false): TransformQaBand => {
    if (!input.providerSucceeded) return "FAIL";
    if (ok) return "PASS";
    return warnWhenPartial ? "WARN" : "FAIL";
  };

  const usedBase =
    input.usedApprovedBase !== false &&
    input.plan.actualRoute !== "TEXT_TO_IMAGE" &&
    input.plan.actualRoute !== null;

  const identityPreservation = failOrWarn(usedBase, true);
  const secondaryIdentityPreservation =
    (input.identityCount ?? 1) > 1
      ? failOrWarn(usedBase && !input.plan.protectionLost.includes("MUST_PRESERVE_OVER_PROVIDER_BUDGET"), true)
      : unknown;

  const productPreservation = input.hasProductMustPreserve
    ? failOrWarn(
        Boolean(
          input.pixelCompositeApplied ||
            input.plan.postProcess.includes("PIXEL_COMPOSITE") ||
            input.plan.postProcess.includes("COMMERCIAL_INJECT") ||
            input.plan.actualRoute === "PIXEL_COMPOSITE" ||
            input.plan.actualRoute === "COMMERCIAL_INJECT" ||
            input.plan.actualRoute === "MULTI_REFERENCE_EDIT" ||
            input.plan.actualRoute === "FUSION"
        ),
        true
      )
    : unknown;

  const logoPreservation = input.hasLogoMustPreserve
    ? failOrWarn(
        Boolean(
          input.pixelCompositeApplied ||
            input.plan.postProcess.includes("PIXEL_COMPOSITE") ||
            input.plan.actualRoute === "PIXEL_COMPOSITE"
        ),
        true
      )
    : unknown;

  const clothingTransferMatch =
    input.operation === "CLOTHING_TRANSFER"
      ? failOrWarn(input.plan.actualRoute !== "TEXT_TO_IMAGE", true)
      : unknown;

  const locationMatch =
    input.operation === "LOCATION_TRANSFER" || input.operation === "BACKGROUND_REPLACE"
      ? failOrWarn(input.plan.actualRoute !== "TEXT_TO_IMAGE", true)
      : unknown;

  const negativeTransferViolation =
    input.plan.protectionLost.some((p) => p.toLowerCase().includes("identity"))
      ? "WARN"
      : input.providerSucceeded
        ? "UNKNOWN"
        : "FAIL";

  const protectedRegionStability =
    input.maskStatus === "MASK_VALID"
      ? "PASS"
      : input.maskStatus === "MASK_LOW_CONFIDENCE"
        ? "WARN"
        : input.plan.actualRoute === "TEXT_TO_IMAGE"
          ? "WARN"
          : "UNKNOWN";

  const requestedChangeMatch = failOrWarn(input.plan.actualRoute !== null, true);
  const compositionStability = failOrWarn(usedBase, true);

  const bandByDim: Record<string, TransformQaBand> = {
    requestedChangeMatch,
    identityPreservation,
    secondaryIdentityPreservation,
    productPreservation,
    logoPreservation,
    locationMatch,
    clothingTransferMatch,
    protectedRegionStability,
    negativeTransferViolation,
    compositionStability,
  };

  const checked = dims.map((d) => bandByDim[d] ?? unknown);
  const overall = overallFrom(checked);

  let recommendedEscalation: TransformQaEscalation = "NONE";
  if (overall === "FAIL" || overall === "WARN") {
    if (input.hasLogoMustPreserve && logoPreservation !== "PASS") {
      recommendedEscalation = "PIXEL_COMPOSITE";
    } else if (input.hasProductMustPreserve && productPreservation !== "PASS") {
      recommendedEscalation = "PIXEL_COMPOSITE";
    } else if (input.maskStatus === "MASK_UNAVAILABLE" || input.maskStatus === "MASK_INVALID") {
      recommendedEscalation = "USE_MASK";
    } else if (input.plan.actualRoute === "TEXT_TO_IMAGE") {
      recommendedEscalation = "FORCE_BASE_EDIT";
    } else if (input.plan.protectionLost.includes("MUST_PRESERVE_OVER_PROVIDER_BUDGET")) {
      recommendedEscalation = "REDUCE_REFERENCES";
    } else if ((input.identityCount ?? 1) > 1) {
      recommendedEscalation = "RAISE_IDENTITY_PRIORITY";
    } else {
      recommendedEscalation = "MANUAL_REVIEW";
    }
  }

  return {
    operation: input.operation,
    requestedChangeMatch,
    identityPreservation,
    secondaryIdentityPreservation,
    productPreservation,
    logoPreservation,
    locationMatch,
    clothingTransferMatch,
    protectedRegionStability,
    negativeTransferViolation,
    compositionStability,
    overall,
    recommendedEscalation,
    checkedDimensions: dims,
  };
}

/** Legacy clothing QA shape adapter for existing callers. */
export function toLegacyClothingQa(qa: TransformQaResult): {
  identityPreservation: TransformQaBand;
  requestedTransfer: TransformQaBand;
  protectionIntegrity: TransformQaBand;
  negativeTransferLeak: TransformQaBand;
  maskIntegrity: TransformQaBand;
} {
  return {
    identityPreservation: qa.identityPreservation,
    requestedTransfer: qa.requestedChangeMatch,
    protectionIntegrity: qa.protectedRegionStability === "PASS" ? "PASS" : qa.overall,
    negativeTransferLeak: qa.negativeTransferViolation,
    maskIntegrity: qa.protectedRegionStability,
  };
}
