import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAutoForbiddenStyleRules,
  buildCharacterVariantPreserveRules,
  buildIdentityFingerprintFromVision,
  buildSourceImageFidelityBlock,
  buildStricterPreservePatch,
  buildVariantTransformationPromptBlock,
  computeVariantFidelityScore,
  inferAssetFamily,
  inferBrandIdentityFromContext,
  isFlatOrVectorMascotStyle,
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

  it("source fidelity block declares priority order", () => {
    const block = buildSourceImageFidelityBlock("Globe Man");
    assert.match(block, /highest priority/i);
    assert.match(block, /identity fingerprint/i);
  });
});
