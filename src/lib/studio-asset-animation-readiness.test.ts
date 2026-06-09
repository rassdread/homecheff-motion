import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSceneSemanticRecipeForMotion } from "@/lib/build-scene-semantic-recipe";
import {
  analyzeAnimationReadiness,
  buildCharacterConstructionProfile,
  buildConstructionContinuityPromptBlock,
  detectBodyVisibilityFromVision,
  hasAnimationReadyCharacterProfile,
} from "@/lib/studio-asset-animation-readiness";
import {
  buildAssetSemanticRecordFromWizardDraft,
  buildSemanticContinuitySnapshot,
} from "@/lib/studio-asset-semantic-record";
import {
  emptyPrepareForAnimationWizardDraft,
  type AssetWizardDraft,
} from "@/lib/studio-asset-wizard-draft";
import { injectPreparationWizardSteps } from "@/lib/studio-asset-wizard-preparation-flow";
import { wizardStepSequenceForDraft } from "@/lib/studio-asset-wizard-flow";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { SceneSemanticRecipe } from "@/types/studio-scene-semantic-recipe";

const PORTRAIT_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Human",
    visualStyle: "Photo portrait head and shoulders",
    environmentHints: "busy kitchen background",
    suggestedPreserve: ["face", "hair"],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.75,
    identityFingerprint: { silhouette: "portrait shoulders up", proportions: "portrait" },
  },
  { sourceName: "Chef" }
);

const FULL_BODY_VISION = mapVisionJsonToAnalysis(
  {
    objectType: "Mascot",
    visualStyle: "Flat vector",
    environmentHints: "transparent",
    suggestedPreserve: ["full body mascot", "arms visible", "standing neutral pose"],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.9,
    identityFingerprint: { silhouette: "round mascot", proportions: "full body" },
  },
  { sourceName: "Globe" }
);

function preparationDraft(overrides: Partial<AssetWizardDraft> = {}): AssetWizardDraft {
  return {
    ...emptyPrepareForAnimationWizardDraft("character"),
    sourceReferenceImageUrl: "https://example.com/chef.png",
    sourceReferenceStorageKey: "chef.png",
    sourceVisionAnalysis: PORTRAIT_VISION,
    sourceVisionAnalysisStatus: "ready",
    identityAssetType: "person",
    identityProfileLevel: "balanced",
    identityProfileConfirmed: true,
    characterConstruction: {
      bodyType: "athletic",
      postureProfile: "confident",
      heightProfile: "average",
      walkStyleProfile: "neutral",
      ageGroup: "adult",
    },
    characterConstructionConfirmed: true,
    animationReadinessConfirmed: true,
    ...overrides,
  };
}

describe("studio-asset-animation-readiness", () => {
  it("detects portrait and full body visibility from vision text", () => {
    assert.equal(detectBodyVisibilityFromVision(PORTRAIT_VISION), "portrait");
    assert.equal(detectBodyVisibilityFromVision(FULL_BODY_VISION), "full_body");
  });

  it("scores lower when background and incomplete body are detected", () => {
    const analysis = analyzeAnimationReadiness({
      vision: PORTRAIT_VISION,
      construction: buildCharacterConstructionProfile(
        preparationDraft({ characterConstructionConfirmed: false })
      ),
    });
    assert.ok(analysis.score < 90);
    assert.ok(analysis.issues.some((issue) => issue.id === "background_present"));
    assert.ok(analysis.issues.some((issue) => issue.id === "incomplete_body"));
    assert.ok(analysis.recommendedActions.includes("remove_background"));
  });

  it("scores higher for full-body mascot with neutral pose", () => {
    const analysis = analyzeAnimationReadiness({
      vision: FULL_BODY_VISION,
      construction: buildCharacterConstructionProfile(
        preparationDraft({
          identityAssetType: "mascot",
          sourceVisionAnalysis: FULL_BODY_VISION,
          characterConstruction: { standardPose: "neutral", preserveSilhouette: true },
        })
      ),
    });
    assert.ok(analysis.score >= 70);
    assert.equal(analysis.checks.fullBodyVisible, true);
  });

  it("injects preparation steps and strips generation steps", () => {
    const draft = preparationDraft({ characterConstructionConfirmed: false });
    const steps = wizardStepSequenceForDraft(draft);
    assert.ok(steps.includes("character_construction"));
    assert.ok(steps.includes("animation_readiness"));
    assert.ok(!steps.includes("reference"));
    assert.ok(!steps.includes("transform_prompt"));
    const injected = injectPreparationWizardSteps(
      ["input", "asset_vision", "identity_profile", "essentials", "save"],
      draft
    );
    assert.ok(injected.includes("character_construction"));
    assert.ok(injected.includes("animation_readiness"));
  });

  it("persists construction and readiness on semantic record", () => {
    const draft = preparationDraft({
      animationReadinessAnalysis: analyzeAnimationReadiness({
        vision: PORTRAIT_VISION,
        construction: buildCharacterConstructionProfile(preparationDraft()),
      }),
    });
    const record = buildAssetSemanticRecordFromWizardDraft(draft);
    assert.ok(record?.characterConstructionProfile);
    assert.equal(record?.characterConstructionProfile?.bodyType, "athletic");
    assert.equal(typeof record?.animationReadinessScore, "number");
    assert.ok((record?.animationPreparationActions?.length ?? 0) >= 0);
    const continuity = buildSemanticContinuitySnapshot(record);
    assert.ok(continuity.bodySummary?.includes("athletic"));
    assert.ok(continuity.postureSummary?.includes("confident"));
  });

  it("feeds motion guidance from scene recipe animation fields", () => {
    const recipe: SceneSemanticRecipe = {
      version: 1,
      recipeId: "recipe-1",
      sceneId: "scene-1",
      characters: [
        {
          assetId: "char-1",
          kind: "character",
          name: "Chef",
          animationReadinessScore: 78,
          characterConstructionSummary: "Body: athletic · Posture: confident",
          bodySummary: "athletic · average",
          postureSummary: "confident",
        },
      ],
      props: [],
    };
    const motion = formatSceneSemanticRecipeForMotion(recipe);
    assert.match(motion, /Animation readiness: Chef=78%/);
    assert.match(motion, /Character construction \(Chef\)/);
  });

  it("locks continuity from stored construction profile", () => {
    const profile = buildCharacterConstructionProfile(preparationDraft());
    const block = buildConstructionContinuityPromptBlock(profile);
    assert.match(block, /Character construction lock/);
    assert.match(block, /athletic/);
    assert.equal(
      hasAnimationReadyCharacterProfile({
        animationReadinessScore: 85,
        characterConstructionProfile: profile ?? undefined,
      }),
      true
    );
  });
});
