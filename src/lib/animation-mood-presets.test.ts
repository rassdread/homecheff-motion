import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyAnimationStyleToPosterSettings } from "@/lib/animation-style-presets";
import { applyMoodToPosterSettings } from "@/lib/animation-mood-presets";

describe("animation mood presets", () => {
  it("applies mood overrides to poster settings", () => {
    const base = applyAnimationStyleToPosterSettings("cartoon_animation");
    const withMood = applyMoodToPosterSettings(base, "luxury");
    assert.equal(withMood.animationMood, "luxury");
    assert.equal(withMood.motionEnergy, "cinematic");
    assert.equal(withMood.emotionalActingPreset, "luxury_showcase");
  });
});
