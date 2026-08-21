/**
 * S2B.4 — Operation-aware reference collision priorities + provider-aligned budgeting.
 * COMPOSITE_REFERENCE_BOARD_NOT_REQUIRED unless must-keep refs exceed PROVIDER_MAX_ADDITIONAL_REFERENCES.
 */

import type {
  ImageTransformationAsset,
  ImageTransformationIntent,
  ImageTransformationOperation,
  ImageTransformationRole,
} from "@/types/studio-image-transformation";

/** OpenAI still/edit path additional-image hard cap used by Studio adapters. */
export const PROVIDER_MAX_ADDITIONAL_REFERENCES = 4;

/** Explicit architecture decision for S2B.4. */
export const COMPOSITE_REFERENCE_BOARD_DECISION = "COMPOSITE_REFERENCE_BOARD_NOT_REQUIRED" as const;

export type ReferenceCollisionFamily =
  | "CHARACTER_STORY"
  | "COMMERCIAL_HERO"
  | "CLOTHING_TRANSFER"
  | "LOCATION_TRANSFER"
  | "MULTI_CHARACTER"
  | "DEFAULT";

export function collisionFamilyForOperation(
  operation: ImageTransformationOperation
): ReferenceCollisionFamily {
  switch (operation) {
    case "CLOTHING_TRANSFER":
      return "CLOTHING_TRANSFER";
    case "LOCATION_TRANSFER":
    case "BACKGROUND_REPLACE":
      return "LOCATION_TRANSFER";
    case "PRODUCT_PRESERVE":
    case "LOGO_PRESERVE":
      return "COMMERCIAL_HERO";
    case "MULTI_CHARACTER_COMPOSITION":
      return "MULTI_CHARACTER";
    case "SCENE_RERENDER":
    case "EXPRESSION_CHANGE":
    case "CAMERA_REFRAME":
    case "POSE_CHANGE":
    case "HAIR_CHANGE":
    case "IDENTITY_PRESERVING_EDIT":
      return "CHARACTER_STORY";
    default:
      return "DEFAULT";
  }
}

const COLLISION_PRIORITY: Record<ReferenceCollisionFamily, ImageTransformationRole[]> = {
  CHARACTER_STORY: [
    "IDENTITY_REFERENCE",
    "FACE_REFERENCE",
    "CLOTHING_REFERENCE",
    "LOCATION_REFERENCE",
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "OBJECT_REFERENCE",
    "STYLE_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
    "BODY_REFERENCE",
  ],
  COMMERCIAL_HERO: [
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "IDENTITY_REFERENCE",
    "LOCATION_REFERENCE",
    "STYLE_REFERENCE",
    "OBJECT_REFERENCE",
    "CLOTHING_REFERENCE",
    "FACE_REFERENCE",
    "BODY_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
  ],
  CLOTHING_TRANSFER: [
    "CLOTHING_REFERENCE",
    "IDENTITY_REFERENCE",
    "FACE_REFERENCE",
    "LOCATION_REFERENCE",
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "STYLE_REFERENCE",
    "OBJECT_REFERENCE",
    "BODY_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
  ],
  LOCATION_TRANSFER: [
    "LOCATION_REFERENCE",
    "IDENTITY_REFERENCE",
    "FACE_REFERENCE",
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "CLOTHING_REFERENCE",
    "STYLE_REFERENCE",
    "OBJECT_REFERENCE",
    "BODY_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
  ],
  MULTI_CHARACTER: [
    "IDENTITY_REFERENCE",
    "FACE_REFERENCE",
    "BODY_REFERENCE",
    "CLOTHING_REFERENCE",
    "LOCATION_REFERENCE",
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "STYLE_REFERENCE",
    "OBJECT_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
  ],
  DEFAULT: [
    "IDENTITY_REFERENCE",
    "CLOTHING_REFERENCE",
    "LOCATION_REFERENCE",
    "PRODUCT_REFERENCE",
    "LOGO_REFERENCE",
    "STYLE_REFERENCE",
    "OBJECT_REFERENCE",
    "FACE_REFERENCE",
    "BODY_REFERENCE",
    "POSE_REFERENCE",
    "COMPOSITION_REFERENCE",
  ],
};

export function roleCollisionPriority(
  operation: ImageTransformationOperation,
  role: ImageTransformationRole
): number {
  const order = COLLISION_PRIORITY[collisionFamilyForOperation(operation)];
  const idx = order.indexOf(role);
  return idx === -1 ? 80 : idx;
}

export function isMustKeepReference(ref: ImageTransformationAsset): boolean {
  return Boolean(ref.required || ref.exactness === "MUST_PRESERVE");
}

export type ReferenceBudgetResult = {
  kept: ImageTransformationAsset[];
  dropped: ImageTransformationAsset[];
  compositeRecommended: boolean;
  overBudgetMustKeep: boolean;
  max: number;
  collisionFamily: ReferenceCollisionFamily;
  protectionLost: string[];
};

/**
 * Rank + budget references for THIS operation.
 * MUST_PRESERVE / required are never silently dropped — overspill is traced.
 */
export function budgetReferencesForOperation(
  intent: ImageTransformationIntent,
  max = PROVIDER_MAX_ADDITIONAL_REFERENCES
): ReferenceBudgetResult {
  const family = collisionFamilyForOperation(intent.operation);
  const refs = [...intent.references];
  const protectionLost: string[] = [];

  if (max <= 0) {
    const required = refs.filter(isMustKeepReference);
    return {
      kept: required,
      dropped: refs.filter((r) => !required.includes(r)),
      compositeRecommended: refs.length > 0,
      overBudgetMustKeep: required.length > 0,
      max,
      collisionFamily: family,
      protectionLost: required.length
        ? ["REFERENCE_BUDGET_ZERO_PROVIDER_LIMIT"]
        : [],
    };
  }

  const ranked = refs
    .map((ref, index) => ({ ref, index }))
    .sort((a, b) => {
      const mustDelta = Number(isMustKeepReference(b.ref)) - Number(isMustKeepReference(a.ref));
      if (mustDelta !== 0) {
        return mustDelta;
      }
      const p =
        roleCollisionPriority(intent.operation, a.ref.role) -
        roleCollisionPriority(intent.operation, b.ref.role);
      if (p !== 0) {
        return p;
      }
      // Prefer earlier identity refs (Character A before B) for stable association.
      if (a.ref.role === "IDENTITY_REFERENCE" && b.ref.role === "IDENTITY_REFERENCE") {
        return a.index - b.index;
      }
      return a.index - b.index;
    })
    .map((row) => row.ref);

  const kept: ImageTransformationAsset[] = [];
  const dropped: ImageTransformationAsset[] = [];
  let identityKept = 0;

  for (const ref of ranked) {
    const firstIdentity =
      ref.role === "IDENTITY_REFERENCE" && identityKept === 0;
    const mustKeep = isMustKeepReference(ref) || firstIdentity;
    if (kept.length < max) {
      kept.push(ref);
      if (ref.role === "IDENTITY_REFERENCE") {
        identityKept += 1;
      }
      continue;
    }
    if (mustKeep) {
      kept.push(ref);
      if (ref.role === "IDENTITY_REFERENCE") {
        identityKept += 1;
      }
      continue;
    }
    dropped.push(ref);
  }

  const overBudgetMustKeep = kept.length > max;
  if (overBudgetMustKeep) {
    protectionLost.push("MUST_PRESERVE_OVER_PROVIDER_BUDGET");
  }
  if (dropped.some((d) => d.role === "STYLE_REFERENCE" || d.role === "OBJECT_REFERENCE")) {
    protectionLost.push("SOFT_REFERENCE_DROPPED");
  }

  return {
    kept,
    dropped,
    compositeRecommended: overBudgetMustKeep,
    overBudgetMustKeep,
    max,
    collisionFamily: family,
    protectionLost,
  };
}

export function applyBudgetToIntent(
  intent: ImageTransformationIntent,
  max = PROVIDER_MAX_ADDITIONAL_REFERENCES
): {
  intent: ImageTransformationIntent;
  budget: ReferenceBudgetResult;
} {
  const budget = budgetReferencesForOperation(intent, max);
  return {
    intent: {
      ...intent,
      references: budget.kept,
    },
    budget,
  };
}
