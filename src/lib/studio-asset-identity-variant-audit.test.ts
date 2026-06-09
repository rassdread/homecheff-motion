import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  auditGeneratedIdentityVariant,
  resolveIdentityScoreBadgeTone,
} from "@/lib/studio-asset-identity-variant-audit";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function vision(partial: Partial<AssetVisionAnalysis> & Pick<AssetVisionAnalysis, "objectType">): AssetVisionAnalysis {
  return {
    objectTypeLabel: partial.objectType,
    visualStyle: "flat vector",
    colors: [{ label: "blue" }, { label: "white" }],
    shapeLanguage: ["round head", "globe silhouette"],
    keyFeatures: ["bow tie", "chef hat"],
    brandIdentity: "HomeCheff Globe Mascot",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.9,
    safetyNotes: [],
    assetFamily: "HomeCheff Mascots",
    characterLineage: "primary_mascot",
    brandRecognitionConfidence: 0.9,
    identityFingerprint: {
      faceStructure: "round mascot face",
      silhouette: "globe head",
      identityShapeMarkers: ["blue upper-head region"],
    },
    ...partial,
  };
}

describe("auditGeneratedIdentityVariant", () => {
  it("returns high identity score for close match under master_character threshold", () => {
    const source = vision({ objectType: "mascot" });
    const generated = vision({
      objectType: "mascot",
      keyFeatures: ["bow tie", "chef hat"],
      brandIdentity: "HomeCheff Globe Mascot",
    });
    const audit = auditGeneratedIdentityVariant({
      sourceVisionAnalysis: source,
      generatedVisionAnalysis: generated,
      identityProfile: "master_character",
      sourceName: "Globe Man",
    });
    assert.ok(audit);
    assert.ok(audit!.identityScore >= 80);
    assert.equal(audit!.recoveryRequired, audit!.identityScore < 92);
    assert.ok(audit!.preserved.length > 0);
  });

  it("flags recovery when generated diverges under strict profile", () => {
    const source = vision({ objectType: "mascot" });
    const generated = vision({
      objectType: "mascot",
      keyFeatures: ["realistic hair"],
      brandIdentity: "Generic Chef",
      colors: [{ label: "red" }],
      shapeLanguage: ["human proportions"],
      identityFingerprint: { faceStructure: "realistic human" },
    });
    const audit = auditGeneratedIdentityVariant({
      sourceVisionAnalysis: source,
      generatedVisionAnalysis: generated,
      identityProfile: "strict",
      sourceName: "Globe Man",
    });
    assert.ok(audit);
    assert.ok(audit!.identityScore < 80);
    assert.equal(audit!.recoveryRequired, true);
    assert.ok(audit!.lost.length > 0);
    assert.ok(audit!.recommendations.length > 0);
  });

  it("uses profile-aware badge tones", () => {
    assert.equal(resolveIdentityScoreBadgeTone(93, "master_character"), "green");
    assert.equal(resolveIdentityScoreBadgeTone(88, "master_character"), "orange");
    assert.equal(resolveIdentityScoreBadgeTone(80, "master_character"), "red");
  });
});
