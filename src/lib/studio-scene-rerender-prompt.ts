/**
 * S2B.3 — Delta-first scene rerender / location transfer prompt policy.
 */

import type {
  ImageTransformationIntent,
  ImageTransformationOperation,
  TransformationPlan,
} from "@/types/studio-image-transformation";

function editGoalFor(operation: ImageTransformationOperation, changeTargets: string[]): string {
  const delta = changeTargets.join(", ") || "scene.delta";
  switch (operation) {
    case "EXPRESSION_CHANGE":
      return `Edit only the expression on the approved base scene still (${delta}). Keep the same person, clothing, location, and composition.`;
    case "LOCATION_TRANSFER":
    case "BACKGROUND_REPLACE":
      return `Replace only the location/background of the approved base still using the location reference when provided (${delta}). Keep people, wardrobe, products, and logos unchanged.`;
    case "CAMERA_REFRAME":
      return `Apply a modest camera/framing change to the approved base still (${delta}). Do not invent a new scene or identity.`;
    case "POSE_CHANGE":
      return `Adjust pose on the approved base still (${delta}). Preserve identity and wardrobe; expect higher drift risk.`;
    case "CLOTHING_TRANSFER":
      return `Update clothing on the approved base still (${delta}) while preserving identity and location.`;
    case "OBJECT_TRANSFER":
      return `Apply the requested object change on the approved base still (${delta}). Preserve identity, location, and unrelated products/logos.`;
    default:
      return `Apply only the requested scene delta (${delta}) to the approved base still. Prefer baseline + delta over a fresh generation.`;
  }
}

export function buildSceneRerenderTransformationPrompt(input: {
  intent: ImageTransformationIntent;
  plan: TransformationPlan;
  productionPrompt?: string | null;
}): string {
  const locationRule = input.intent.negativeTransferRules.find(
    (r) => r.referenceRole === "LOCATION_REFERENCE"
  );
  const doNotFromLocation = locationRule?.doNotTransfer ?? [
    "people",
    "transient objects",
    "unrelated products",
    "text/signage",
    "reference identity",
  ];

  const lines = [
    "EDIT GOAL:",
    editGoalFor(input.intent.operation, input.intent.changeTargets),
    "",
    "BASE:",
    "- The first image is the approved scene still. Treat it as the visual baseline.",
    "",
    "PRESERVE:",
    ...input.intent.protectedTargets
      .filter((r) => r.level === "MUST_PRESERVE" || r.level === "SHOULD_PRESERVE")
      .map((r) => `- Keep ${r.property} (${r.level.replace(/_/g, " ").toLowerCase()}).`),
    "- Keep character identity, wardrobe continuity, products, and logos unless the delta explicitly changes them.",
    "",
    "TRANSFER:",
    `- Change only: ${input.intent.changeTargets.join(", ") || "scene.delta"}.`,
  ];

  if (input.intent.references.some((r) => r.role === "LOCATION_REFERENCE")) {
    lines.push(
      "",
      "LOCATION REFERENCE:",
      "- Use the location reference for environment, architecture, and lighting only.",
      "DO NOT IMPORT FROM LOCATION REFERENCE:",
      `- Do not copy ${doNotFromLocation.join(", ")}.`
    );
  }

  lines.push(
    "",
    "Do not regenerate the scene from text alone when the approved still is provided.",
    `Route: ${input.plan.actualRoute ?? input.plan.requestedRoute}.`
  );

  const identities = input.intent.references
    .filter((r) => r.role === "IDENTITY_REFERENCE")
    .map((r, index) => ({
      assetId: r.assetId,
      name: r.sourceEntityId ?? r.sourceSlotId ?? null,
      index,
    }));
  if (identities.length >= 2) {
    lines.push(
      "",
      "MULTI-CHARACTER IDENTITY ASSOCIATION:",
      "Each identity reference is a distinct person. Do not blend faces or swap identities."
    );
    for (const id of identities) {
      const label = id.name?.trim() || `Character ${String.fromCharCode(65 + id.index)}`;
      lines.push(
        `- Identity reference ${id.index + 1} (${id.assetId}) = ${label}. Preserve ${label} only for that person.`
      );
    }
    lines.push('Do not treat references as "people for inspiration."');
  }

  const production = input.productionPrompt?.trim();
  if (production) {
    return `${lines.join("\n")}\n\nSCENE CONTEXT\n${production}`;
  }
  return lines.join("\n");
}

export function scenePromptContainsLocationNegativeTransfer(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    lower.includes("do not import from location") ||
    (lower.includes("do not copy") && lower.includes("people"))
  );
}

export function scenePromptPreservesApprovedBase(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes("approved") && (lower.includes("baseline") || lower.includes("base still"));
}
