import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { presentAssetReferenceGenerationError } from "@/lib/studio-asset-reference-errors";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import {
  hasWizardSourceReference,
  recordWizardSourceReference,
  resolveWizardSourceReference,
} from "@/lib/studio-asset-wizard-source-reference";
import { emptyChoiceBasedWizardDraft } from "@/lib/studio-asset-wizard-draft";

describe("studio-asset-wizard-generation", () => {
  it("persists uploaded image as sourceReference through wizard draft", () => {
    let draft = emptyChoiceBasedWizardDraft("character");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
    };
    assert.equal(hasWizardSourceReference(draft), true);
    const source = resolveWizardSourceReference(draft)!;
    assert.equal(source.sourceReferenceName, "Globe Man");
    assert.equal(source.sourceReferenceImageUrl, "https://example.com/globe.png");
  });

  it("detects derivationSource as wizard source reference", () => {
    const draft = emptyChoiceBasedWizardDraft("character");
    draft.derivationFlow = true;
    draft.derivationSource = {
      sourceType: "library_asset",
      sourceKind: "character",
      assetId: "a1",
      assetName: "Globe Man",
      referenceImageUrl: "https://example.com/globe.png",
      referenceStorageKey: "uploads/globe.png",
    };
    assert.equal(hasWizardSourceReference(draft), true);
    assert.equal(resolveWizardSourceReference(draft)!.sourceReferenceName, "Globe Man");
  });

  it("includes source-reference preservation in generation prompt", () => {
    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "character",
      summaryPrompt: "Chef variant for animation.",
      choices: { character_type: "chef" },
      sourceReference: { name: "Globe Man", transformLabel: "Chef" },
    });
    assert.ok(prompt.includes("Globe Man"));
    assert.ok(prompt.includes("Chef variant"));
    assert.ok(prompt.toLowerCase().includes("preserve"));
  });

  it("maps provider response_format errors to user-friendly key", () => {
    const presentation = presentAssetReferenceGenerationError(
      "Unknown parameter: 'response_format'"
    );
    assert.equal(
      presentation.userMessageKey,
      "studio.assetCreation.reference.generateFailedUser"
    );
    assert.ok(presentation.providerMessage.includes("response_format"));
    assert.equal(presentation.code, "PROVIDER_PARAMETER");
  });

  it("keeps raw provider message for admin debug", () => {
    const presentation = presentAssetReferenceGenerationError("OpenAI rate limit exceeded (429)");
    assert.equal(presentation.code, "RATE_LIMIT");
    assert.ok(presentation.providerMessage.includes("429"));
  });
});
