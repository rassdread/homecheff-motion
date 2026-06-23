import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMotionPresetRequirements } from "@/lib/motion-preset-requirement-engine";
import { estimateMotionComplexity } from "@/lib/motion-complexity-estimator";
import {
  evaluateMotionPresetPipeline,
  motionPresetCombinedPromptBlock,
} from "@/lib/motion-preset-engine-orchestrator";
import { getActionPresetRequirementProfile } from "@/lib/action-preset-requirements";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";

function portraitRef(id = "ref-1"): MotionUploadedReference {
  return { id, fileName: "selfie.jpg", width: 900, height: 1600 };
}

function landscapeRef(id = "ref-1"): MotionUploadedReference {
  return { id, fileName: "product.jpg", width: 1600, height: 900 };
}

describe("motion preset engine", () => {
  it("covers all motion presets with requirement profiles", () => {
    for (const preset of getAllMotionActionPresets()) {
      const profile = getActionPresetRequirementProfile(preset.id);
      assert.equal(profile.presetId, preset.id);
      assert.ok(profile.required.length > 0);
    }
  });

  it("moonwalk requires face and full body heuristics", () => {
    const evalResult = evaluateMotionPresetRequirements({
      presetId: "moonwalk",
      references: [portraitRef()],
    });
    assert.ok(evalResult.requirementScore >= 0);
    assert.equal(typeof evalResult.canRender, "boolean");
    assert.ok(["low", "medium", "high"].includes(evalResult.confidenceLevel));
  });

  it("penalty_kick scores lower than podcast for portrait-only upload", () => {
    const kick = evaluateMotionPresetRequirements({
      presetId: "penalty_kick",
      references: [portraitRef()],
    });
    const podcast = evaluateMotionPresetRequirements({
      presetId: "podcast",
      references: [portraitRef()],
    });
    assert.ok(kick.requirementScore <= podcast.requirementScore);
  });

  it("podcast accepts upper-body portrait", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "podcast",
      references: [portraitRef()],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(snapshot.requirementEvaluation.presetId, "podcast");
    assert.ok(snapshot.complexityEstimate.estimatedRenderCredits > 0);
    assert.ok(snapshot.identityProfile.identityPromptBlock.length > 0);
    assert.ok(snapshot.qualityValidation.qualityScore.overall > 0);
  });

  it("product_launch pipeline expects product-oriented references", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "product_launch",
      references: [landscapeRef()],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(snapshot.intelligenceProfile?.presetId, "product_launch");
    assert.ok(
      snapshot.complexityEstimate.estimatedTotalCredits >=
        snapshot.complexityEstimate.estimatedRenderCredits
    );
  });

  it("mascot_commercial pipeline builds identity block", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "mascot_commercial",
      references: [{ ...portraitRef(), fileName: "mascot.png", assetType: "mascot" }],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.ok(snapshot.identityProfile.mascotTraits.length >= 0);
    assert.ok(motionPresetCombinedPromptBlock(snapshot).length > 0);
  });

  it("cached analysis zeroes analysis credits", () => {
    const estimate = estimateMotionComplexity({
      presetId: "moonwalk",
      references: [{ ...portraitRef(), motionReady: true, styleDna: { version: 1 } as never }],
      cachedAnalysisCount: 1,
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(estimate.cachedAnalysisCount, 1);
    assert.equal(estimate.estimatedAnalysisCredits, 0);
    assert.ok(estimate.analysisCached);
  });
});
