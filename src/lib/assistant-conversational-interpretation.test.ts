import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { containsLiteralUserPromptCopy } from "@/lib/assistant-interpretation-engine";
import { interpretConversationally } from "@/lib/assistant-conversational-interpretation";

describe("assistant v6 conversational interpretation", () => {
  it("maps subtle celebrity entrance to subtle intensity and constraints", () => {
    const message =
      "Ik wil eigenlijk zo'n filmpje waar ik een beetje beroemd aankom lopen, niet overdreven, mensen kijken wel maar niet allemaal tegelijk.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.intensity, "subtle");
    assert.ok(interpretation?.constraints?.includes("not too exaggerated"));
    assert.ok(interpretation?.constraints?.includes("subtle crowd reactions"));
    assert.ok(interpretation?.styleHints?.some((hint) => hint.includes("celebrity")));
  });

  it("maps fans recognize me street scene", () => {
    const message = "Ik wil zo'n filmpje waarin mensen me herkennen op straat.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.likelyPresetId, "fans_recognize_me");
    assert.ok(interpretation?.followUpQuestions.length >= 1);
    assert.ok(interpretation?.styleHints?.includes("street scene"));
  });

  it("returns football alternatives for vague football prompt", () => {
    const message = "Doe iets met voetbal.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.confidence, "low");
    assert.ok((interpretation?.alternativeIntents?.length ?? 0) >= 3);
    assert.ok(interpretation?.followUpQuestions.some((q) => q.id === "football_variant"));
  });

  it("maps clothing-only outfit constraints to prefill hints", () => {
    const message = "Ik wil met die jas, maar alleen kleding, mijn gezicht moet hetzelfde blijven.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "outfit_from_reference");
    assert.equal(interpretation?.prefillHints?.protectFace, true);
    assert.equal(interpretation?.prefillHints?.clothingOnly, true);
    assert.equal(interpretation?.prefillHints?.protectPose, true);
  });

  it("adds comedy sports car follow-up", () => {
    const message = "Maak iets grappigs met mij en een sportwagen.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.ok(interpretation?.styleHints?.includes("comedy"));
    assert.ok(interpretation?.followUpQuestions.some((q) => q.id === "car_moment"));
  });

  it("limits follow-up questions by confidence", () => {
    const high = interpretConversationally(
      "Ik wil alleen die jas veranderen, niet mijn gezicht.",
      { locale: "nl" }
    );
    const low = interpretConversationally("Doe iets met voetbal.", { locale: "nl" });
    assert.ok(high);
    assert.ok(low);
    assert.ok((high?.followUpQuestions.length ?? 0) <= 1);
    assert.ok((low?.followUpQuestions.length ?? 0) <= 5);
  });

  it("does not copy full user prompt into interpreted fields", () => {
    const message =
      "Ik wil eigenlijk zo'n filmpje waar ik een beetje beroemd aankom lopen, niet overdreven.";
    const interpretation = interpretConversationally(message, { locale: "nl" });
    if (!interpretation) {
      return;
    }
    assert.equal(containsLiteralUserPromptCopy(interpretation, message), false);
  });

  it("works without LLM (rules source)", () => {
    const interpretation = interpretConversationally("Doe iets met voetbal.", { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.source, "rules");
  });
});
