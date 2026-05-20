import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_MOTION_ENERGY,
  PREMIUM_MOTION_PIPELINE,
  buildPremiumMotionPromptBlocks,
  normalizeMotionEnergy,
  parsePremiumMotionProfile,
  premiumMotionSegmentVariationHint,
} from "@/lib/premium-motion-engine";

describe("premium motion engine", () => {
  it("defaults motionEnergy to expressive", () => {
    assert.equal(normalizeMotionEnergy(undefined), DEFAULT_MOTION_ENERGY);
    assert.equal(DEFAULT_MOTION_ENERGY, "expressive");
  });

  it("parses character motion profile from poster settings", () => {
    const profile = parsePremiumMotionProfile({
      version: 1,
      motionEnergy: "energetic",
      characterMotion: {
        emotion: "excited",
        personality: "friendly chef mascot",
        motionStyle: "cinematic social media presenter",
      },
    });
    assert.equal(profile.motionEnergy, "energetic");
    assert.equal(profile.characterMotion?.personality, "friendly chef mascot");
  });

  it("includes premium acting blocks in Vidu prompt", () => {
    const block = buildPremiumMotionPromptBlocks({
      motionEnergy: "expressive",
      characterMotion: { emotion: "warm", personality: "mascot host" },
    });
    assert.match(block, /PREMIUM MOTION ENGINE/);
    assert.match(block, /SECONDARY MOTION/);
    assert.match(block, /CHARACTER MOTION DIRECTION/);
    assert.match(block, /mascot host/);
    assert.match(block, /Do NOT loop the same hand wave/);
    assert.match(block, /TEMPORAL STABILITY/);
    assert.match(block, /GESTURE VARIATION/);
  });

  it("exposes pipeline rules that preserve Vidu dominance", () => {
    assert.equal(PREMIUM_MOTION_PIPELINE.primarySource, "vidu_segments");
    assert.equal(PREMIUM_MOTION_PIPELINE.useRawAnimatedSegments, true);
    assert.equal(PREMIUM_MOTION_PIPELINE.allowPosterOverlay, false);
  });

  it("adds per-segment variation hints", () => {
    const open = premiumMotionSegmentVariationHint({ transitionOrder: 0, transitionTotal: 3 });
    const mid = premiumMotionSegmentVariationHint({ transitionOrder: 1, transitionTotal: 3 });
    assert.match(open, /opening beat/);
    assert.match(mid, /mid-sequence/);
  });
});
