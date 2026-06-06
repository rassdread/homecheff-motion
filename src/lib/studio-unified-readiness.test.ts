import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioUnifiedReadiness,
  unifiedLevelFromScore,
  unifiedSoftGateKey,
  unifiedToProposalRenderReadiness,
} from "@/lib/studio-unified-readiness";
import {
  studioLocationListItem,
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("buildStudioUnifiedReadiness", () => {
  it("merges render and visual checks into nine unified checks", () => {
    const unified = buildStudioUnifiedReadiness({
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            id: "s1",
            sceneImages: [
              studioSceneImageListItem({ id: "img1", sceneId: "s1", status: "completed" }),
            ],
          }),
        ],
      }),
    });
    assert.equal(unified.checks.length, 9);
    assert.ok(unified.checks.some((c) => c.id === "world"));
    assert.ok(unified.checks.some((c) => c.id === "camera"));
  });

  it("exposes soft gate keys without blocking render", () => {
    const unified = buildStudioUnifiedReadiness({
      storyboard: studioStoryboardDetail({ scenes: [studioSceneDetail({ order: 0, id: "s1" })] }),
    });
    assert.equal(unifiedSoftGateKey(unified.level), unified.softGateKey);
    assert.ok(Array.isArray(unified.renderWarnings));
    assert.ok(Array.isArray(unified.fixes));
  });

  it("maps to proposal render readiness shape", () => {
    const unified = buildStudioUnifiedReadiness({
      storyboard: studioStoryboardDetail({ scenes: [studioSceneDetail({ order: 0, id: "s1" })] }),
    });
    const proposal = unifiedToProposalRenderReadiness(unified);
    assert.equal(proposal.level, unified.level);
    assert.equal(proposal.checks.length, 7);
  });

  it("scores levels with shared thresholds", () => {
    assert.equal(unifiedLevelFromScore(90), "ready");
    assert.equal(unifiedLevelFromScore(60), "almost_ready");
    assert.equal(unifiedLevelFromScore(40), "needs_work");
  });

  it("suggests library-backed fixes when assets exist", () => {
    const unified = buildStudioUnifiedReadiness({
      storyboard: studioStoryboardDetail({
        title: "Garden story",
        description: "Community cooking in the garden",
        scenes: [studioSceneDetail({ order: 0, id: "s1" })],
      }),
      locations: [studioLocationListItem({ id: "loc-1", name: "Garden Hub" })],
    });
    const locationFix = unified.fixes.find((f) => f.checkId === "location");
    assert.ok(locationFix);
    assert.equal(locationFix?.tool, "locations");
  });
});
