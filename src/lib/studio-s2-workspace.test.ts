/**
 * S.2 Adaptive Workspace — posture, robot policy, tool taxonomy.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertStudioToolTaxonomyCoverage,
  isStudioPrimaryTool,
  studioToolGroupFor,
} from "@/lib/studio-tool-groups";
import {
  planStudioWorkspaceLayout,
  resolveStudioWorkspacePosture,
  shouldRenderPermanentStudioRobot,
} from "@/lib/studio-workspace-posture";
import { STUDIO_TOOL_IDS } from "@/lib/studio-tool-id";

describe("S.2 workspace postures", () => {
  it("maps widths into full/compact/focused/mobile", () => {
    assert.equal(resolveStudioWorkspacePosture(1920, 1080), "full");
    assert.equal(resolveStudioWorkspacePosture(1280, 800), "compact");
    assert.equal(resolveStudioWorkspacePosture(900, 1200), "focused");
    assert.equal(resolveStudioWorkspacePosture(390, 844), "mobile");
  });

  it("keeps mobile landscape as mobile posture", () => {
    const plan = planStudioWorkspaceLayout(844, 390);
    assert.equal(plan.posture, "mobile");
    assert.equal(plan.orientation, "landscape");
    assert.equal(plan.showSideToolRail, true);
    assert.equal(plan.showBottomToolStrip, false);
    assert.equal(plan.showInlineLeftRail, false);
    assert.equal(plan.showInlineRightRail, false);
  });

  it("opens both rails on full desktop and unconstrained width", () => {
    const plan = planStudioWorkspaceLayout(1600, 1000);
    assert.equal(plan.posture, "full");
    assert.equal(plan.showInlineLeftRail, true);
    assert.equal(plan.showInlineRightRail, true);
    assert.equal(plan.unconstrainedWidth, true);
  });
});

describe("S.2 robot / mascot policy", () => {
  it("never permanently renders robot on mobile portrait or landscape", () => {
    for (const [w, h] of [
      [390, 844],
      [844, 390],
    ] as const) {
      const plan = planStudioWorkspaceLayout(w, h);
      assert.equal(shouldRenderPermanentStudioRobot(plan), false);
      assert.equal(plan.showPermanentRobot, false);
      assert.equal(plan.showOnDemandAiEntry, true);
    }
  });

  it("does not mount permanent robot chrome on desktop either (AI stays contextual)", () => {
    const plan = planStudioWorkspaceLayout(1440, 900);
    assert.equal(shouldRenderPermanentStudioRobot(plan), false);
  });
});

describe("S.2 tool taxonomy", () => {
  it("covers every StudioToolId exactly once across groups", () => {
    assert.deepEqual(assertStudioToolTaxonomyCoverage(), []);
  });

  it("keeps primary strip tools in the known set", () => {
    for (const tool of ["story", "render", "export", "insights"] as const) {
      assert.equal(isStudioPrimaryTool(tool), true);
    }
    assert.equal(studioToolGroupFor("voice"), "audio");
    assert.equal(studioToolGroupFor("characters"), "story");
    assert.equal(STUDIO_TOOL_IDS.includes("story"), true);
  });
});
