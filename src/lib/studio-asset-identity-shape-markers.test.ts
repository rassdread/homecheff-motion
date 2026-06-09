import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIdentityProfileRules,
  buildIdentityProfileDraftPatch,
} from "@/lib/studio-asset-identity-profile";
import {
  buildSourceTransformEnforcementPrompt,
  formatIdentityFingerprintSummary,
} from "@/lib/studio-asset-identity-preservation";
import {
  applyVisionIdentityShapeMarkerNormalization,
  buildIdentityShapeMarkerEnforcementBlock,
  isAllowedRoleHeadwearTerm,
  normalizeHairLikeFeature,
} from "@/lib/studio-asset-identity-shape-markers";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";

function globeManVisionWithHairMislabel() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "Mascot",
      visualStyle: "Flat cartoon logo mascot",
      colors: [
        { label: "Blue", hex: "#0067B1", role: "secondary" },
        { label: "Green", hex: "#006D52", role: "primary" },
      ],
      shapeLanguage: ["Round", "Friendly"],
      keyFeatures: [
        "Blue hair on upper head",
        "White face",
        "Globe body",
        "Laughing expression",
      ],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      suggestedPreserve: ["face", "blue hair color"],
      suggestedChange: ["outfit", "role", "chef hat"],
      suggestedForbidden: ["style break"],
      confidence: 0.92,
      silhouette: "round globe mascot with blue upper head",
    },
    { sourceName: "Globe Man" }
  );
}

const GLOBE_ROLES = ["Chef", "Garden", "Designer", "Host"] as const;

describe("studio-asset-identity-shape-markers", () => {
  it("reclassifies mascot hair mislabels as identity shape markers", () => {
    const analysis = globeManVisionWithHairMislabel();
    assert.ok(!analysis.keyFeatures.some((f) => /\bhair\b/i.test(f)));
    assert.ok(!analysis.suggestedPreserve.some((f) => /\bhair\b/i.test(f)));
    assert.ok(analysis.identityFingerprint.identityShapeMarkers?.length);
    assert.ok(
      analysis.identityFingerprint.identityShapeMarkers?.some((m) =>
        /blue|upper-head|globe|signature/i.test(m)
      )
    );
    const summary = formatIdentityFingerprintSummary(analysis.identityFingerprint);
    assert.match(summary, /Shape markers:/);
  });

  it("keeps hair terms for realistic human portraits", () => {
    const normalized = normalizeHairLikeFeature("Brown hair, side part", {
      objectType: "human",
      visualStyle: "Realistic portrait photograph",
      brandIdentity: "",
      assetFamily: "",
    });
    assert.match(normalized.text, /hair/i);
    assert.equal(normalized.marker, undefined);
  });

  it("allows role headwear terms without treating them as hair", () => {
    assert.ok(isAllowedRoleHeadwearTerm("chef hat"));
    assert.ok(isAllowedRoleHeadwearTerm("garden hat"));
    assert.ok(isAllowedRoleHeadwearTerm("safety helmet"));
  });

  it("adds master character silhouette enforcement for brand_lock and master_character", () => {
    const master = buildIdentityShapeMarkerEnforcementBlock("master_character");
    const brand = buildIdentityShapeMarkerEnforcementBlock("brand_lock");
    assert.match(master, /NOT hair/i);
    assert.match(master, /Headwear is allowed/i);
    assert.match(brand, /signature head shape/i);
    assert.equal(buildIdentityShapeMarkerEnforcementBlock("strict"), "");
  });

  it("Globe Man role variants enforce shape markers and forbid hair redesign", () => {
    const vision = globeManVisionWithHairMislabel();
    for (const role of GLOBE_ROLES) {
      const rules = buildIdentityProfileRules({
        assetType: "mascot",
        profileLevel: "master_character",
        vision,
      });
      assert.ok(rules.preserve.some((r) => /identity shape markers/i.test(r)));
      assert.ok(rules.forbidden.some((r) => /realistic hair|character redesign/i.test(r)));
      assert.ok(rules.change.some((r) => /headwear|outfit|role/i.test(r)));

      const prompt = buildSourceTransformEnforcementPrompt({
        sourceName: "Globe Man",
        variantLabel: role,
        vision,
        preserveRules: rules.preserve.join(", "),
        changeRules: rules.change.join(", "),
        forbiddenRules: rules.forbidden.join(", "),
        identityProfileLevel: "master_character",
        identityFingerprintSummary: formatIdentityFingerprintSummary(vision.identityFingerprint),
      });

      assert.match(prompt, /MASTER CHARACTER RULE/i);
      assert.match(prompt, /Identity shape markers/i);
      assert.match(prompt, /Do not replace them with realistic hair/i);
      assert.match(prompt, /Globe Man/i);
      assert.match(prompt, new RegExp(role, "i"));
    }
  });

  it("seeds wizard draft with shape marker preserve rules for Globe Man", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "globe",
        name: "Globe Man",
      }),
      sourceVisionAnalysis: globeManVisionWithHairMislabel(),
      sourceVisionAnalysisStatus: "ready",
    };
    const patch = buildIdentityProfileDraftPatch(draft, {
      assetType: "mascot",
      profileLevel: "master_character",
      confirmed: true,
    });
    assert.ok(patch.sourceTransformPreserve?.includes("identity shape markers"));
    assert.ok(patch.sourceTransformForbidden?.includes("realistic hair"));
  });

  it("normalizes raw vision JSON before fingerprint hash", () => {
    const base = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        visualStyle: "Flat vector",
        keyFeatures: ["Blue hairstyle on crown"],
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.9,
      },
      { sourceName: "Globe Man" }
    );
    const reapplied = applyVisionIdentityShapeMarkerNormalization(base, undefined, {
      sourceName: "Globe Man",
    });
    assert.ok(!reapplied.keyFeatures.some((f) => /hairstyle/i.test(f)));
  });
});
