import type {
  MotionUploadedReference,
  MotionVisualRequirementId,
} from "@/types/motion-preset-engine";

function isPortrait(width?: number, height?: number): boolean {
  if (!width || !height) {
    return true;
  }
  return height >= width * 1.05;
}

function isFullBodyPortrait(width?: number, height?: number): boolean {
  return isPortrait(width, height) && (height ?? 0) >= 800;
}

function assetLooksMascot(ref: MotionUploadedReference): boolean {
  const name = `${ref.assetName ?? ""} ${ref.fileName ?? ""}`.toLowerCase();
  return /mascot|mascotte|globe.?man|chef|brand character/.test(name) || ref.role === "primary_identity" && ref.assetType === "mascot";
}

function assetLooksProduct(ref: MotionUploadedReference): boolean {
  const name = `${ref.assetName ?? ""} ${ref.fileName ?? ""}`.toLowerCase();
  return /product|packaging|logo|brand|item|box/.test(name) || ref.role === "product";
}

function assetLooksLogo(ref: MotionUploadedReference): boolean {
  const name = `${ref.assetName ?? ""} ${ref.fileName ?? ""}`.toLowerCase();
  return /\blogo\b|brand mark|emblem/.test(name) || ref.role === "brand";
}

export function evaluateVisualRequirement(
  requirementId: MotionVisualRequirementId,
  references: MotionUploadedReference[]
): boolean {
  if (references.length === 0) {
    return false;
  }
  const primary = references[0]!;
  switch (requirementId) {
    case "face_visible":
      return references.length > 0;
    case "upper_body_visible":
      return references.length > 0;
    case "full_body_visible":
      return references.some((r) => isFullBodyPortrait(r.width, r.height)) || primary.motionReady === true;
    case "legs_visible":
      return references.some((r) => isFullBodyPortrait(r.width, r.height)) || primary.motionReady === true;
    case "shoes_visible":
      return references.some((r) => isFullBodyPortrait(r.width, r.height)) || primary.motionReady === true;
    case "standing_pose":
      return references.length > 0;
    case "product_reference":
      return references.some(assetLooksProduct);
    case "mascot_reference":
      return references.some(assetLooksMascot);
    case "logo_reference":
      return references.some(assetLooksLogo);
    default:
      return false;
  }
}

export function referencesFromUploadCount(input: {
  references: MotionUploadedReference[];
}): MotionUploadedReference[] {
  return input.references.map((ref, index) => ({
    ...ref,
    role:
      ref.role ??
      (index === 0 ? "primary_identity"
      : index === 1 ? "secondary_identity"
      : "environment"),
  }));
}
