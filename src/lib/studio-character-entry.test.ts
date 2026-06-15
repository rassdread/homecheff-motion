import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterExtractionDraft,
  buildDraftFromCharacterConcept,
  isCharacterRequirementKind,
  visionObjectTypeLabel,
} from "@/lib/studio-character-entry-actions";
import { enrichCharacterFromWizard } from "@/lib/studio-character-wizard";
import { CHARACTER_WIZARD_DEFAULTS } from "@/lib/studio-character-wizard";

describe("studio character entry actions", () => {
  it("detects character requirement kinds", () => {
    assert.equal(isCharacterRequirementKind("character"), true);
    assert.equal(isCharacterRequirementKind("mascot"), true);
    assert.equal(isCharacterRequirementKind("music"), false);
  });

  it("maps vision object types for NL labels", () => {
    assert.equal(visionObjectTypeLabel("mascot", "nl"), "Mascotte");
    assert.equal(visionObjectTypeLabel("logo", "en"), "Logo");
  });

  it("builds extraction draft for exact mode with source image", () => {
    const draft = buildCharacterExtractionDraft({
      imageUrl: "https://cdn.example.com/photo.jpg",
      storageKey: "k1",
      mode: "exact",
      customization: {
        clothing: "",
        props: "",
        colors: "",
        style: "",
        age: "",
        gender: "",
        brandTraits: "",
      },
    });
    assert.equal(draft.referenceImageUrl, "https://cdn.example.com/photo.jpg");
    assert.equal(draft.referenceMode, "upload");
  });

  it("builds wizard draft from character concept", () => {
    const concept = enrichCharacterFromWizard(CHARACTER_WIZARD_DEFAULTS);
    const draft = buildDraftFromCharacterConcept(concept);
    assert.equal(draft.kind, "character");
    assert.equal(draft.referenceMode, "generate");
    assert.ok(draft.summaryPrompt.includes("human"));
  });
});
