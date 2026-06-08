import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditAssetSemanticRecord,
  auditSceneSemanticRecipe,
  computeSemanticContinuityScore,
  formatSemanticIdentityRulesForExecution,
  hasCoreIdentityFields,
  SEMANTIC_CONTINUITY_AFTER_SEMANTIC_SPRINT,
  SEMANTIC_CONTINUITY_BASELINE_BEFORE_SPRINT,
} from "@/lib/studio-identity-continuity";
import { buildSemanticContinuitySnapshot } from "@/lib/studio-asset-semantic-record";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { SceneSemanticRecipe } from "@/types/studio-scene-semantic-recipe";

function sampleRecord(): AssetSemanticRecord {
  return {
    version: 1,
    brandIdentity: "HomeCheff Globe Mascot",
    assetFamily: "HomeCheff Mascots",
    visionSummary: "Flat mascot",
    identityFingerprint: { fingerprintHash: "abc123def456" },
    sourceReferenceName: "Globe Man",
    variantFidelityOverall: 88,
  };
}

describe("studio-identity-continuity", () => {
  it("audits missing semantic record as critical", () => {
    const gaps = auditAssetSemanticRecord(null);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0]!.severity, "critical");
  });

  it("audits partial semantic record warnings", () => {
    const gaps = auditAssetSemanticRecord({ version: 1, brandIdentity: "HomeCheff" });
    assert.ok(gaps.some((g) => g.field === "assetFamily"));
    assert.ok(gaps.some((g) => g.field === "identityFingerprint"));
  });

  it("buildSemanticContinuitySnapshot exposes library fields", () => {
    const snapshot = buildSemanticContinuitySnapshot(sampleRecord());
    assert.equal(snapshot!.assetFamily, "HomeCheff Mascots");
    assert.equal(snapshot!.derivedFromSourceName, "Globe Man");
    assert.equal(snapshot!.identityScore, 88);
  });

  it("auditSceneSemanticRecipe flags missing recipe", () => {
    const gaps = auditSceneSemanticRecipe(undefined);
    assert.equal(gaps[0]!.field, "semanticRecipe");
  });

  it("formatSemanticIdentityRulesForExecution includes brand and family", () => {
    const recipe: SceneSemanticRecipe = {
      version: 1,
      recipeId: "r1",
      sceneId: "s1",
      characters: [{ assetId: "c1", kind: "character", name: "Chef", brandIdentity: "HomeCheff" }],
      props: [],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      identityFingerprintSummary: "Face: round globe",
    };
    const text = formatSemanticIdentityRulesForExecution(recipe);
    assert.match(text, /HomeCheff Mascots/);
    assert.match(text, /Brand identity/);
  });

  it("computeSemanticContinuityScore improves with semantic records and handoff", () => {
    const before = computeSemanticContinuityScore({ semanticRecords: [null, null] });
    const after = computeSemanticContinuityScore({
      semanticRecords: [sampleRecord(), sampleRecord()],
      handoff: {
        version: 26,
        scenes: [
          {
            order: 0,
            sceneId: "s1",
            title: "Scene",
            semanticRecipe: {
              version: 1,
              recipeId: "r1",
              sceneId: "s1",
              characters: [
                {
                  assetId: "c1",
                  kind: "character",
                  name: "Chef",
                  brandIdentity: "HomeCheff",
                  assetFamily: "HomeCheff Mascots",
                  identityFingerprintSummary: "globe face",
                },
              ],
              props: [],
              brandIdentity: "HomeCheff",
              assetFamily: "HomeCheff Mascots",
            },
          } as import("@/types/motion-handoff-payload").MotionHandoffScene,
        ],
      } as import("@/types/motion-handoff-payload").MotionHandoffPayload,
      hasDirectorSemanticLabels: true,
      hasSceneSemanticPromptLines: true,
    });
    assert.ok(after.overallSemanticContinuity > before.overallSemanticContinuity);
    assert.ok(after.overallSemanticContinuity > SEMANTIC_CONTINUITY_BASELINE_BEFORE_SPRINT.overallSemanticContinuity);
    assert.ok(after.motionContinuity >= SEMANTIC_CONTINUITY_AFTER_SEMANTIC_SPRINT.motionContinuity - 10);
  });

  it("hasCoreIdentityFields requires brand, family, and fingerprint", () => {
    assert.equal(hasCoreIdentityFields(sampleRecord()), true);
    assert.equal(hasCoreIdentityFields({ version: 1, brandIdentity: "X" }), false);
  });
});
