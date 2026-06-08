import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReferenceGenerationPayload } from "@/lib/studio-asset-wizard-reference-generation";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { wizardStepSequenceForDraft } from "@/lib/studio-asset-wizard-flow";
import {
  buildSourceTransformSummaryPrompt,
  buildSourceTransformUserPrompt,
  buildTransformPromptPreview,
  canAdvanceFromTransformPromptStep,
} from "@/lib/studio-asset-transform-prompt";

describe("studio-asset-transform-prompt", () => {
  it("includes custom instruction, preserve, change, and forbidden in summary prompt", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      sourceTransformChoice: "mascot",
      sourceTransformInstruction: "Chef mascot with hat and spoon.",
      sourceTransformPreserve: "white face, round shape, brand colors",
      sourceTransformChange: "chef role and outfit",
      sourceTransformForbidden: "no green skin, no text",
    };

    const summary = buildSourceTransformSummaryPrompt(draft);
    assert.ok(summary.includes("Globe Man"));
    assert.ok(summary.includes("Chef mascot"));
    assert.ok(summary.includes("Preserve: white face"));
    assert.ok(summary.includes("Change: chef role"));
    assert.ok(summary.includes("Do not: no green skin"));
  });

  it("builds user prompt payload with forbidden elements", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      sourceTransformChoice: "mascot",
      sourceTransformInstruction: "Garden mascot with green cap.",
      sourceTransformChange: "garden role",
      sourceTransformForbidden: "no logo distortion",
    };

    const userPrompt = buildSourceTransformUserPrompt(draft);
    assert.ok(userPrompt.includes("Garden mascot"));
    assert.ok(userPrompt.includes("no logo distortion"));

    const payload = buildReferenceGenerationPayload(draft, "character", "gen-1");
    assert.equal(payload.sourceReference?.userPrompt, userPrompt);
    assert.equal(payload.sourceReference?.forbiddenHint, "no logo distortion");
  });

  it("does not allow advancing from transform prompt until generation preview exists", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      sourceTransformChoice: "mascot",
      referenceGenerationStatus: "idle" as const,
    };
    assert.equal(canAdvanceFromTransformPromptStep(draft), false);
    draft.referenceGenerationStatus = "preview";
    draft.generatedReferencePreviewUrl = "https://example.com/out.png";
    assert.equal(canAdvanceFromTransformPromptStep(draft), true);
  });

  it("inserts transform_prompt before reference in source image flow", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "image_only"),
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      sourceTransformChoice: "mascot",
    };
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const transformIdx = steps.indexOf("source_transform");
    const promptIdx = steps.indexOf("transform_prompt");
    const refIdx = steps.indexOf("reference");
    assert.ok(transformIdx >= 0);
    assert.ok(promptIdx > transformIdx);
    assert.ok(refIdx > promptIdx);
  });

  it("builds compact preview for confirmation UI", () => {
    const draft = {
      ...emptyAssetWizardDraft("character", "derive_from_reference"),
      derivationFlow: true,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "uploads/globe.png",
        name: "Globe Man",
      }),
      derivationTransformChoice: "mascot",
      sourceTransformForbidden: "no text",
    };
    const preview = buildTransformPromptPreview(draft);
    assert.equal(preview.sourceName, "Globe Man");
    assert.ok(preview.compactPrompt.includes("Globe Man"));
    assert.ok(preview.compactPrompt.includes("no text"));
  });
});
