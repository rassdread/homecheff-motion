import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import { buildSourceTransformChoiceDef } from "@/lib/studio-asset-transformation-options";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { wizardStepSequenceForDraft } from "@/lib/studio-asset-wizard-flow";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import {
  auditSourceReferenceFlows,
  buildSourceTransformSummaryPrompt,
  canAdvanceFromSourceTransformStep,
  shouldShowSourceTransformStep,
  shouldSkipReferenceModeChoice,
  wizardStepLabelKeyForDraft,
} from "@/lib/studio-asset-wizard-source-flow";
import { emptyDerivationWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";

function draftWithSource(
  entryPath: "image_only" | "image_and_prompt" | "derive_from_reference" | "existing_asset",
  kind: "character" | "prop" | "location" = "character"
) {
  let draft = emptyAssetWizardDraft(kind, entryPath);
  draft = {
    ...draft,
    ...recordWizardSourceReference({
      imageUrl: "https://example.com/globe.png",
      storageKey: "uploads/globe.png",
      name: "Globe Man",
    }),
    referenceMode: "generate",
  };
  if (entryPath === "derive_from_reference" || entryPath === "existing_asset") {
    draft.derivationFlow = true;
  }
  return draft;
}

describe("studio-asset-wizard-source-flow", () => {
  it("image_only path skips reference mode choice and inserts source_transform", () => {
    const draft = draftWithSource("image_only");
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(shouldShowSourceTransformStep(draft), true);
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const transformIdx = steps.indexOf("source_transform");
    const promptIdx = steps.indexOf("transform_prompt");
    const refIdx = steps.indexOf("reference");
    assert.ok(transformIdx >= 0);
    assert.ok(promptIdx > transformIdx);
    assert.ok(refIdx > promptIdx);
  });

  it("image_and_prompt path skips reference mode choice", () => {
    const draft = draftWithSource("image_and_prompt");
    draft.sourceTransformChoice = "garden";
    draft.summaryPrompt = buildSourceTransformSummaryPrompt(draft);
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(shouldShowSourceTransformStep(draft), true);
  });

  it("derive_from_reference skips reference mode choice but not source_transform", () => {
    const draft = draftWithSource("derive_from_reference");
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(shouldShowSourceTransformStep(draft), false);
  });

  it("derive_from_reference with derivationSource only still skips reference mode choice", () => {
    const draft = emptyDerivationWizardDraft("character");
    draft.derivationSource = {
      sourceType: "library_asset",
      sourceKind: "character",
      assetId: "asset-1",
      assetName: "Globe Man",
      referenceImageUrl: "https://example.com/globe.png",
      referenceStorageKey: "uploads/globe.png",
    };
    draft.derivationStyleDnaStatus = "ready";
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(draft.sourceReferenceImageUrl, "");
  });

  it("derivation flow omits reference until source exists, then inserts after preview", () => {
    let draft = emptyDerivationWizardDraft("character");
    let steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    assert.equal(steps.includes("reference"), false);

    draft = draftWithSource("derive_from_reference");
    draft.derivationTransformChoice = "mascot";
    draft.summaryPrompt = "Mascot variant.";
    steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const previewIdx = steps.indexOf("derive_preview");
    const promptIdx = steps.indexOf("transform_prompt");
    const refIdx = steps.indexOf("reference");
    assert.ok(previewIdx >= 0);
    assert.ok(promptIdx > previewIdx);
    assert.ok(refIdx > promptIdx);
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(
      wizardStepLabelKeyForDraft("reference", draft),
      "studio.assetCreation.wizard.step.generateVariant"
    );
  });

  it("screenshot derivation flow never requires reference mode choice copy when source exists", () => {
    const styleDna: AssetStyleDna = {
      visualStyle: "flat cartoon",
      colorTheme: "blue and orange",
      shapeLanguage: "rounded",
      outfitHints: "cap",
      brandIdentity: "playful globe mascot",
      mascotTraits: "friendly",
      confidence: 0.9,
    };
    let draft = emptyDerivationWizardDraft("character");
    draft = {
      ...draft,
      derivationSource: {
        sourceType: "upload",
        sourceKind: "character",
        assetId: null,
        assetName: "Globe Man",
        referenceImageUrl: "https://example.com/globe.png",
        referenceStorageKey: "uploads/globe.png",
      },
      derivationStyleDna: styleDna,
      derivationStyleDnaStatus: "ready",
      derivationTargetKind: "character",
      derivationTransformChoice: "mascot",
      summaryPrompt: "A mascot variant preserving Globe Man style DNA.",
      referenceMode: "generate",
    };
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const previewIdx = steps.indexOf("derive_preview");
    const promptIdx = steps.indexOf("transform_prompt");
    const refIdx = steps.indexOf("reference");
    const readinessIdx = steps.indexOf("readiness");
    assert.ok(previewIdx >= 0);
    assert.ok(promptIdx > previewIdx);
    assert.ok(refIdx > promptIdx);
    assert.ok(readinessIdx > refIdx);
    assert.equal(shouldSkipReferenceModeChoice(draft), true);
    assert.equal(auditSourceReferenceFlows(draft).find((r) => r.path === "derive_from_reference")!.showReferenceModeChoice, false);
  });

  it("source upload persists across steps via sourceReference fields", () => {
    const draft = draftWithSource("image_only");
    assert.equal(draft.sourceReferenceImageUrl, "https://example.com/globe.png");
    assert.equal(draft.sourceReferenceName, "Globe Man");
    assert.equal(draft.referenceImageUrl, "");
  });

  it("prompt transformation requires choice or custom text", () => {
    const draft = draftWithSource("image_only");
    assert.equal(canAdvanceFromSourceTransformStep(draft), false);
    draft.sourceTransformChoice = "custom";
    draft.sourceTransformCustom = "Garden mascot with green cap and basket.";
    assert.equal(canAdvanceFromSourceTransformStep(draft), true);
  });

  it("builds summary prompt with preservation rules and user text", () => {
    const draft = draftWithSource("image_only");
    draft.sourceTransformChoice = "custom";
    draft.sourceTransformCustom =
      "Maak hier een Garden mascotte van met groene pet en mand.";
    const summary = buildSourceTransformSummaryPrompt(draft);
    assert.ok(summary.includes("Globe Man"));
    assert.ok(summary.toLowerCase().includes("preserve"));
    assert.ok(summary.includes("Garden mascotte"));
  });

  it("includes user prompt and preservation in generation prompt", () => {
    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "character",
      summaryPrompt: "Garden mascot variant.",
      sourceReference: {
        name: "Globe Man",
        transformLabel: "Garden",
        userPrompt: "green cap and garden basket",
      },
    });
    assert.ok(prompt.includes("Globe Man"));
    assert.ok(prompt.includes("green cap"));
    assert.ok(prompt.toLowerCase().includes("preserve"));
  });

  it("generic user sees generic character options without HomeCheff roles", () => {
    const def = buildSourceTransformChoiceDef("character", []);
    assert.ok(def);
    const ids = def!.options.map((o) => o.id);
    assert.ok(ids.includes("host"));
    assert.ok(ids.includes("mascot"));
    assert.equal(ids.includes("chef"), false);
    assert.equal(ids.includes("garden"), false);
  });

  it("HomeCheff library surfaces Chef/Garden/Designer when relevant", () => {
    const def = buildSourceTransformChoiceDef("character", [
      {
        sourceType: "library_asset",
        kind: "character",
        assetId: "a1",
        name: "Chef Mascot",
        canonicalRole: "chef",
        referenceImageUrl: "https://example.com/chef.png",
        referenceStorageKey: "",
        thumbnailUrl: "https://example.com/thumb.png",
      },
    ]);
    assert.ok(def);
    const ids = def!.options.map((o) => o.id);
    assert.ok(ids.includes("chef"));
  });

  it("character, prop, and location all expose source transform defs", () => {
    assert.ok(buildSourceTransformChoiceDef("character", []));
    assert.ok(buildSourceTransformChoiceDef("prop", []));
    assert.ok(buildSourceTransformChoiceDef("location", []));
    assert.equal(buildSourceTransformChoiceDef("world", []), null);
  });

  it("audit table marks image paths with generateDirect when source exists", () => {
    const draft = emptyAssetWizardDraft("character", "design");
    const rows = auditSourceReferenceFlows(draft);
    const imageOnly = rows.find((r) => r.path === "image_only")!;
    assert.equal(imageOnly.hasSourceReference, true);
    assert.equal(imageOnly.showReferenceModeChoice, false);
    assert.equal(imageOnly.showSourceTransformStep, true);
    assert.equal(imageOnly.generateDirect, true);
  });
});
