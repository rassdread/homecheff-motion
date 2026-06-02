import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateInstantPremiumCreditsForPlan,
  resolveInstantPremiumOutputPlan,
} from "@/lib/instant-premium-output-plan";
import { getAnimationPreset } from "@/lib/animation-presets";
import { estimateInstantPremiumPriceEur } from "@/lib/instant-premium-pricing";
import { estimateInstantPremiumCredits } from "@/server/instant-premium/create-instant-premium-project";

describe("instant-premium-output-plan", () => {
  it("uses single transition for two images at 5s", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 2,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "single_transition");
    assert.equal(plan.transitionCount, 1);
    assert.equal(plan.storyboardDurationSeconds, 5);
    assert.equal(plan.providerDurationSeconds, 5);
    assert.equal(plan.totalDurationSeconds, 5);
    assert.equal(plan.perTransitionSeconds, 5);
    assert.equal(plan.durationScale, 1);
  });

  it("uses cinematic story for four images at 5s per transition", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 4,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "cinematic_story");
    assert.equal(plan.transitionCount, 3);
    assert.equal(plan.storyboardDurationSeconds, 15);
    assert.equal(plan.providerDurationSeconds, 15);
  });

  it("uses story multiframe for nine images at 5s legacy pacing", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "story_multiframe");
    assert.equal(plan.transitionCount, 8);
    assert.equal(plan.storyboardDurationSeconds, 40);
    assert.equal(plan.providerDurationSeconds, 40);
    assert.equal(plan.durationScale, 1);
  });

  it("clamps cinematic story segments to 7s for Vidu multiframe", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 8,
    });
    assert.equal(plan.storyboardDurationSeconds, 64);
    assert.equal(plan.viduSegmentDurationSeconds, 7);
    assert.equal(plan.providerDurationSeconds, 56);
    assert.equal(plan.viduTotalDurationSeconds, 56);
  });

  it("uses transition sum for variable storyboard (9 images, 8 transitions)", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts: [
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 7 },
        { transitionDurationSeconds: 7 },
        {},
      ],
    });
    assert.equal(plan.providerDurationSeconds, 44);
    assert.equal(plan.storyboardDurationSeconds, 44);
    assert.equal(plan.providerSegmentCount, 8);
    assert.equal(plan.durationScale, 1);
  });

  it("legacy durationSeconds on scenes sums transitions only", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts: [
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 5 },
        { durationSeconds: 7 },
        { durationSeconds: 7 },
      ],
    });
    assert.equal(plan.providerDurationSeconds, 42);
    assert.equal(plan.storyboardDurationSeconds, 42);
    assert.equal(plan.durationScale, 1);
  });

  it("uses variable segment durations from storyboard (4 images)", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 4,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts: [
        { transitionDurationSeconds: 3 },
        { transitionDurationSeconds: 7 },
        { transitionDurationSeconds: 5 },
        {},
      ],
    });
    assert.equal(plan.storyboardDurationSeconds, 15);
    assert.equal(plan.providerDurationSeconds, 15);
  });

  it("estimateInstantPremiumCreditsForPlan uses provider duration sum", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts: [
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 5 },
        { transitionDurationSeconds: 7 },
        { transitionDurationSeconds: 7 },
        {},
      ],
    });
    const credits = estimateInstantPremiumCreditsForPlan(plan, 8);
    assert.equal(credits, 44 * 8);
  });
});

describe("instant-premium pricing and credits", () => {
  it("pricing uses provider duration (transition sum)", () => {
    const short = estimateInstantPremiumPriceEur(9, {
      providerDurationSeconds: 40,
      transitionSeconds: 5,
    });
    const long = estimateInstantPremiumPriceEur(9, {
      providerDurationSeconds: 44,
      transitionSeconds: 5,
    });
    assert.ok(long > short);
  });

  it("estimateInstantPremiumCredits uses provider segment sum", () => {
    const sceneTexts = [
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 5 },
      { transitionDurationSeconds: 7 },
      { transitionDurationSeconds: 7 },
      {},
    ];
    const credits = estimateInstantPremiumCredits(9, undefined, {
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts,
    });
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTexts,
    });
    const rate = getAnimationPreset("standard").estimatedCreditsPerSecond;
    assert.equal(credits, plan.providerDurationSeconds * rate);
    assert.equal(credits, 528);
  });
});
