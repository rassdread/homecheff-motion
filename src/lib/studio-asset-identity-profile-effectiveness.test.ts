import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSceneSemanticRecipeForMotion } from "@/lib/build-scene-semantic-recipe";
import {
  IDENTITY_PROFILE_CONFIGS,
  buildIdentityProfileDraftPatch,
  buildIdentityProfileRules,
  formatCreativityWeightPercent,
  formatIdentityWeightPercent,
  resolveIdentityImportanceLabel,
  resolveIdentityProfileMotionGuidance,
  resolveVariantFidelityThresholdsForProfile,
  rulesToCommaSeparated,
} from "@/lib/studio-asset-identity-profile";
import {
  buildSourceTransformEnforcementPrompt,
  resolveVariantFidelityRecoveryTier,
} from "@/lib/studio-asset-identity-preservation";
import {
  buildAssetSemanticGenerationContext,
  buildAssetSemanticGenerationInputFromDraft,
} from "@/lib/studio-asset-semantic-generation-context";
import {
  buildAssetSemanticRecordFromWizardDraft,
  buildSemanticContinuitySnapshot,
} from "@/lib/studio-asset-semantic-record";
import { buildStudioRenderAuditMetadata } from "@/lib/studio-project-metadata";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import { IDENTITY_PROFILE_LEVELS, type IdentityProfileLevel } from "@/types/studio-asset-identity-profile";
import type { SceneSemanticRecipe } from "@/types/studio-scene-semantic-recipe";

const SHARED_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Mascot",
    visualStyle: "Flat cartoon",
    brandIdentity: "HomeCheff Globe Mascot",
    assetFamily: "HomeCheff Mascots",
    suggestedPreserve: ["globe face", "green chef hat"],
    suggestedChange: ["outfit"],
    suggestedForbidden: ["style break"],
    confidence: 0.92,
  },
  { sourceName: "Globe Man" }
);

function buildDraftForProfile(level: IdentityProfileLevel) {
  let draft = emptyAssetWizardDraft("character", "image_only");
  draft = {
    ...draft,
    ...recordWizardSourceReference({
      imageUrl: "https://example.com/globe.png",
      storageKey: "globe",
      name: "Globe Man",
    }),
    sourceVisionAnalysis: SHARED_VISION,
    sourceVisionAnalysisStatus: "ready",
    identityProfileConfirmed: true,
    ...buildIdentityProfileDraftPatch(draft, {
      assetType: "mascot",
      profileLevel: level,
      confirmed: true,
    }),
  };
  return draft;
}

type ProfilePipelineSnapshot = {
  level: IdentityProfileLevel;
  preserve: string;
  change: string;
  forbidden: string;
  identityWeight: number;
  creativityWeight: number;
  importance: string;
  fidelityThresholds: ReturnType<typeof resolveVariantFidelityThresholdsForProfile>;
  recoveryAt75: ReturnType<typeof resolveVariantFidelityRecoveryTier>;
  semanticContext: string;
  enforcementPrompt: string;
  motionText: string;
  recordProfile: string | undefined;
  recordType: string | undefined;
};

function snapshotProfilePipeline(level: IdentityProfileLevel): ProfilePipelineSnapshot {
  const draft = buildDraftForProfile(level);
  const rules = buildIdentityProfileRules({
    assetType: "mascot",
    profileLevel: level,
    vision: SHARED_VISION,
  });
  const text = rulesToCommaSeparated(rules);
  const record = buildAssetSemanticRecordFromWizardDraft(draft);
  const semanticContext = buildAssetSemanticGenerationContext(
    buildAssetSemanticGenerationInputFromDraft(draft)
  );
  const enforcementPrompt = buildSourceTransformEnforcementPrompt({
    sourceName: "Globe Man",
    variantLabel: "Chef",
    vision: SHARED_VISION,
    preserveRules: text.preserve,
    changeRules: text.change,
    forbiddenRules: text.forbidden,
    semanticContext,
    identityProfileLevel: level,
  });
  const recipe: SceneSemanticRecipe = {
    version: 1,
    recipeId: `recipe-${level}`,
    sceneId: "scene-1",
    characters: [
      {
        assetId: "char-1",
        kind: "character",
        name: "Globe Man",
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        preserveRules: record?.preserveRules,
        identityProfile: level,
        identityImportance: resolveIdentityImportanceLabel(level),
      },
    ],
    props: [],
    brandIdentity: "HomeCheff Globe Mascot",
    assetFamily: "HomeCheff Mascots",
    preserveRules: record?.preserveRules,
  };

  return {
    level,
    preserve: text.preserve,
    change: text.change,
    forbidden: text.forbidden,
    identityWeight: formatIdentityWeightPercent(level),
    creativityWeight: formatCreativityWeightPercent(level),
    importance: resolveIdentityImportanceLabel(level),
    fidelityThresholds: resolveVariantFidelityThresholdsForProfile(level),
    recoveryAt75: resolveVariantFidelityRecoveryTier(75, level),
    semanticContext,
    enforcementPrompt,
    motionText: formatSceneSemanticRecipeForMotion(recipe),
    recordProfile: record?.identityProfile,
    recordType: record?.identityAssetType,
  };
}

function uniqueValues<T>(items: T[]): number {
  return new Set(items).size;
}

describe("identity profile effectiveness — same source, five profiles", () => {
  const snapshots = IDENTITY_PROFILE_LEVELS.map(snapshotProfilePipeline);

  it("produces distinct preserve rules across all profile levels", () => {
    assert.equal(uniqueValues(snapshots.map((s) => s.preserve)), IDENTITY_PROFILE_LEVELS.length);
  });

  it("produces distinct forbidden rules across all profile levels", () => {
    assert.equal(uniqueValues(snapshots.map((s) => s.forbidden)), IDENTITY_PROFILE_LEVELS.length);
  });

  it("produces distinct identity weighting across all profile levels", () => {
    assert.equal(uniqueValues(snapshots.map((s) => s.identityWeight)), IDENTITY_PROFILE_LEVELS.length);
  });

  it("produces distinct fidelity thresholds for relaxed/balanced/brand_lock/master_character", () => {
    const relaxed = snapshots.find((s) => s.level === "relaxed")!;
    const balanced = snapshots.find((s) => s.level === "balanced")!;
    const brandLock = snapshots.find((s) => s.level === "brand_lock")!;
    const master = snapshots.find((s) => s.level === "master_character")!;
    assert.notDeepEqual(relaxed.fidelityThresholds, balanced.fidelityThresholds);
    assert.notDeepEqual(balanced.fidelityThresholds, brandLock.fidelityThresholds);
    assert.notDeepEqual(brandLock.fidelityThresholds, master.fidelityThresholds);
  });

  it("strict profile uses stricter recovery tier than relaxed at score 75", () => {
    const relaxed = snapshots.find((s) => s.level === "relaxed")!;
    const strict = snapshots.find((s) => s.level === "strict")!;
    assert.equal(relaxed.recoveryAt75, "ok");
    assert.equal(strict.recoveryAt75, "warning");
  });

  it("master_character uses stricter recovery tier than brand_lock at score 88", () => {
    assert.equal(resolveVariantFidelityRecoveryTier(88, "brand_lock"), "ok");
    assert.equal(resolveVariantFidelityRecoveryTier(88, "master_character"), "warning");
  });

  it("produces distinct motion guidance text per profile", () => {
    const guidance = IDENTITY_PROFILE_LEVELS.map((level) => resolveIdentityProfileMotionGuidance(level));
    assert.equal(uniqueValues(guidance), IDENTITY_PROFILE_LEVELS.length);
    for (const snap of snapshots) {
      assert.match(snap.motionText, /Identity profile/);
      assert.match(snap.motionText, /Profile guidance/);
      assert.ok(snap.motionText.includes(resolveIdentityProfileMotionGuidance(snap.level)));
    }
  });

  it("produces distinct enforcement prompts per profile", () => {
    assert.equal(uniqueValues(snapshots.map((s) => s.enforcementPrompt)), IDENTITY_PROFILE_LEVELS.length);
    for (const snap of snapshots) {
      assert.match(snap.enforcementPrompt, /Identity profile:/);
    }
  });

  it("persists profile and type on semantic record", () => {
    for (const snap of snapshots) {
      assert.equal(snap.recordProfile, snap.level);
      assert.equal(snap.recordType, "mascot");
    }
  });

  it("semantic context includes profile-specific fields", () => {
    for (const snap of snapshots) {
      assert.match(snap.semanticContext, /Asset type: mascot/);
      assert.match(snap.semanticContext, new RegExp(`Identity profile: ${snap.level}`));
      assert.match(snap.semanticContext, new RegExp(`Identity importance: ${snap.importance}`));
    }
  });

  it("library snapshot exposes profile fields", () => {
    for (const snap of snapshots) {
      const draft = buildDraftForProfile(snap.level);
      const record = buildAssetSemanticRecordFromWizardDraft(draft);
      const library = buildSemanticContinuitySnapshot(record);
      assert.equal(library?.identityProfile, snap.level);
      assert.equal(library?.identityAssetType, "mascot");
      assert.equal(library?.identityImportance, snap.importance);
    }
  });

  it("render audit collects distinct identity profiles from handoff", () => {
    const audit = buildStudioRenderAuditMetadata({
      studioSourceStoryboardId: "sb-1",
      studioHandoffVersion: 26,
      studioHandoffJson: {
        version: 26,
        scenes: snapshots.map((snap, index) => ({
          order: index,
          sceneId: `scene-${index}`,
          title: `Scene ${snap.level}`,
          semanticRecipe: {
            version: 1,
            recipeId: `r-${snap.level}`,
            sceneId: `scene-${index}`,
            characters: [
              {
                assetId: `char-${index}`,
                kind: "character",
                name: "Globe Man",
                identityAssetType: "mascot",
                identityProfile: snap.level,
                identityImportance: snap.importance,
              },
            ],
            props: [],
          },
        })),
      },
      studioIntelligenceJson: null,
    });
    assert.deepEqual(audit.identityProfiles?.sort(), [...IDENTITY_PROFILE_LEVELS].sort());
    assert.ok((audit.identityImportanceLevels?.length ?? 0) >= 3);
    assert.deepEqual(audit.identityAssetTypes?.sort(), ["mascot"]);
  });

  it("documents profile config monotonic identity weight", () => {
    const weights = IDENTITY_PROFILE_LEVELS.map((level) => IDENTITY_PROFILE_CONFIGS[level].identityWeight);
    for (let i = 1; i < weights.length; i++) {
      assert.ok(weights[i]! >= weights[i - 1]!, `${IDENTITY_PROFILE_LEVELS[i]} should be >= ${IDENTITY_PROFILE_LEVELS[i - 1]}`);
    }
  });
});
