import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";
import { buildDirectorFieldSuggestions } from "@/lib/studio-v11-director-suggestions";
import {
  questionLimitForOverall,
  resolveOverallDirectorConfidence,
  scoreDirectorFieldConfidences,
} from "@/lib/studio-v11-director-confidence";
import { generateDirectorDynamicQuestions } from "@/lib/studio-v11-director-questions";
import {
  answerDirectorQuestion,
  buildStudioV11DirectorWizard,
  startDirectorQuestions,
} from "@/lib/studio-v11-director-wizard";

describe("studio v11 director wizard", () => {
  it("extracts structured character and location suggestions from prompt", () => {
    const suggestions = buildDirectorFieldSuggestions({
      idea: "Maak een video van Sergio en de drie mascottes in Rotterdam.",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    assert.ok(suggestions.characters.includes("Sergio"));
    assert.ok(suggestions.characters.some((c) => /mascot/i.test(c)));
    assert.ok(suggestions.locations.some((l) => /rotterdam/i.test(l)));
    assert.ok(!suggestions.characters[0]!.includes("Maak een video"));
  });

  it("assigns high confidence for explicit rotterdam + mascots prompt", () => {
    const idea =
      "Maak een 30 seconden reclamevideo voor ondernemers in Rotterdam met Sergio en drie mascottes. Laat mensen registreren op HomeCheff. Alleen voice-over.";
    const suggestions = buildDirectorFieldSuggestions({
      idea,
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    const confidences = scoreDirectorFieldConfidences({
      idea,
      selections: DEFAULT_BRIEF_SELECTIONS,
      suggestions,
    });
    const characters = confidences.find((c) => c.field === "characters");
    const locations = confidences.find((c) => c.field === "locations");
    assert.equal(characters?.level, "high");
    assert.equal(locations?.level, "high");
    const overall = resolveOverallDirectorConfidence(confidences);
    assert.equal(overall, "high");
    const questions = generateDirectorDynamicQuestions({ confidences, locale: "nl" });
    assert.ok(questions.length <= 2);
  });

  it("generates more questions for vague prompts", () => {
    const suggestions = buildDirectorFieldSuggestions({
      idea: "video",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "en",
    });
    const confidences = scoreDirectorFieldConfidences({
      idea: "video",
      selections: DEFAULT_BRIEF_SELECTIONS,
      suggestions,
    });
    const overall = resolveOverallDirectorConfidence(confidences);
    const limit = questionLimitForOverall(overall);
    const questions = generateDirectorDynamicQuestions({ confidences, locale: "en" });
    assert.ok(questions.length >= limit.min);
    assert.ok(questions.length <= limit.max);
  });

  it("applies answers and completes wizard flow", () => {
    const wizard = buildStudioV11DirectorWizard({
      idea: "Promoot ons platform voor ondernemers",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    const started = startDirectorQuestions(wizard);
    assert.equal(started.phase, "questions");
    if (started.questions[0]) {
      const answered = answerDirectorQuestion(started, started.questions[0].id, "discover");
      assert.ok(answered.answers[started.questions[0].id]);
    }
  });
});
