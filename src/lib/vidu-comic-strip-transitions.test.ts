import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildComicStripSegmentBridgeHint,
  buildComicStripWorldTransitionBlock,
  COMIC_STRIP_POWER_LINE,
  pickComicStripActingBeat,
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
    assert.match(block, /PREMIUM COMIC-STRIP ENGINE/i);
    assert.match(block, /character bridge/i);
    assert.match(block, /One world, one story, one flow/i);
    assert.match(block, /Acting this segment: happy or excited/i);
    assert.match(block, /hard cuts/i);
  });

  it("product showcase gets lighter multi-image flow", () => {
    const block = buildComicStripWorldTransitionBlock({
      animationStyleId: "product_showcase",
      transitionOrder: 1,
      transitionTotal: 2,
    });
    assert.match(block, /MULTI-IMAGE FLOW \(lighter merge\)/i);
    assert.match(block, /light sweeps, or object passes/i);
    assert.ok(!block.includes("PREMIUM COMIC-STRIP ENGINE"));
  });

  it("single keyframe has no world block", () => {
    const block = buildComicStripWorldTransitionBlock({
      animationStyleId: "cartoon_animation",
      transitionOrder: 0,
      transitionTotal: 1,
    });
    assert.equal(block, "");
  });

  it("infographic bridge order starts with character bridge", () => {
    assert.match(pickComicStripTransitionBridge(0), /^character bridge/);
    assert.match(pickComicStripTransitionBridge(1), /^camera push\/pan/);
    assert.match(pickComicStripTransitionBridge(2), /^light sweep/);
    assert.match(pickComicStripTransitionBridge(3), /^particle bridge/);
  });

  it("acting beats rotate per segment", () => {
    assert.match(pickComicStripActingBeat(0), /happy or excited/);
    assert.notEqual(pickComicStripActingBeat(0), pickComicStripActingBeat(1));
  });

  it("bridge hints cycle across segments", () => {
    const a = pickComicStripTransitionBridge(0);
    const b = pickComicStripTransitionBridge(1);
    assert.notEqual(a, b);
    const hint = buildComicStripSegmentBridgeHint({
      animationStyleId: "character_animation",
      transitionOrder: 0,
      transitionTotal: 4,
    });
    assert.match(hint, /Bridge: character bridge/i);
    assert.match(hint, /Acting: happy or excited/i);
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
    assert.match(motion, /PREMIUM COMIC-STRIP ENGINE/i);
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
