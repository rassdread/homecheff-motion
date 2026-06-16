import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPrefillPackageFromInterpretation,
  containsLiteralUserPromptCopy,
  interpretAssistantRequest,
  validateAssistantInterpretation,
} from "@/lib/assistant-interpretation-engine";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";

describe("homecheff assistant interpretation layer", () => {
  it("selfie + laten bewegen maps to prepare_motion_character", () => {
    const interpretation = interpretAssistantRequest(
      "Maak van deze selfie een poppetje dat ik later kan laten bewegen",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "prepare_motion_character");
    assert.equal(interpretation?.likelyActionId, "prepare_motion_character");
    assert.equal(interpretation?.inferredSettings.motionReadyNeeded, true);
    assert.equal(interpretation?.confidence, "medium");
  });

  it("jas veranderen niet gezicht maps to outfit_from_reference with protectFace", () => {
    const interpretation = interpretAssistantRequest(
      "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "outfit_from_reference");
    assert.equal(interpretation?.inferredSettings.clothingOnly, true);
    assert.equal(interpretation?.inferredSettings.protectFace, true);
    assert.equal(interpretation?.confidence, "high");
  });

  it("doelpunt prompt maps to motion video with feasibility note", () => {
    const interpretation = interpretAssistantRequest(
      "Ik wil zo'n filmpje maken waarin ik een doelpunt maak.",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "create_motion_video");
    assert.equal(interpretation?.targetModule, "motion");
    assert.ok(interpretation?.safetyOrFeasibilityNotes?.[0]?.includes("balcontact"));
    assert.ok(interpretation?.followUpQuestions.length >= 1);
  });

  it("promotievideo maps to studio story with concrete CTA", () => {
    const interpretation = interpretAssistantRequest(
      "Maak een promotievideo voor HomeCheff.",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "studio_story");
    assert.equal(interpretation?.inferredSettings.cta, "Ontdek HomeCheff");
    assert.ok(interpretation?.extractedEntities.characters?.includes("Chef mascotte"));
  });

  it("does not copy user prompt literally into fields", () => {
    const prompt =
      "Ik wil een video van mij en meerdere personages die door Rotterdam lopen";
    const interpretation = interpretAssistantRequest(prompt, { locale: "nl" });
    if (!interpretation) {
      return;
    }
    assert.equal(containsLiteralUserPromptCopy(interpretation, prompt), false);
    assert.notEqual(interpretation.understoodGoal, prompt);
  });

  it("low confidence scenarios include more questions than high confidence outfit", () => {
    const motion = interpretAssistantRequest(
      "Maak van deze selfie een poppetje dat ik later kan laten bewegen",
      { locale: "nl" }
    );
    const outfit = interpretAssistantRequest(
      "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      { locale: "nl" }
    );
    assert.ok(motion && outfit);
    assert.ok(motion.followUpQuestions.length > outfit.followUpQuestions.length);
  });

  it("high confidence outfit has at most one follow-up batch", () => {
    const outfit = interpretAssistantRequest(
      "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      { locale: "nl" }
    );
    assert.ok(outfit);
    assert.equal(outfit.confidence, "high");
    assert.ok(outfit.followUpQuestions.length <= 2);
  });

  it("fallback works without AI via orchestrator rules path", () => {
    const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
    const turn = processAssistantTurn({
      message: "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      memory: createAssistantSessionMemory(),
      snapshot,
      interpretation: null,
    });
    const proposal = turn.messages.find((m) => m.proposal)?.proposal;
    assert.ok(proposal?.prefillPackage);
    assert.ok(proposal.prefillPackage.interpretationSummary);
  });

  it("validates LLM-shaped output against schema and rejects literal copy", () => {
    const valid = validateAssistantInterpretation({
      originalMessage: "test prompt",
      understoodGoal: "A motion-ready character from a selfie.",
      detectedIntent: "prepare_motion_character",
      confidence: "medium",
      targetModule: "characters",
      likelyActionId: "prepare_motion_character",
      extractedEntities: { people: ["You / main character"] },
      inferredSettings: { motionReadyNeeded: true },
      missingInputs: ["selfie"],
      followUpQuestions: [
        {
          id: "body_style",
          label: "Realistic or cartoon?",
          reason: "Sets character style",
          options: ["Realistic", "Cartoon"],
          required: true,
          affectsSettings: ["style"],
        },
      ],
    });
    assert.ok(valid);

    const invalid = validateAssistantInterpretation({
      originalMessage: "Ik wil alleen die jas veranderen",
      understoodGoal: "Ik wil alleen die jas veranderen",
      detectedIntent: "outfit_from_reference",
      confidence: "high",
      targetModule: "fusion",
      likelyActionId: "create_fusion",
      extractedEntities: {},
      inferredSettings: {},
      missingInputs: [],
      followUpQuestions: [],
    });
    assert.equal(invalid, null);
  });

  it("builds prefill package from interpretation without provider calls", () => {
    const interpretation = interpretAssistantRequest(
      "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      { locale: "nl" }
    );
    assert.ok(interpretation);
    const pkg = buildPrefillPackageFromInterpretation(interpretation, {});
    assert.ok(pkg);
    assert.equal(pkg?.providerCalls, 0);
    assert.equal(pkg?.creditsConsumed, 0);
    assert.equal(pkg?.outputSettings?.clothingOnly, true);
    assert.ok(pkg?.interpretationSummary);
  });
});
