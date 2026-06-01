import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";

describe("instant-premium-output-plan", () => {
  it("uses single transition for two images at 5s", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 2,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "single_transition");
    assert.equal(plan.transitionCount, 1);
    assert.equal(plan.totalDurationSeconds, 5);
    assert.equal(plan.perTransitionSeconds, 5);
  });

  it("uses cinematic story for four images at 5s per transition", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 4,
      instantMode: "transition",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "cinematic_story");
    assert.equal(plan.transitionCount, 3);
    assert.equal(plan.totalDurationSeconds, 15);
    assert.equal(plan.perTransitionSeconds, 5);
  });

  it("uses story multiframe for nine images at 5s", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 5,
    });
    assert.equal(plan.mode, "story_multiframe");
    assert.equal(plan.transitionCount, 8);
    assert.equal(plan.totalDurationSeconds, 40);
    assert.equal(plan.viduTotalDurationSeconds, 40);
  });

  it("clamps cinematic story segments to 7s for Vidu multiframe", () => {
    const plan = resolveInstantPremiumOutputPlan({
      imageCount: 9,
      instantMode: "story",
      transitionSeconds: 8,
    });
    assert.equal(plan.totalDurationSeconds, 64);
    assert.equal(plan.viduSegmentDurationSeconds, 7);
    assert.equal(plan.viduTotalDurationSeconds, 56);
  });
});
