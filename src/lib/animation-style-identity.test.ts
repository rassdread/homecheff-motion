import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANIMATION_STYLE_IDENTITIES,
  buildAnimationStyleIdentityPromptBlock,
  getAnimationStyleIdentity,
  identityCharacterMotion,
  shouldUseSharedGroupDirecting,
} from "@/lib/animation-style-identity";
import { ANIMATION_STYLE_IDS } from "@/lib/animation-style-types";
import { applyAnimationStyleToPosterSettings } from "@/lib/animation-style-presets";

describe("animation style identity", () => {
  it("defines a full identity for every animation style", () => {
    for (const id of ANIMATION_STYLE_IDS) {
      const identity = ANIMATION_STYLE_IDENTITIES[id];
      assert.equal(identity.id, id);
      assert.ok(identity.visual.progressBar.length > 0);
      assert.ok(identity.directing.promptBlock.includes("CREATIVE IDENTITY"));
      assert.equal(identity.render.assemblyMode, "raw_motion_concat");
    }
  });

  it("builds a combined prompt block for Vidu", () => {
    const block = buildAnimationStyleIdentityPromptBlock("marketplace_story");
    assert.match(block, /MARKETPLACE STORY/);
    assert.match(block, /SEGMENTATION & RENDER PROFILE/);
  });

  it("enables shared group directing for community styles", () => {
    assert.equal(shouldUseSharedGroupDirecting("marketplace_story"), true);
    assert.equal(shouldUseSharedGroupDirecting("cartoon_animation"), true);
    assert.equal(shouldUseSharedGroupDirecting("product_showcase"), false);
  });

  it("applyAnimationStyle wires identity character motion", () => {
    const settings = applyAnimationStyleToPosterSettings("product_showcase");
    const motion = identityCharacterMotion("product_showcase");
    assert.equal(settings.characterMotion?.personality, motion.personality);
    assert.equal(getAnimationStyleIdentity("product_showcase").visual.accentTone, "gold");
  });
});
