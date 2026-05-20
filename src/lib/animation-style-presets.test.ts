import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ANIMATION_STYLE_ID,
  applyAnimationStyleToPosterSettings,
  getAnimationStyle,
  normalizeAnimationStyleId,
  resolveAnimationStyleIdFromSettings,
} from "@/lib/animation-style-presets";

describe("animation style presets", () => {
  it("defaults to cartoon animation", () => {
    assert.equal(DEFAULT_ANIMATION_STYLE_ID, "cartoon_animation");
    assert.equal(normalizeAnimationStyleId(undefined), "cartoon_animation");
  });

  it("applies hidden pipeline settings from style card", () => {
    const settings = applyAnimationStyleToPosterSettings("fast_social_animation");
    assert.equal(settings.motionEnergy, "viral");
    assert.equal(settings.segmentTransitionType, "capcut_smooth");
    assert.equal(settings.preserveAllText, true);
    assert.equal(settings.animationStyleId, "fast_social_animation");
  });

  it("maps legacy premium preset to animation style", () => {
    assert.equal(
      resolveAnimationStyleIdFromSettings({ version: 1, premiumPresetId: "luxury_glow" }),
      "product_showcase"
    );
  });

  it("product showcase uses cinematic energy", () => {
    const style = getAnimationStyle("product_showcase");
    assert.equal(style.motionEnergy, "cinematic");
    assert.equal(style.emotionalActingPreset, "confident_presenter");
  });
});
