import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdvanceFromDerivePreview,
  canAdvanceFromDeriveSource,
  canAdvanceFromDeriveTransform,
} from "@/lib/studio-asset-derivation-flow";
import { buildDerivationReferenceGenerationPrompt } from "@/lib/studio-asset-derivation-prompt";
import {
  applyDerivationTransformToChoices,
  buildDerivationPreview,
  buildDerivationSummaryPrompt,
  mapAnalysisToStyleDna,
} from "@/lib/studio-asset-style-dna";
import { emptyDerivationWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { resolveProfitabilityFeatureKey } from "@/server/admin/studio-profitability";

describe("studio-asset-derivation", () => {
  it("maps character vision analysis to style DNA", () => {
    const dna = mapAnalysisToStyleDna({
      visualStyle: "flat cartoon",
      colorTheme: "blue and green",
      shapeLanguage: "rounded",
      clothing: "chef hat",
      personality: "friendly",
      confidence: 0.9,
    });
    assert.equal(dna.visualStyle, "flat cartoon");
    assert.equal(dna.colorTheme, "blue and green");
    assert.ok(dna.outfitHints.includes("chef"));
  });

  it("builds derivation summary for Globe Man → Chef", () => {
    const summary = buildDerivationSummaryPrompt({
      targetKind: "character",
      sourceName: "Globe Man",
      transformLabel: "Chef",
      styleDna: mapAnalysisToStyleDna({
        visualStyle: "flat cartoon",
        colorTheme: "globe blues",
        shapeLanguage: "round",
      }),
    });
    assert.ok(summary.includes("Globe Man"));
    assert.ok(summary.includes("Chef"));
    assert.ok(summary.toLowerCase().includes("preserve"));
  });

  it("builds live preview preserves and changes", () => {
    const preview = buildDerivationPreview({
      sourceName: "Globe Man",
      targetKind: "character",
      transformLabel: "Garden mascot",
      styleDna: mapAnalysisToStyleDna({
        colorTheme: "green",
        shapeLanguage: "round",
        appearanceMemory: "globe icon",
      }),
      preserveLabels: { colors: "Colors", shape: "Shape", brand: "Brand", style: "Style" },
      changeLabels: {
        role: "Role",
        accessories: "Accessories",
        variant: "Variant",
        mood: "Mood",
        transformation: "Transform",
      },
    });
    assert.equal(preview.sourceLabel, "Globe Man");
    assert.ok(preview.preserves.length > 0);
    assert.ok(preview.changes.some((c) => c.includes("Garden")));
  });

  it("applies character transform choices", () => {
    const choices = applyDerivationTransformToChoices("character", "chef", "");
    assert.equal(choices.character_type, "chef");
    assert.equal(choices.character_outfit, "chef");
  });

  it("applies prop and location transform choices", () => {
    assert.equal(applyDerivationTransformToChoices("prop", "seasonal", "").prop_category, "seasonal");
    assert.equal(
      applyDerivationTransformToChoices("location", "mood", "").location_mood,
      "cozy"
    );
  });

  it("extends reference prompt with style DNA block", () => {
    const prompt = buildDerivationReferenceGenerationPrompt({
      kind: "character",
      summaryPrompt: "Derived chef from Globe Man",
      styleDna: mapAnalysisToStyleDna({ visualStyle: "cartoon", colorTheme: "blue" }),
      sourceName: "Globe Man",
    });
    assert.ok(prompt.includes("STYLE DNA"));
    assert.ok(prompt.includes("Globe Man"));
    assert.ok(prompt.includes("cartoon"));
  });

  it("advances derivation wizard steps when ready", () => {
    const draft = emptyDerivationWizardDraft("character");
    assert.equal(canAdvanceFromDeriveSource(draft), false);
    draft.derivationSource = {
      sourceType: "library_asset",
      sourceKind: "character",
      assetId: "c1",
      assetName: "Globe Man",
      referenceImageUrl: "https://example.com/globe.png",
      referenceStorageKey: "",
    };
    draft.derivationStyleDnaStatus = "ready";
    draft.derivationStyleDna = mapAnalysisToStyleDna({ visualStyle: "cartoon" });
    assert.equal(canAdvanceFromDeriveSource(draft), true);

    draft.derivationTransformChoice = "garden";
    assert.equal(canAdvanceFromDeriveTransform(draft), true);

    draft.summaryPrompt = buildDerivationSummaryPrompt({
      targetKind: "character",
      sourceName: "Globe Man",
      transformLabel: "Garden",
      styleDna: draft.derivationStyleDna,
    });
    assert.equal(canAdvanceFromDerivePreview(draft), true);
  });

  it("tags profitability feature key asset_derivation", () => {
    assert.equal(
      resolveProfitabilityFeatureKey({
        actionType: "openai_character_analysis",
        metadataJson: { feature: "asset_derivation", derivationPhase: "vision" },
      }),
      "asset_derivation"
    );
  });
});
