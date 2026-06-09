import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAutoForbiddenStyleRules,
  buildCharacterVariantPreserveRules,
  buildFingerprintLockBlock,
  buildIdentityFingerprintFromVision,
  buildSourceImageFidelityBlock,
  buildStricterPreservePatch,
  buildVariantTransformationPromptBlock,
  computeVariantFidelityScore,
  inferAssetFamily,
  inferBrandIdentityFromContext,
  isFlatOrVectorMascotStyle,
  resolveHomeCheffGlobeBrandProfile,
  resolveVariantFidelityRecoveryTier,
} from "@/lib/studio-asset-identity-preservation";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import { buildSourceTransformSummaryPrompt } from "@/lib/studio-asset-transform-prompt";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";

function globeMascotAnalysis() {
  return mapVisionJsonToAnalysis(
    {
      objectType: "Mascot",
      visualStyle: "Flat cartoon logo mascot",
      colors: [{ label: "Green", hex: "#006D52", role: "primary" }],
      shapeLanguage: ["Round", "Friendly"],
      keyFeatures: ["Globe body", "Chef hat", "White face"],
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
      characterLineage: "Primary Mascot",
      brandRecognitionConfidence: 0.94,
      suggestedPreserve: ["face", "colors"],
      suggestedChange: ["outfit"],
      suggestedForbidden: ["style break"],
      confidence: 0.9,
    },
    { sourceName: "Globe Man" }
  );
}

describe("studio-asset-identity-preservation", () => {
  it("infers brand identity from source name when vision is unknown", () => {
    const brand = inferBrandIdentityFromContext({
      rawBrand: "Unknown brand asset",
      sourceName: "HomeCheff Globe Man",
      objectType: "mascot",
    });
    assert.match(brand, /HomeCheff/i);
  });

  it("infers asset family for mascot brand", () => {
    const family = inferAssetFamily({
      brandIdentity: "HomeCheff Globe Mascot",
      sourceName: "Globe Man",
      objectType: "mascot",
    });
    assert.equal(family, "HomeCheff Mascots");
  });

  it("builds identity fingerprint with hash", () => {
    const vision = globeMascotAnalysis();
    const fingerprint = buildIdentityFingerprintFromVision(vision);
    assert.ok(fingerprint.fingerprintHash);
    assert.ok(fingerprint.colorDna?.includes("Green"));
  });

  it("adds auto forbidden rules for flat mascot style", () => {
    const vision = globeMascotAnalysis();
    assert.ok(isFlatOrVectorMascotStyle(vision));
    const forbidden = buildAutoForbiddenStyleRules(vision);
    assert.ok(forbidden.some((r) => /Pixar|Disney|Photorealistic/i.test(r)));
  });

  it("uses preserve priority for character variants", () => {
    const vision = globeMascotAnalysis();
    const preserve = buildCharacterVariantPreserveRules(vision);
    assert.ok(preserve.some((r) => /face structure|silhouette|color palette/i.test(r)));
  });

  it("variant transformation prompt forbids new mascot creation", () => {
    const block = buildVariantTransformationPromptBlock({
      sourceName: "Globe Man",
      variantLabel: "Chef",
      brandIdentity: "HomeCheff Globe Mascot",
      assetFamily: "HomeCheff Mascots",
    });
    assert.match(block, /Transform the existing/i);
    assert.match(block, /do NOT create a new character/i);
    assert.match(block, /KEEP EXACTLY/i);
  });

  it("source transform summary prioritizes source image fidelity", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "globe",
        name: "Globe Man",
      }),
      sourceVisionAnalysis: globeMascotAnalysis(),
      sourceVisionAnalysisStatus: "ready",
      sourceTransformChoice: "chef",
      sourceTransformPreserve: buildCharacterVariantPreserveRules(globeMascotAnalysis()).join(", "),
      sourceTransformChange: "chef outfit, chef hat, spoon",
      sourceTransformForbidden: buildAutoForbiddenStyleRules(globeMascotAnalysis()).join(", "),
    };
    const prompt = buildSourceTransformSummaryPrompt(draft);
    assert.match(prompt, /SOURCE IMAGE FIDELITY/i);
    assert.match(prompt, /Transform the existing/i);
    assert.match(prompt, /Identity fingerprint/i);
    assert.ok(prompt.indexOf("SOURCE IMAGE FIDELITY") < prompt.indexOf("Preserve:"));
  });

  it("computes variant fidelity score between source and generated vision", () => {
    const source = globeMascotAnalysis();
    const generated = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        visualStyle: "Flat cartoon logo mascot",
        colors: [{ label: "Green", hex: "#006D52" }],
        shapeLanguage: ["Round", "Friendly"],
        keyFeatures: ["Globe body", "Chef apron", "White face"],
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
      },
      { sourceName: "Globe Man Chef" }
    );
    const score = computeVariantFidelityScore({ source, generated });
    assert.ok(score.overall >= 50);
    assert.ok(score.brandPreservation >= 80);
  });

  it("buildStricterPreservePatch strengthens rules for regeneration", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      sourceVisionAnalysis: globeMascotAnalysis(),
      sourceTransformForbidden: "style break",
    };
    const patch = buildStricterPreservePatch(draft);
    assert.match(patch.sourceTransformPreserve ?? "", /face structure/i);
    assert.match(patch.sourceTransformForbidden ?? "", /Pixar|face redesign/i);
  });

  it("Globe Man to Chef prompt enforces identity lock and HomeCheff brand", () => {
    const vision = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        visualStyle: "Flat cartoon logo mascot",
        colors: [{ label: "Green", hex: "#006D52" }],
        shapeLanguage: ["Round"],
        keyFeatures: ["Globe body"],
        brandIdentity: "Unknown Brand Asset",
        suggestedForbidden: [],
        confidence: 0.8,
      },
      { sourceName: "Globe Man" }
    );
    assert.equal(vision.brandIdentity, "HomeCheff Globe Mascot");
    assert.equal(vision.assetFamily, "HomeCheff Mascots");
    assert.equal(vision.characterLineage, "Primary Mascot");

    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "globe",
        name: "Globe Man",
      }),
      sourceVisionAnalysis: vision,
      sourceVisionAnalysisStatus: "ready",
      sourceTransformChoice: "chef",
      sourceTransformPreserve: buildCharacterVariantPreserveRules(vision).join(", "),
      sourceTransformChange: "chef outfit, chef hat, spoon",
      sourceTransformForbidden: buildAutoForbiddenStyleRules(vision).join(", "),
    };

    const prompt = buildSourceTransformSummaryPrompt(draft);
    assert.match(prompt, /TRANSFORM THE EXISTING SOURCE CHARACTER/);
    assert.match(prompt, /DO NOT CREATE A NEW CHARACTER/);
    assert.match(prompt, /KEEP 2D FLAT VECTOR LOGO-MASCOT STYLE/);
    assert.match(prompt, /DO NOT CONVERT TO 3D/);
    assert.match(prompt, /Make a Chef version of this exact mascot/i);
    assert.match(prompt, /Forbidden:/i);
    assert.match(prompt, /redesigned face/i);
    assert.match(prompt, /Pixar\/Disney style/i);
    assert.doesNotMatch(prompt, /Unknown Brand Asset/i);
  });

  it("resolveHomeCheffGlobeBrandProfile matches Globe Man source name", () => {
    const profile = resolveHomeCheffGlobeBrandProfile("Globe Man chef variant");
    assert.ok(profile);
    assert.equal(profile!.brandIdentity, "HomeCheff Globe Mascot");
    assert.equal(profile!.assetFamily, "HomeCheff Mascots");
  });

  it("infers HomeCheff Globe from vision keyFeatures when source name is generic upload", () => {
    const vision = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        visualStyle: "Flat cartoon logo mascot",
        colors: [{ label: "Green", hex: "#006D52" }],
        shapeLanguage: ["Round"],
        keyFeatures: ["Globe body", "Chef hat", "White face"],
        brandIdentity: "Unknown Brand Asset",
        suggestedForbidden: [],
        confidence: 0.8,
      },
      { sourceName: "upload" }
    );
    assert.equal(vision.brandIdentity, "HomeCheff Globe Mascot");
    assert.equal(vision.assetFamily, "HomeCheff Mascots");
  });

  it("does not return unknown vision brand when heuristics fail", () => {
    const brand = inferBrandIdentityFromContext({
      rawBrand: "Unknown Brand Asset",
      sourceName: "upload",
      objectType: "mascot",
    });
    assert.equal(brand, "Unknown brand asset");
    assert.notEqual(brand, "Unknown Brand Asset");
  });

  it("buildFingerprintLockBlock enforces P1-P4 tiers", () => {
    const level1 = buildFingerprintLockBlock(1);
    assert.match(level1, /P1 LOCKED/i);
    assert.match(level1, /P4 ONLY/i);
    const level2 = buildFingerprintLockBlock(2);
    assert.match(level2, /level 2/i);
    assert.match(level2, /P3 LOCKED/i);
  });

  it("resolveVariantFidelityRecoveryTier maps thresholds", () => {
    assert.equal(resolveVariantFidelityRecoveryTier(90), "ok");
    assert.equal(resolveVariantFidelityRecoveryTier(75), "warning");
    assert.equal(resolveVariantFidelityRecoveryTier(50), "strict_regenerate");
    assert.equal(resolveVariantFidelityRecoveryTier(30), "identity_failure");
  });

  it("resolveVariantFidelityRecoveryTier tightens for master_character profile", () => {
    assert.equal(resolveVariantFidelityRecoveryTier(88, "master_character"), "warning");
    assert.equal(resolveVariantFidelityRecoveryTier(88), "ok");
    assert.equal(resolveVariantFidelityRecoveryTier(70, "relaxed"), "ok");
    assert.equal(resolveVariantFidelityRecoveryTier(70), "warning");
  });

  it("source image fidelity block lists full priority order", () => {
    const block = buildSourceImageFidelityBlock("Globe Man");
    assert.match(block, /asset family/i);
    assert.match(block, /forbidden rules/i);
  });

  it("Globe Man to Chef variant scenarios preserve HomeCheff Mascots family", () => {
    const scenarios = [
      { label: "Chef", choice: "chef" },
      { label: "Garden", choice: "garden" },
      { label: "Designer", choice: "designer" },
    ] as const;

    for (const scenario of scenarios) {
      const vision = mapVisionJsonToAnalysis(
        {
          objectType: "Mascot",
          visualStyle: "Flat cartoon logo mascot",
          colors: [{ label: "Green", hex: "#006D52" }],
          shapeLanguage: ["Round"],
          keyFeatures: ["Globe body"],
          brandIdentity: "HomeCheff Globe Mascot",
          assetFamily: "HomeCheff Mascots",
          suggestedForbidden: [],
          confidence: 0.8,
        },
        { sourceName: "Globe Man" }
      );

      let draft = emptyAssetWizardDraft("character", "image_only");
      draft = {
        ...draft,
        ...recordWizardSourceReference({
          imageUrl: "https://example.com/globe.png",
          storageKey: "globe",
          name: "Globe Man",
        }),
        sourceVisionAnalysis: vision,
        sourceVisionAnalysisStatus: "ready",
        sourceTransformChoice: scenario.choice,
        sourceTransformPreserve: buildCharacterVariantPreserveRules(vision).join(", "),
        sourceTransformChange: `${scenario.label} outfit`,
        sourceTransformForbidden: buildAutoForbiddenStyleRules(vision).join(", "),
      };

      const prompt = buildSourceTransformSummaryPrompt(draft);
      assert.match(prompt, /HomeCheff Mascots|HomeCheff Globe Mascot/i);
      assert.match(prompt, new RegExp(scenario.label, "i"));
      assert.match(prompt, /IDENTITY FINGERPRINT LOCK/i);
    }
  });
});
