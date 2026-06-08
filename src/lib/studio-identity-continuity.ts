import { formatSceneSemanticRecipeForMotion } from "@/lib/build-scene-semantic-recipe";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { SceneSemanticRecipe } from "@/types/studio-scene-semantic-recipe";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export type IdentityContinuityStage =
  | "asset_save"
  | "asset_library"
  | "storyboard"
  | "director"
  | "scene_generation"
  | "motion_handoff"
  | "motion_execution"
  | "render";

export type IdentityContinuityGap = {
  field: string;
  stage: IdentityContinuityStage;
  severity: "warning" | "critical";
  message: string;
};

export type SemanticContinuityScore = {
  assetUnderstanding: number;
  identityPreservation: number;
  brandPreservation: number;
  crossAssetUnderstanding: number;
  storyboardContinuity: number;
  directorContinuity: number;
  motionContinuity: number;
  renderContinuity: number;
  overallSemanticContinuity: number;
};

/** Baseline scores before semantic persistence + image-to-image sprints (documented reference). */
export const SEMANTIC_CONTINUITY_BASELINE_BEFORE_SPRINT = {
  assetUnderstanding: 35,
  identityPreservation: 30,
  brandPreservation: 25,
  crossAssetUnderstanding: 20,
  storyboardContinuity: 40,
  directorContinuity: 35,
  motionContinuity: 45,
  renderContinuity: 30,
  overallSemanticContinuity: 33,
} as const;

/** Scores after semantic persistence sprint (prompt-only identity). */
export const SEMANTIC_CONTINUITY_AFTER_SEMANTIC_SPRINT = {
  assetUnderstanding: 72,
  identityPreservation: 58,
  brandPreservation: 65,
  crossAssetUnderstanding: 55,
  storyboardContinuity: 68,
  directorContinuity: 52,
  motionContinuity: 78,
  renderContinuity: 48,
  overallSemanticContinuity: 62,
} as const;

const CORE_IDENTITY_FIELDS = [
  "brandIdentity",
  "assetFamily",
  "identityFingerprint",
] as const;

function scorePresence(present: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((present / total) * 100);
}

export function auditAssetSemanticRecord(
  record: AssetSemanticRecord | null | undefined,
  stage: IdentityContinuityStage = "asset_save"
): IdentityContinuityGap[] {
  const gaps: IdentityContinuityGap[] = [];
  if (!record) {
    gaps.push({
      field: "semanticRecord",
      stage,
      severity: "critical",
      message: "No semantic record persisted — identity will degrade to generic prompts.",
    });
    return gaps;
  }
  if (!record.brandIdentity?.trim()) {
    gaps.push({
      field: "brandIdentity",
      stage,
      severity: "warning",
      message: "Brand identity missing from semantic record.",
    });
  }
  if (!record.assetFamily?.trim()) {
    gaps.push({
      field: "assetFamily",
      stage,
      severity: "warning",
      message: "Asset family missing — derived variants may not stay grouped.",
    });
  }
  if (!record.identityFingerprint?.fingerprintHash && !record.identityFingerprint?.faceStructure) {
    gaps.push({
      field: "identityFingerprint",
      stage,
      severity: "warning",
      message: "Identity fingerprint missing — motion may treat asset as generic.",
    });
  }
  if (
    record.sourceReferenceName &&
    !record.derivedFromAssetId &&
    !record.parentAssetId
  ) {
    gaps.push({
      field: "lineage",
      stage,
      severity: "warning",
      message: `Source "${record.sourceReferenceName}" has no linked parent asset id.`,
    });
  }
  return gaps;
}

export function auditSceneSemanticRecipe(
  recipe: SceneSemanticRecipe | null | undefined,
  stage: IdentityContinuityStage = "motion_handoff"
): IdentityContinuityGap[] {
  const gaps: IdentityContinuityGap[] = [];
  if (!recipe) {
    gaps.push({
      field: "semanticRecipe",
      stage,
      severity: "critical",
      message: "Scene semantic recipe missing — Motion falls back to generic character/scene prompts.",
    });
    return gaps;
  }
  if (!recipe.brandIdentity?.trim() && !recipe.characters.some((c) => c.brandIdentity?.trim())) {
    gaps.push({
      field: "brandIdentity",
      stage,
      severity: "warning",
      message: "No brand identity in scene semantic recipe.",
    });
  }
  if (!recipe.assetFamily?.trim() && !recipe.characters.some((c) => c.assetFamily?.trim())) {
    gaps.push({
      field: "assetFamily",
      stage,
      severity: "warning",
      message: "No asset family in scene semantic recipe.",
    });
  }
  if (
    !recipe.identityFingerprintSummary?.trim() &&
    !recipe.characters.some((c) => c.identityFingerprintSummary?.trim())
  ) {
    gaps.push({
      field: "identityFingerprint",
      stage,
      severity: "warning",
      message: "No identity fingerprint summary in scene semantic recipe.",
    });
  }
  return gaps;
}

export function formatSemanticIdentityRulesForExecution(
  recipe: SceneSemanticRecipe | null | undefined
): string {
  if (!recipe) {
    return "";
  }
  return formatSceneSemanticRecipeForMotion(recipe);
}

export function computeSemanticContinuityScore(params: {
  semanticRecords: Array<AssetSemanticRecord | null | undefined>;
  handoff?: MotionHandoffPayload | null;
  hasDirectorSemanticLabels?: boolean;
  hasSceneSemanticPromptLines?: boolean;
}): SemanticContinuityScore {
  const records = params.semanticRecords.filter(Boolean) as AssetSemanticRecord[];
  const recordCount = params.semanticRecords.length || 1;

  const assetUnderstanding = scorePresence(
    records.filter((r) => r.visionSummary || r.objectType).length,
    recordCount
  );
  const identityPreservation = scorePresence(
    records.filter((r) => r.identityFingerprint?.fingerprintHash || r.identityFingerprint?.faceStructure)
      .length,
    recordCount
  );
  const brandPreservation = scorePresence(
    records.filter((r) => r.brandIdentity?.trim()).length,
    recordCount
  );
  const crossAssetUnderstanding = scorePresence(
    records.filter((r) => r.assetFamily?.trim()).length,
    recordCount
  );

  const recipes = (params.handoff?.scenes ?? [])
    .map((s) => s.semanticRecipe)
    .filter(Boolean) as SceneSemanticRecipe[];

  const storyboardContinuity =
    recipes.length === 0
      ? Math.round((assetUnderstanding + brandPreservation) / 2)
      : scorePresence(
          recipes.filter((r) => r.characters.some((c) => c.brandIdentity || c.assetFamily)).length,
          recipes.length
        );

  const directorContinuity = params.hasDirectorSemanticLabels
    ? Math.min(100, brandPreservation + 15)
    : Math.round(brandPreservation * 0.75);

  const motionContinuity =
    recipes.length === 0
      ? 40
      : scorePresence(
          recipes.filter(
            (r) =>
              r.brandIdentity ||
              r.assetFamily ||
              r.identityFingerprintSummary ||
              r.characters.some((c) => c.identityFingerprintSummary)
          ).length,
          recipes.length
        );

  const renderContinuity =
    params.handoff && params.handoff.version >= 26 && recipes.length > 0
      ? Math.round((motionContinuity + identityPreservation) / 2)
      : Math.round(renderContinuityFallback(params.handoff));

  const sceneGenerationBoost = params.hasSceneSemanticPromptLines ? 12 : 0;

  const overallSemanticContinuity = Math.round(
    (assetUnderstanding * 0.15 +
      identityPreservation * 0.2 +
      brandPreservation * 0.15 +
      crossAssetUnderstanding * 0.1 +
      storyboardContinuity * 0.1 +
      directorContinuity * 0.1 +
      motionContinuity * 0.15 +
      renderContinuity * 0.05 +
      sceneGenerationBoost) /
      (sceneGenerationBoost > 0 ? 1.05 : 1)
  );

  return {
    assetUnderstanding,
    identityPreservation,
    brandPreservation,
    crossAssetUnderstanding,
    storyboardContinuity,
    directorContinuity,
    motionContinuity,
    renderContinuity,
    overallSemanticContinuity: Math.min(100, overallSemanticContinuity),
  };
}

function renderContinuityFallback(handoff: MotionHandoffPayload | null | undefined): number {
  if (!handoff) {
    return 25;
  }
  if (handoff.version >= 26) {
    return 55;
  }
  return 35;
}

export function collectHandoffIdentityGaps(handoff: MotionHandoffPayload): IdentityContinuityGap[] {
  const gaps: IdentityContinuityGap[] = [];
  for (const scene of handoff.scenes) {
    gaps.push(...auditSceneSemanticRecipe(scene.semanticRecipe, "motion_handoff"));
  }
  if (handoff.version < 26) {
    gaps.push({
      field: "semanticRecipe",
      stage: "motion_handoff",
      severity: "critical",
      message: `Handoff v${handoff.version} predates semantic recipe bridge — upgrade to v26.`,
    });
  }
  return dedupeGaps(gaps);
}

function dedupeGaps(gaps: IdentityContinuityGap[]): IdentityContinuityGap[] {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = `${gap.stage}:${gap.field}:${gap.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function hasCoreIdentityFields(record: AssetSemanticRecord | null | undefined): boolean {
  if (!record) {
    return false;
  }
  return CORE_IDENTITY_FIELDS.every((field) => {
    if (field === "identityFingerprint") {
      return Boolean(
        record.identityFingerprint?.fingerprintHash || record.identityFingerprint?.faceStructure
      );
    }
    return Boolean(record[field as "brandIdentity" | "assetFamily"]?.trim());
  });
}
