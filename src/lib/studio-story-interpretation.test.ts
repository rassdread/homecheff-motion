import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyStoryDirection,
  interpretStoryIdea,
} from "@/lib/studio-story-interpretation";
import { DEFAULT_BRIEF_SELECTIONS } from "@/types/studio-production-brief-v3";

describe("studio story interpretation", () => {
  it("returns Dutch interpretation for nl locale", () => {
    const result = interpretStoryIdea({
      idea: "Ik loop door Rotterdam en ontmoet 3 mascottes",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    assert.equal(result.locale, "nl");
    assert.match(result.interpretation, /gemeenschap|gelijkgestemden|verbind/i);
    assert.equal(result.directions[0]?.title, "De reis");
    assert.ok(!/Ever wondered/i.test(result.interpretation));
  });

  it("returns English interpretation for en locale", () => {
    const result = interpretStoryIdea({
      idea: "I walk through Rotterdam and meet 3 mascots",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "en",
    });
    assert.equal(result.locale, "en");
    assert.match(result.interpretation, /community|people|story/i);
  });

  it("does not paraphrase user input literally as logline", () => {
    const result = interpretStoryIdea({
      idea: "ik loop langs locaties",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "nl",
    });
    assert.ok(!result.interpretation.toLowerCase().includes("ik loop langs locaties"));
  });

  it("generates three story directions", () => {
    const result = interpretStoryIdea({
      idea: "Community walk with mascots",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "en",
    });
    assert.equal(result.directions.length, 3);
  });

  it("updates scenes when direction is selected", () => {
    const base = interpretStoryIdea({
      idea: "Walk and meet mascots",
      selections: DEFAULT_BRIEF_SELECTIONS,
      locale: "en",
    });
    const next = applyStoryDirection(base, "missing_pieces");
    assert.equal(next.selectedDirectionId, "missing_pieces");
    assert.ok(next.scenes.length >= 3);
  });
});
