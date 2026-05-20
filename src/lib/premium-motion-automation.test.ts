import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdvancedMotionIntelligenceBlocks,
  buildMotionIntelligenceSegmentHints,
  resolveMotionIntelligenceContext,
} from "@/lib/premium-motion-automation";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { shouldApplySocialPolish } from "@/lib/premium-social-polish";

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

  it("segment hints include memory and variation", () => {
    const profile = resolvePremiumPolishProfile({ version: 1, animationStyleId: "marketplace_story" });
    const hints = buildMotionIntelligenceSegmentHints(
      resolveMotionIntelligenceContext({ profile, transitionOrder: 2, transitionTotal: 4 })
    );
    assert.match(hints, /MOTION MEMORY/);
    assert.match(hints, /MOTION VARIATION ENGINE/);
  });
});
