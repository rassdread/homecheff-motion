import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllTransitionsHaveProviderVideo,
  buildAdminAssemblyTimeline,
  buildFinalSegmentTransitionRows,
  FinalSegmentSourceError,
  isAllowedProviderVideoUrl,
  isImageLikeMediaUrl,
  SEGMENT_VIDEO_MISSING,
} from "@/server/instant-premium/final-segment-source";

describe("final-segment-source", () => {
  it("rejects image preview URLs as concat sources", () => {
    assert.equal(isImageLikeMediaUrl("https://cdn.example.com/poster.jpg"), true);
    assert.equal(isAllowedProviderVideoUrl("https://cdn.example.com/clip.mp4"), true);
    assert.equal(isAllowedProviderVideoUrl("https://cdn.example.com/poster.jpg"), false);
  });

  it("builds ordered transition rows by order field", () => {
    const rows = buildFinalSegmentTransitionRows([
      {
        id: "t2",
        order: 2,
        startImageId: "c",
        endImageId: "d",
        status: "completed",
        providerJobId: "j2",
        outputVideoUrl: "https://x/2.mp4",
      },
      {
        id: "t0",
        order: 0,
        startImageId: "a",
        endImageId: "b",
        status: "completed",
        providerJobId: "j0",
        outputVideoUrl: "https://x/0.mp4",
      },
      {
        id: "t1",
        order: 1,
        startImageId: "b",
        endImageId: "c",
        status: "completed",
        providerJobId: "j1",
        outputVideoUrl: "https://x/1.mp4",
      },
    ]);
    assert.equal(rows[0]!.segmentIndex, 0);
    assert.equal(rows[0]!.startImageId, "a");
    assert.equal(rows[1]!.endImageId, "c");
  });

  it("throws SEGMENT_VIDEO_MISSING when a transition lacks provider video", () => {
    const rows = buildFinalSegmentTransitionRows([
      {
        id: "t0",
        order: 0,
        startImageId: "a",
        endImageId: "b",
        status: "completed",
        providerJobId: "j0",
        outputVideoUrl: "https://x/0.mp4",
      },
      {
        id: "t1",
        order: 1,
        startImageId: "b",
        endImageId: "c",
        status: "rendering",
        providerJobId: null,
        outputVideoUrl: null,
      },
    ]);
    assert.throws(
      () =>
        assertAllTransitionsHaveProviderVideo({
          projectId: "p1",
          rows,
          expectedCount: 2,
        }),
      (err: unknown) =>
        err instanceof FinalSegmentSourceError && err.code === SEGMENT_VIDEO_MISSING
    );
  });

  it("builds admin assembly timeline with video presence", () => {
    const timeline = buildAdminAssemblyTimeline(
      buildFinalSegmentTransitionRows([
        {
          id: "t0",
          order: 0,
          startImageId: "a",
          endImageId: "b",
          status: "completed",
          providerJobId: "j0",
          outputVideoUrl: "https://x/0.mp4",
        },
      ])
    );
    assert.equal(timeline[0]!.videoUrlPresent, true);
    assert.match(timeline[0]!.label, /a → b/);
  });
});
