import type {
  MotionMultiReferenceIntelligence,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";

function roleForReference(
  ref: MotionUploadedReference,
  index: number
): MotionUploadedReference["role"] {
  if (ref.role) {
    return ref.role;
  }
  const name = `${ref.assetName ?? ""} ${ref.fileName ?? ""}`.toLowerCase();
  if (/product|packaging|box|item/.test(name)) {
    return "product";
  }
  if (/logo|brand/.test(name)) {
    return "brand";
  }
  if (/outfit|clothing|jersey|shirt/.test(name)) {
    return "outfit";
  }
  if (/background|location|scene|environment/.test(name)) {
    return "environment";
  }
  if (index === 0) {
    return "primary_identity";
  }
  if (index === 1) {
    return "secondary_identity";
  }
  return "style";
}

export function resolveMotionMultiReferenceIntelligence(
  references: MotionUploadedReference[]
): MotionMultiReferenceIntelligence {
  const enriched = references.map((ref, index) => ({
    ...ref,
    role: roleForReference(ref, index),
  }));

  const findId = (role: MotionUploadedReference["role"]) =>
    enriched.find((r) => r.role === role)?.id ?? null;

  const primary = findId("primary_identity") ?? enriched[0]?.id ?? null;
  const secondary = findId("secondary_identity");
  const conflicts: string[] = [];

  const identityRefs = enriched.filter(
    (r) => r.role === "primary_identity" || r.role === "secondary_identity"
  );
  let referenceConflictScore = 0;
  if (identityRefs.length > 1) {
    const names = identityRefs.map((r) => (r.assetName ?? r.fileName ?? "").toLowerCase());
    const unique = new Set(names.filter(Boolean));
    if (unique.size > 1) {
      referenceConflictScore = 35;
      conflicts.push("multiple_identity_references");
    }
  }

  const identityConfidence = Math.max(
    20,
    Math.min(100, 55 + enriched.length * 8 - referenceConflictScore)
  );
  const analysisComplexity =
    enriched.length >= 4 || referenceConflictScore > 0
      ? "high"
      : enriched.length >= 2
        ? "medium"
        : "low";

  return {
    referenceCount: enriched.length,
    primaryIdentityReferenceId: primary,
    secondaryIdentityReferenceId: secondary,
    outfitReferenceId: findId("outfit"),
    brandReferenceId: findId("brand"),
    environmentReferenceId: findId("environment"),
    productReferenceId: findId("product"),
    identityConfidence,
    referenceConflictScore,
    analysisComplexity,
    conflicts,
  };
}
