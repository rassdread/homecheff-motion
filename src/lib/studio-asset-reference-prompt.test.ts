import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";

describe("studio-asset-reference-prompt", () => {
  it("builds character reference prompt from wizard summary", () => {
    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "character",
      summaryPrompt:
        "A friendly 3D cartoon chef mascot with rounded shapes and green HomeCheff colors.",
      choices: {
        character_type: "chef",
        character_style: "3d_cartoon",
        character_personality: "warm",
        character_outfit: "chef",
        character_world: "homecheff",
      },
    });
    assert.ok(prompt.includes("friendly 3D cartoon chef"));
    assert.ok(prompt.includes("Character reference portrait"));
    assert.ok(prompt.includes("No text overlays"));
    assert.ok(prompt.includes("Personality: warm"));
  });

  it("builds prop reference prompt with usage boost", () => {
    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "prop",
      summaryPrompt: "A cinematic wooden spice box with warm HomeCheff colors.",
      choices: {
        prop_category: "food",
        prop_material: "wood",
        prop_usage: "hero",
      },
    });
    assert.ok(prompt.includes("Hero product"));
    assert.ok(prompt.includes("Material: wood"));
    assert.ok(prompt.includes("Usage: hero prop"));
  });

  it("builds location reference prompt with lighting", () => {
    const prompt = buildAssetReferenceGenerationPrompt({
      kind: "location",
      summaryPrompt: "A warm community garden at golden hour.",
      choices: {
        location_type: "garden",
        location_mood: "warm",
        location_lighting: "golden_hour",
      },
    });
    assert.ok(prompt.includes("Environment establishing shot"));
    assert.ok(prompt.includes("Lighting: golden_hour"));
  });
});
