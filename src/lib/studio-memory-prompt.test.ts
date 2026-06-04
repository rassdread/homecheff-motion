import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSceneMemoryContinuityPrompt } from "@/lib/studio-memory-prompt";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

describe("studio-memory-prompt", () => {
  it("builds chef mascot continuity from memory bundle", () => {
    const bundle: SceneMemoryBundle = {
      characters: [
        {
          id: "chef",
          name: "Chef",
          role: "mascot",
          appearanceMemory: "White chef hat. Green HomeCheff apron. White mascot face. No skin tone.",
          personalityMemory: "Friendly. Energetic. Community focused.",
          continuityNotes: "",
          defaultClothing: "Green apron",
          defaultAccessories: "",
          visualKeywords: "clean, professional, approachable",
          referenceImageUrl: "https://example.com/chef.png",
          primaryReferenceImageId: "chef",
          referenceNotes: "",
          identityStrength: "strong",
          continuityStrength: "strong",
          worldProfileId: "world-1",
          worldProfileName: "HomeCheff Universe",
        },
      ],
      location: null,
      props: [],
      world: {
        id: "world-1",
        name: "HomeCheff Universe",
        description: "",
        visualStyle: "Warm brand promo",
        tone: "Friendly",
        continuityRules: "Always on-brand",
        continuityStrength: "strong",
      },
      continuityStrength: "strong",
    };

    const prompt = buildSceneMemoryContinuityPrompt(bundle);
    assert.match(prompt, /Chef mascot identity/i);
    assert.match(prompt, /chef hat/i);
    assert.match(prompt, /HomeCheff Universe/i);
    assert.match(prompt, /clean, professional, approachable/i);
  });
});
