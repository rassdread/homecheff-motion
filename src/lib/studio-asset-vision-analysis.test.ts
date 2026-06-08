import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import { buildSourceTransformSummaryPrompt } from "@/lib/studio-asset-transform-prompt";
import { emptyAssetWizardDraft, emptyDerivationWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { wizardStepSequenceForDraft } from "@/lib/studio-asset-wizard-flow";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { buildReferenceGenerationPayload } from "@/lib/studio-asset-wizard-reference-generation";
import {
  buildEnrichedAssetGenerationContext,
  buildVisionAnalysisPromptBlock,
  canAdvanceFromAssetVisionStep,
  draftPatchFromVisionAnalysis,
  mapVisionAnalysisToStyleDna,
  mapVisionJsonToAnalysis,
  normalizeVisionObjectType,
  resolveVisionTransformationRules,
  shouldShowAssetVisionStep,
} from "@/lib/studio-asset-vision-analysis";
import type { AssetReferenceVisionJson } from "@/types/studio-asset-vision-analysis";

function mascotVisionJson(): AssetReferenceVisionJson {
  return {
    objectType: "Mascot",
    visualStyle: "Flat cartoon logo mascot",
    colors: [
      { label: "Green", hex: "#006D52", role: "primary" },
      { label: "Blue", hex: "#0067B1", role: "secondary" },
      { label: "White", hex: "#FFFFFF", role: "accent" },
    ],
    shapeLanguage: ["Round", "Friendly"],
    keyFeatures: [
      "Holds globe",
      "White face",
      "Blue outline",
      "Laughing expression",
    ],
    brandIdentity: "HomeCheff Globe Mascot",
    suggestedPreserve: ["colors", "shape language", "brand identity"],
    suggestedChange: ["role", "outfit", "accessories"],
    confidence: 0.92,
  };
}

describe("studio-asset-vision-analysis", () => {
  it("normalizes object types across asset categories", () => {
    assert.equal(normalizeVisionObjectType("Mascot"), "mascot");
    assert.equal(normalizeVisionObjectType("Logo"), "logo");
    assert.equal(normalizeVisionObjectType("Packaging"), "packaging");
    assert.equal(normalizeVisionObjectType("Location"), "location");
    assert.equal(normalizeVisionObjectType("Prop"), "product");
    assert.equal(normalizeVisionObjectType("World"), "environment");
    assert.equal(normalizeVisionObjectType("Unknown thing"), "unknown");
  });

  it("maps character / mascot vision JSON to structured analysis with transformation rules", () => {
    const analysis = mapVisionJsonToAnalysis(mascotVisionJson());
    assert.equal(analysis.objectType, "mascot");
    assert.equal(analysis.objectTypeLabel, "Mascot");
    assert.equal(analysis.visualStyle, "Flat cartoon logo mascot");
    assert.equal(analysis.colors.length, 3);
    assert.equal(analysis.colors[0]?.hex, "#006D52");
    assert.deepEqual(analysis.shapeLanguage, ["Round", "Friendly"]);
    assert.ok(analysis.keyFeatures.includes("Holds globe"));
    assert.equal(analysis.brandIdentity, "HomeCheff Globe Mascot");
    assert.ok(analysis.suggestedPreserve.includes("colors"));
    assert.ok(analysis.suggestedChange.includes("outfit"));
    assert.ok(analysis.suggestedForbidden.some((f) => /style break|face change/i.test(f)));
  });

  it("applies object-type defaults for packaging, logo, and location", () => {
    const packaging = mapVisionJsonToAnalysis({
      objectType: "Packaging",
      visualStyle: "Minimalist",
      keyFeatures: ["label", "logo position"],
    });
    assert.ok(packaging.suggestedPreserve.includes("logo"));
    assert.ok(packaging.suggestedChange.includes("edition"));
    assert.ok(packaging.suggestedForbidden.includes("logo removal"));

    const logo = mapVisionJsonToAnalysis({
      objectType: "Logo",
      visualStyle: "Corporate Brand",
    });
    assert.ok(logo.suggestedPreserve.includes("symbol"));
    assert.ok(logo.suggestedChange.includes("3D version"));
    assert.ok(logo.suggestedForbidden.includes("symbol change"));

    const location = mapVisionJsonToAnalysis({
      objectType: "Location",
      visualStyle: "Cinematic",
    });
    assert.ok(location.suggestedPreserve.includes("architecture"));
    assert.ok(location.suggestedChange.includes("season"));
    assert.ok(location.suggestedForbidden.includes("layout break"));
  });

  it("prefers vision-provided transformation rules over type defaults", () => {
    const rules = resolveVisionTransformationRules("mascot", {
      suggestedPreserve: ["custom preserve"],
      suggestedChange: ["custom change"],
      suggestedForbidden: ["custom forbidden"],
    });
    assert.deepEqual(rules.preserve, ["custom preserve"]);
    assert.deepEqual(rules.change, ["custom change"]);
    assert.deepEqual(rules.forbidden, ["custom forbidden"]);
  });

  it("maps logo analysis", () => {
    const analysis = mapVisionJsonToAnalysis({
      objectType: "Logo",
      visualStyle: "Corporate Brand",
      colors: [{ label: "Navy", hex: "#001133", role: "primary" }],
      shapeLanguage: "Geometric, Minimalist",
      keyFeatures: "Circular mark, letterform, two-tone palette",
      brandIdentity: "Community Garden Brand",
      logoSymbolism: "Leaf and sun",
    });
    assert.equal(analysis.objectType, "logo");
    assert.equal(analysis.visualStyle, "Corporate Brand");
    assert.equal(analysis.shapeLanguage[0], "Geometric");
    assert.equal(analysis.shapeLanguage[1], "Minimalist");
  });

  it("maps packaging analysis", () => {
    const analysis = mapVisionJsonToAnalysis({
      objectType: "Packaging",
      visualStyle: "Minimalist",
      keyFeatures: ["label", "logo position", "color blocks"],
      materialHints: "Matte cardboard",
    });
    assert.equal(analysis.objectType, "packaging");
    assert.ok(analysis.keyFeatures.includes("label"));
  });

  it("maps location and world reference analysis", () => {
    const location = mapVisionJsonToAnalysis({
      objectType: "Location",
      visualStyle: "Cinematic",
      environmentHints: "Outdoor market",
      architectureHints: "Stone buildings",
      moodHints: "Warm evening light",
      keyFeatures: ["trees", "market stalls", "street"],
    });
    assert.equal(location.objectType, "location");
    assert.ok(location.environmentHints.includes("Outdoor market"));

    const world = mapVisionJsonToAnalysis({
      objectType: "Environment",
      visualStyle: "Storybook",
      keyFeatures: ["soft palette", "fantasy rules", "rounded shapes"],
    });
    assert.equal(world.objectType, "environment");
  });

  it("extracts style DNA and draft patch from vision analysis", () => {
    const analysis = mapVisionJsonToAnalysis(mascotVisionJson());
    const styleDna = mapVisionAnalysisToStyleDna(analysis);
    assert.ok(styleDna.colorTheme.includes("#006D52"));
    assert.equal(styleDna.brandIdentity, "HomeCheff Globe Mascot");
    assert.equal(styleDna.visualStyle, "Flat cartoon logo mascot");

    const patch = draftPatchFromVisionAnalysis(analysis);
    assert.equal(patch.sourceVisionAnalysisStatus, "ready");
    assert.equal(patch.derivationStyleDnaStatus, "ready");
    assert.ok(patch.sourceTransformPreserve?.includes("colors"));
    assert.ok(patch.sourceTransformChange?.includes("outfit"));
    assert.ok(patch.sourceTransformForbidden?.includes("style break"));
  });

  it("builds enriched generation context with vision and style DNA", () => {
    const analysis = mapVisionJsonToAnalysis(mascotVisionJson());
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      sourceVisionAnalysis: analysis,
      derivationStyleDna: mapVisionAnalysisToStyleDna(analysis),
      sourceTransformPreserve: "face, colors",
      sourceTransformChange: "outfit, role",
      sourceTransformForbidden: "style break",
      sourceTransformInstruction: "Garden mascot variant",
    };
    const block = buildEnrichedAssetGenerationContext(draft);
    assert.ok(block.includes("Style DNA"));
    assert.ok(block.includes("HomeCheff Globe Mascot"));
    assert.ok(block.includes("Shape DNA"));
  });

  it("builds generation prompt block from analysis", () => {
    const analysis = mapVisionJsonToAnalysis(mascotVisionJson());
    const block = buildVisionAnalysisPromptBlock(analysis);
    assert.ok(block.includes("Mascot"));
    assert.ok(block.includes("#006D52"));
    assert.ok(block.includes("HomeCheff Globe Mascot"));
    assert.ok(block.includes("Preserve rules"));
    assert.ok(block.includes("Forbidden"));
  });

  it("requires ready vision analysis before advancing asset_vision step", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = { ...draft, ...recordWizardSourceReference({ imageUrl: "https://x/a.png", storageKey: "k", name: "Globe" }) };
    assert.equal(shouldShowAssetVisionStep(draft), true);
    assert.equal(canAdvanceFromAssetVisionStep(draft), false);

    draft = {
      ...draft,
      ...draftPatchFromVisionAnalysis(mapVisionJsonToAnalysis(mascotVisionJson())),
    };
    assert.equal(canAdvanceFromAssetVisionStep(draft), true);
  });

  it("inserts asset_vision before transform steps in wizard flow", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      referenceMode: "generate" as const,
    };
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const visionIdx = steps.indexOf("asset_vision");
    const transformIdx = steps.indexOf("source_transform");
    const promptIdx = steps.indexOf("transform_prompt");
    assert.ok(visionIdx >= 0);
    assert.ok(transformIdx > visionIdx);
    assert.ok(promptIdx > transformIdx);
  });

  it("inserts asset_vision after derive_source in derivation flow", () => {
    const draft = emptyDerivationWizardDraft("character");
    draft.derivationSource = {
      sourceType: "library_asset",
      sourceKind: "character",
      assetId: "a1",
      assetName: "Globe Man",
      referenceImageUrl: "https://example.com/globe.png",
      referenceStorageKey: "uploads/globe.png",
    };
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const sourceIdx = steps.indexOf("derive_source");
    const visionIdx = steps.indexOf("asset_vision");
    const targetIdx = steps.indexOf("derive_target_kind");
    assert.ok(sourceIdx >= 0);
    assert.ok(visionIdx === sourceIdx + 1);
    assert.ok(targetIdx > visionIdx);
  });

  it("enriches transform summary and generation payload with vision analysis", () => {
    const analysis = mapVisionJsonToAnalysis(mascotVisionJson());
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      ...draftPatchFromVisionAnalysis(analysis),
      sourceTransformChoice: "custom",
      sourceTransformCustom: "Garden mascot with green cap",
    };

    const summary = buildSourceTransformSummaryPrompt(draft);
    assert.ok(summary.includes("HomeCheff Globe Mascot"));
    assert.ok(summary.includes("#006D52"));
    assert.ok(summary.includes("Style DNA"));
    assert.ok(summary.includes("Forbidden:"));
    assert.ok(summary.includes("Preserve:"));
    assert.ok(summary.includes("Change:"));

    const payload = buildReferenceGenerationPayload(draft, "character", "gen-1");
    assert.ok(payload.summaryPrompt.includes("Style DNA"));
    assert.ok(payload.sourceReference?.visionHint?.includes("HomeCheff"));

    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "character",
      summaryPrompt: payload.summaryPrompt,
      sourceReference: payload.sourceReference,
    });
    assert.ok(prompt.includes("Style DNA"));
    assert.ok(prompt.includes("Forbidden"));
    assert.ok(prompt.includes("Globe Man"));
  });
});
