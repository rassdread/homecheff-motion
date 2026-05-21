import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdvancedMotionIntelligenceBlocks,
  buildMotionIntelligenceSegmentHints,
  resolveMotionIntelligenceContext,
} from "@/lib/premium-motion-automation";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { shouldApplySocialPolish } from "@/lib/premium-social-polish";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";

describe("premium motion automation", () => {
  it("builds advanced intelligence blocks from resolved profile", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
    });
    const block = buildAdvancedMotionIntelligenceBlocks(
      resolveMotionIntelligenceContext({ profile, transitionOrder: 1, transitionTotal: 3 })
    );
    assert.match(block, /FACIAL PERFORMANCE SYSTEM/);
    assert.match(block, /MOTION MEMORY/);
    assert.match(block, /GESTURE DIVERSITY/);
    assert.match(block, /ADVANCED FOREGROUND SEGMENTATION/);
    assert.match(block, /CINEMATIC DIRECTING/);
  });

  it("applies social polish for fast social preset", () => {
    assert.equal(shouldApplySocialPolish("fast_social_animation"), true);
    assert.equal(shouldApplySocialPolish("clean_motion"), false);
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "fast_social_animation",
    });
    const block = buildAdvancedMotionIntelligenceBlocks(
      resolveMotionIntelligenceContext({ profile })
    );
    assert.match(block, /SOCIAL \/ TIKTOK POLISH/);
  });

  it("injects global mascot animation once for mascot scenes", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
    });
    const scene = analyzeSceneIntelligence({
      animationStyleId: "cartoon_animation",
      userIntent: "HomeCheff chef garden design mascots",
      imageCount: 3,
    });
    const block = buildAdvancedMotionIntelligenceBlocks(
      resolveMotionIntelligenceContext({ profile, scene, transitionOrder: 0, transitionTotal: 2 })
    );
    assert.match(block, /GLOBAL MASCOT ANIMATION/);
    assert.equal((block.match(/GLOBAL MASCOT ANIMATION/g) ?? []).length, 1);
    assert.ok(!block.includes("FACIAL PERFORMANCE SYSTEM:"));
    assert.match(block, /FACIAL SUPPLEMENT \(mascot scene/);
  });

  it("segment hints include memory and variation", () => {
    const profile = resolvePremiumPolishProfile({ version: 1, animationStyleId: "marketplace_story" });
    const hints = buildMotionIntelligenceSegmentHints(
      resolveMotionIntelligenceContext({ profile, transitionOrder: 2, transitionTotal: 4 })
    );
    assert.match(hints, /MOTION MEMORY/);
    assert.match(hints, /MOTION VARIATION ENGINE/);
  });
});
