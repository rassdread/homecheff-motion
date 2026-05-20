import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMOTIONAL_ACTING_PRESET_IDS,
  buildEmotionalActingPromptBlock,
  getEmotionalActingPreset,
  normalizeEmotionalActingPresetId,
} from "@/lib/premium-emotional-presets";

describe("premium emotional presets", () => {
  it("exposes six emotional acting presets", () => {
    assert.equal(EMOTIONAL_ACTING_PRESET_IDS.length, 6);
    assert.ok(EMOTIONAL_ACTING_PRESET_IDS.includes("playful_mascot"));
  });

  it("builds acting prompt blocks", () => {
    const block = buildEmotionalActingPromptBlock("excited_seller");
    assert.match(block, /EXCITED SELLER ACTING/);
    assert.match(block, /speech bubbles/);
  });

  it("maps preset to character motion", () => {
    const preset = getEmotionalActingPreset("confident_presenter");
    assert.equal(preset.motionEnergy, "expressive");
    assert.match(preset.characterMotion.personality ?? "", /presenter/i);
  });

  it("normalizes unknown ids to undefined", () => {
    assert.equal(normalizeEmotionalActingPresetId("invalid"), undefined);
    assert.equal(normalizeEmotionalActingPresetId("luxury_showcase"), "luxury_showcase");
  });
});
