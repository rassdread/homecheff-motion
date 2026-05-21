import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGlobalMascotAnimationPromptBlock,
  COMPACT_GLOBAL_MASCOT_ANIMATION_LINE,
  sceneContainsHomeCheffMascot,
} from "@/lib/premium-mascot-animation-preset";
import { buildCompactViduMotionPrompt } from "@/lib/vidu-prompt-budget";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";

describe("premium-mascot-animation-preset", () => {
  it("detects chef mascot from roles", () => {
    assert.equal(
      sceneContainsHomeCheffMascot({
        roles: [{ roleId: "CHEF_HOST", confidence: 0.9, label: "chef" }],
      }),
      true
    );
  });

  it("detects mascot trio from scene intelligence", () => {
    const scene = analyzeSceneIntelligence({
      animationStyleId: "cartoon_animation",
      userIntent: "HomeCheff chef garden and design mascots together",
      imageCount: 3,
    });
    assert.equal(scene.focusHint, "mascot_trio");
    assert.equal(sceneContainsHomeCheffMascot({ scene }), true);
  });

  it("does not inject when animateMascot is false", () => {
    assert.equal(
      buildGlobalMascotAnimationPromptBlock({
        roles: [{ roleId: "CHEF_HOST", confidence: 1, label: "chef" }],
        animateMascot: false,
      }),
      ""
    );
  });

  it("full block includes expression cycle arc and anti-frozen-smile rules", () => {
    const block = buildGlobalMascotAnimationPromptBlock({
      roles: [{ roleId: "CHEF_HOST", confidence: 0.9, label: "chef" }],
      compact: false,
    });
    assert.match(block, /EXPRESSION CYCLE:/i);
    assert.match(block, /clearly relax into a neutral closed mouth/i);
    assert.match(block, /Moderately expressive facial expression cycle/i);
    assert.match(block, /2–4 small mouth movements/i);
    assert.ok(!/Subtle facial expression cycle/i.test(block));
  });

  it("returns one global block for multiple mascots (no duplicate)", () => {
    const block = buildGlobalMascotAnimationPromptBlock({
      roles: [
        { roleId: "CHEF_HOST", confidence: 0.9, label: "chef" },
        { roleId: "GARDEN_GUIDE", confidence: 0.9, label: "garden" },
        { roleId: "DESIGN_CREATOR", confidence: 0.9, label: "design" },
      ],
    });
    assert.ok(block.includes(COMPACT_GLOBAL_MASCOT_ANIMATION_LINE));
    const count = block.split("GLOBAL MASCOT").length - 1;
    assert.equal(count, 1);
  });

  it("appends to compact Vidu motion prompt when mascot present", () => {
    const profile = resolvePremiumPolishProfile({
      animationStyleId: "cartoon_animation",
    });
    const scene = analyzeSceneIntelligence({
      animationStyleId: "cartoon_animation",
      userIntent: "chef mascot promo",
      imageCount: 2,
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      sceneIntelligence: scene,
      userIntent: "chef mascot promo",
    });
    assert.match(motion, /GLOBAL MASCOT \(HomeCheff\)/i);
    assert.match(motion, /Moderately expressive facial expression cycle/i);
    assert.match(motion, /visibly change during the clip/i);
    assert.match(motion, /2–4 small natural mouth movements/i);
    assert.match(motion, /visible eye movement/i);
    assert.match(motion, /friendly presenter energy/i);
    assert.ok(!/Subtle facial expression cycle/i.test(motion));
    assert.ok(!motion.includes("FACIAL PERFORMANCE SYSTEM"));
  });

  it("uses standard facial line when no mascot detected", () => {
    const profile = resolvePremiumPolishProfile({
      animationStyleId: "product_showcase",
    });
    const scene = analyzeSceneIntelligence({
      animationStyleId: "product_showcase",
      userIntent: "luxury product on marble surface only",
      imageCount: 1,
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      sceneIntelligence: scene,
      userIntent: scene.keywords.join(" "),
    });
    assert.ok(!motion.includes("GLOBAL MASCOT (HomeCheff)"));
    assert.match(motion, /Prioritize living faces/i);
  });
});
