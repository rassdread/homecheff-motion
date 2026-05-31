import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";

describe("instant-premium-output-plan", () => {
  it("uses single 5s transition for two images", () => {
    const plan = resolveInstantPremiumOutputPlan(2);
    assert.equal(plan.mode, "single_transition");
    assert.equal(plan.transitionCount, 1);
    assert.equal(plan.totalDurationSeconds, 5);
    assert.equal(plan.perTransitionSeconds, 5);
  });

  it("uses cinematic story for three or more images", () => {
    const plan = resolveInstantPremiumOutputPlan(4);
    assert.equal(plan.mode, "cinematic_story");
    assert.equal(plan.transitionCount, 3);
    assert.equal(plan.totalDurationSeconds, 12);
    assert.equal(plan.perTransitionSeconds, 4);
  });
});
