import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioProductionInsights } from "@/lib/studio-production-insights";
import {
  studioSceneDetail,
  studioSceneImageListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("buildStudioProductionInsights", () => {
  it("returns unified insight sections in one pass", () => {
    const insights = buildStudioProductionInsights(
      studioStoryboardDetail({
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
      []
    );
    assert.equal(typeof insights.storyHealth.score, "number");
    assert.ok(insights.readiness.checks.length > 0);
    assert.equal(typeof insights.quality.score, "number");
    assert.ok(Array.isArray(insights.consistency.characters));
    assert.equal(insights.unifiedReadiness.checks.length, 9);
    assert.ok(insights.unifiedReadiness.softGateKey.startsWith("studio.execution."));
  });
});
