import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRenderGenerationTrace } from "@/lib/build-render-generation-trace";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

function minimalDetail(): AnimationProjectDetailResponse {
  return {
    id: "p1",
    title: "Demo",
    status: "completed",
    createdAt: "2024-01-01T00:00:00.000Z",
    studioSource: {
      storyboardId: "sb1",
      storyboardTitle: "My Story",
      handoffVersion: 11,
      importedAt: "2024-01-02T00:00:00.000Z",
    },
    renderVersions: [
      {
        id: "rv1",
        renderVersionNumber: 1,
        kind: "initial",
        status: "completed",
        isDefault: false,
        createdAt: "2024-01-03T00:00:00.000Z",
        completedAt: "2024-01-03T01:00:00.000Z",
      },
      {
        id: "rv2",
        renderVersionNumber: 2,
        kind: "text_rerender",
        status: "completed",
        isDefault: true,
        createdAt: "2024-01-04T00:00:00.000Z",
        completedAt: "2024-01-04T01:00:00.000Z",
      },
    ],
  } as AnimationProjectDetailResponse;
}

describe("buildRenderGenerationTrace", () => {
  it("builds studio → motion → text chain", () => {
    const steps = buildRenderGenerationTrace(minimalDetail(), { renderVersionId: "rv2" });
    assert.ok(steps.some((s) => s.id === "studio"));
    assert.ok(steps.some((s) => s.id === "motion"));
    assert.ok(steps.some((s) => s.id === "text_edits"));
    assert.ok(steps.some((s) => s.isCurrent));
  });
});
