import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyWizardChoicesToFields,
  canAdvanceFromChoiceStep,
  canAdvanceFromReferenceStep,
  CHARACTER_WIZARD_CHOICES,
  wizardStepsForChoiceFlow,
} from "@/lib/studio-asset-wizard-choices";
import {
  characterFormValuesFromWizardDraft,
  emptyChoiceBasedWizardDraft,
  propFormValuesFromWizardDraft,
  syncChoiceDraft,
} from "@/lib/studio-asset-wizard-draft";
import { buildWizardSummaryPrompt } from "@/lib/studio-asset-wizard-summary-prompt";
import {
  entryPathNeedsInputStep,
  entryPathNeedsProposalStep,
  nextWizardStep,
  wizardStepsForEntryPath,
} from "@/lib/studio-asset-wizard-flow";

describe("studio-asset-wizard-flow", () => {
  it("keeps guided design path in wizard after entry (no early builder handoff)", () => {
    const steps = wizardStepsForEntryPath("design", { includeKind: false });
    assert.deepEqual(steps, ["entry", "essentials", "readiness", "save"]);
    assert.equal(nextWizardStep(steps, "entry"), "essentials");
  });

  it("choice flow for character includes reference and review before save", () => {
    const steps = wizardStepsForChoiceFlow("character", { includeKind: false });
    assert.equal(steps.filter((s) => s === "choice").length, CHARACTER_WIZARD_CHOICES.length);
    assert.ok(steps.includes("reference"));
    const readinessIndex = steps.indexOf("readiness");
    const saveIndex = steps.indexOf("save");
    assert.ok(saveIndex > readinessIndex);
  });

  it("world choice flow skips reference step", () => {
    const steps = wizardStepsForChoiceFlow("world", { includeKind: false });
    assert.equal(steps.includes("reference"), false);
    assert.ok(steps.includes("readiness"));
    assert.ok(steps.includes("save"));
  });

  it("includes input and proposal for prompt flow", () => {
    const steps = wizardStepsForEntryPath("prompt_only", { includeKind: false });
    assert.deepEqual(steps, ["entry", "input", "proposal", "essentials", "readiness", "save"]);
    assert.equal(entryPathNeedsInputStep("prompt_only"), true);
    assert.equal(entryPathNeedsProposalStep("prompt_only"), true);
  });

  it("builds live summary from character choices", () => {
    const choices = {
      character_type: "chef",
      character_style: "3d_cartoon",
      character_shape: "rounded",
      character_personality: "warm",
      character_outfit: "chef",
      character_world: "homecheff",
    };
    const summary = buildWizardSummaryPrompt("character", choices, {}, {
      "character_type.chef": "Chef",
      "character_style.3d_cartoon": "3D cartoon",
      "character_shape.rounded": "Rounded",
      "character_personality.warm": "Friendly",
      "character_outfit.chef": "Chef outfit",
      "character_world.homecheff": "HomeCheff",
    });
    assert.ok(summary.toLowerCase().includes("chef"));
    assert.ok(summary.toLowerCase().includes("cartoon"));
  });

  it("maps choices to identity fields and form values", () => {
    let draft = emptyChoiceBasedWizardDraft("character");
    draft = syncChoiceDraft(draft, {
      choices: {
        character_type: "mascot",
        character_style: "3d_cartoon",
        character_personality: "warm",
        character_outfit: "chef",
      },
      summaryPrompt: "A friendly 3D cartoon mascot.",
      name: "Studio Mascot",
      description: "A friendly 3D cartoon mascot.",
    });
    const fields = applyWizardChoicesToFields("character", draft.choices, draft.customTexts);
    assert.equal(fields.characterType, "mascot");
    const values = characterFormValuesFromWizardDraft(draft);
    assert.equal(values.identity.characterType, "mascot");
    assert.equal(values.identity.personality, "warm");
  });

  it("reference upload path requires image before advance", () => {
    assert.equal(canAdvanceFromReferenceStep("upload", ""), false);
    assert.equal(canAdvanceFromReferenceStep("upload", "https://example.com/a.jpg"), true);
    assert.equal(canAdvanceFromReferenceStep("skip", ""), true);
    assert.equal(canAdvanceFromReferenceStep("generate", ""), false);
    assert.equal(
      canAdvanceFromReferenceStep("generate", "https://example.com/generated.jpg"),
      true
    );
  });

  it("optional voice step allows advance without selection", () => {
    const voiceDef = CHARACTER_WIZARD_CHOICES.find((d) => d.id === "character_voice")!;
    assert.equal(canAdvanceFromChoiceStep(voiceDef, {}, {}), true);
  });

  it("maps prop essentials from draft", () => {
    const draft = emptyChoiceBasedWizardDraft("prop");
    draft.choices = { prop_category: "food", prop_material: "wood" };
    draft.fields = applyWizardChoicesToFields("prop", draft.choices, {});
    draft.name = "Food Cart";
    const values = propFormValuesFromWizardDraft(draft);
    assert.equal(values.identity.material, "wood");
  });
});
