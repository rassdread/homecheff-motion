import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildComicStripSegmentBridgeHint,
  buildComicStripWorldTransitionBlock,
  COMIC_STRIP_POWER_LINE,
  pickComicStripTransitionBridge,
  shouldUseFullComicStripMode,
} from "@/lib/vidu-comic-strip-transitions";
import { buildInstantVideoPrompt } from "@/lib/instant-premium-prompt";
import { buildCompactViduMotionPrompt, VIDU_PROMPT_MAX_CHARS } from "@/lib/vidu-prompt-budget";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";

describe("vidu comic strip world transitions", () => {
  it("full comic mode includes bridge rotation", () => {
    const block = buildComicStripWorldTransitionBlock({
      animationStyleId: "cartoon_animation",
      transitionOrder: 0,
      transitionTotal: 3,
    });
    assert.match(block, /COMIC-STRIP WORLD/i);
    assert.match(block, /camera push\/pan/i);
    assert.match(block, /living comic-strip movie/i);
    assert.match(block, /hard cuts/i);
    assert.ok(!block.includes("One world, one story"));
  });

  it("product showcase gets lighter multi-image flow", () => {
    const block = buildComicStripWorldTransitionBlock({
      animationStyleId: "product_showcase",
      transitionOrder: 1,
      transitionTotal: 2,
    });
    assert.match(block, /MULTI-IMAGE FLOW \(lighter merge\)/i);
    assert.match(block, /camera moves or object passes/i);
    assert.ok(!block.includes("COMIC-STRIP WORLD"));
  });

  it("single keyframe has no world block", () => {
    const block = buildComicStripWorldTransitionBlock({
      animationStyleId: "cartoon_animation",
      transitionOrder: 0,
      transitionTotal: 1,
    });
    assert.equal(block, "");
  });

  it("bridge hints cycle across segments", () => {
    const a = pickComicStripTransitionBridge(0);
    const b = pickComicStripTransitionBridge(1);
    assert.notEqual(a, b);
    const hint = buildComicStripSegmentBridgeHint({
      animationStyleId: "character_animation",
      transitionOrder: 1,
      transitionTotal: 4,
    });
    assert.match(hint, /Bridge: character bridge/i);
  });

  it("cartoon multi-segment compact motion still under budget", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      transitionOrder: 2,
      transitionTotal: 4,
    });
    assert.match(motion, /COMIC-STRIP WORLD/i);
    assert.ok(motion.length < VIDU_PROMPT_MAX_CHARS, `len ${motion.length}`);
  });

  it("full comic strip styles are recognized", () => {
    assert.ok(shouldUseFullComicStripMode("marketplace_story"));
    assert.ok(!shouldUseFullComicStripMode("clean_motion"));
  });

  it("power line matches infographic wording", () => {
    assert.match(COMIC_STRIP_POWER_LINE, /natural acting/i);
    assert.match(COMIC_STRIP_POWER_LINE, /fluid, creative and invisible/i);
  });

  it("instant prompt appends power line for multi-image", () => {
    const prompt = buildInstantVideoPrompt({
      stylePreset: "food_promo",
      duration: 8,
      aspectRatio: "9:16",
      selectedChips: [],
      polishSettingsRaw: { version: 1, animationStyleId: "cartoon_animation" },
      transitionOrder: 0,
      transitionTotal: 2,
    });
    assert.ok(prompt.endsWith(COMIC_STRIP_POWER_LINE));
  });
});
