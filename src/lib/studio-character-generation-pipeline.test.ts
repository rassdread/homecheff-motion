import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { emptyChoiceBasedWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  canRunCharacterCreationPipeline,
  characterHasReadyImage,
  characterNeedsReferenceGeneration,
  finalizeDraftForCharacterSave,
  resolveCharacterPipelineName,
} from "@/lib/studio-character-generation-pipeline";

function characterDraft(patch: Partial<AssetWizardDraft> = {}): AssetWizardDraft {
  return {
    ...emptyChoiceBasedWizardDraft("character"),
    name: "Chef Mascot",
    summaryPrompt: "A friendly cartoon chef mascot.",
    referenceMode: "generate",
    ...patch,
  };
}

describe("studio-character-generation-pipeline", () => {
  it("resolves pipeline name from draft name or summary", () => {
    assert.equal(resolveCharacterPipelineName(characterDraft()), "Chef Mascot");
    assert.equal(
      resolveCharacterPipelineName(characterDraft({ name: "", summaryPrompt: "Short" })),
      "Short"
    );
  });

  it("detects ready image from reference or generated preview", () => {
    assert.equal(characterHasReadyImage(characterDraft()), false);
    assert.equal(
      characterHasReadyImage(
        characterDraft({
          referenceImageUrl: "https://example.com/a.png",
          referenceStorageKey: "key-a",
        })
      ),
      true
    );
    assert.equal(
      characterHasReadyImage(
        characterDraft({
          generatedReferencePreviewUrl: "https://example.com/b.png",
          generatedReferenceStorageKey: "key-b",
        })
      ),
      true
    );
  });

  it("detects when reference generation is required", () => {
    assert.equal(characterNeedsReferenceGeneration(characterDraft()), true);
    assert.equal(
      characterNeedsReferenceGeneration(
        characterDraft({
          referenceImageUrl: "https://example.com/a.png",
          referenceStorageKey: "key-a",
        })
      ),
      false
    );
  });

  it("allows pipeline when name and generatable summary exist", () => {
    assert.equal(canRunCharacterCreationPipeline(characterDraft()), true);
    assert.equal(
      canRunCharacterCreationPipeline(characterDraft({ kind: "prop" })),
      false
    );
    assert.equal(
      canRunCharacterCreationPipeline(characterDraft({ name: "", summaryPrompt: "" })),
      false
    );
  });

  it("finalizes draft for save using generated preview", () => {
    const finalized = finalizeDraftForCharacterSave(
      characterDraft({
        referenceImageUrl: "",
        generatedReferencePreviewUrl: "https://example.com/out.png",
        generatedReferenceStorageKey: "out-key",
      })
    );
    assert.equal(finalized.referenceImageUrl, "https://example.com/out.png");
    assert.equal(finalized.referenceStorageKey, "out-key");
  });
});
