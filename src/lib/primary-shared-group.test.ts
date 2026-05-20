import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFocusCycleForSegment,
  buildPrimarySharedGroupPlan,
  buildPrimarySharedGroupPromptBlock,
} from "@/lib/primary-shared-group";
import { detectCharacterRoles } from "@/lib/character-role-engine";

describe("primary shared group", () => {
  it("plans multi-lead trio", () => {
    const roles = detectCharacterRoles({
      corpus: "chef garden design mascots",
      imageCount: 3,
    });
    const plan = buildPrimarySharedGroupPlan(roles);
    assert.equal(plan.isMultiLead, true);
    assert.ok(plan.focusCycle.length >= 2);
  });

  it("builds cinematic focus cycle prompt", () => {
    const roles = detectCharacterRoles({
      corpus: "chef garden design",
      imageCount: 3,
    });
    const plan = buildPrimarySharedGroupPlan(roles);
    const block = buildPrimarySharedGroupPromptBlock({
      plan,
      transitionOrder: 1,
      transitionTotal: 3,
    });
    assert.match(block, /PRIMARY_SHARED_GROUP/);
    assert.match(block, /co-lead/i);
  });

  it("cycles dominant role across segments", () => {
    const cycle = ["CHEF_HOST", "GARDEN_GUIDE", "DESIGN_CREATOR"] as const;
    const open = buildFocusCycleForSegment({
      focusCycle: [...cycle],
      transitionOrder: 0,
      transitionTotal: 3,
    });
    const mid = buildFocusCycleForSegment({
      focusCycle: [...cycle],
      transitionOrder: 1,
      transitionTotal: 3,
    });
    assert.equal(open.dominantRole, "CHEF_HOST");
    assert.equal(mid.dominantRole, "GARDEN_GUIDE");
  });
});
