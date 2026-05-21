import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderedTransitionSegments,
  InvalidSegmentMappingError,
  orderTransitionsByOrder,
  validateJoinPlansAlignment,
  validateOrderedTransitionSegments,
  validateUniqueConcatPaths,
} from "@/server/instant-premium/concat-segment-mapping";
import { buildSegmentJoinPlan } from "@/lib/exact-frame-continuity";

describe("concat segment mapping", () => {
  it("orders transitions by order field", () => {
    const ordered = orderTransitionsByOrder([
      { order: 2, id: "c" },
      { order: 0, id: "a" },
      { order: 1, id: "b" },
    ]);
    assert.deepEqual(
      ordered.map((t) => t.id),
      ["a", "b", "c"]
    );
  });

  it("assigns contiguous segment indices", () => {
    const segments = buildOrderedTransitionSegments([
      {
        id: "t2",
        order: 2,
        startImageId: "img-2",
        endImageId: "img-3",
        outputVideoUrl: "https://a/2.mp4",
      },
      {
        id: "t0",
        order: 0,
        startImageId: "img-0",
        endImageId: "img-1",
        outputVideoUrl: "https://a/0.mp4",
      },
      {
        id: "t1",
        order: 1,
        startImageId: "img-1",
        endImageId: "img-2",
        outputVideoUrl: "https://a/1.mp4",
      },
    ]);
    assert.equal(segments[0]!.segmentIndex, 0);
    assert.equal(segments[0]!.transitionId, "t0");
    assert.equal(segments[2]!.transitionId, "t2");
  });

  it("rejects duplicate concat paths", () => {
    assert.throws(
      () => validateUniqueConcatPaths(["/tmp/a.mp4", "/tmp/a.mp4"]),
      (err: unknown) => err instanceof InvalidSegmentMappingError
    );
  });

  it("validates join plan alignment", () => {
    const plans = [
      buildSegmentJoinPlan({
        segmentA: 0,
        segmentB: 1,
        score: { similarity: 0.5, mode: "normal", reason: "t" },
        baseTransitionSec: 0.2,
      }),
      buildSegmentJoinPlan({
        segmentA: 1,
        segmentB: 2,
        score: { similarity: 0.5, mode: "normal", reason: "t" },
        baseTransitionSec: 0.2,
      }),
    ];
    assert.doesNotThrow(() => validateJoinPlansAlignment(plans, 3));
    assert.throws(() => validateJoinPlansAlignment(plans, 4));
  });

  it("rejects broken image chain", () => {
    const segments = buildOrderedTransitionSegments([
      {
        id: "t0",
        order: 0,
        startImageId: "a",
        endImageId: "b",
        outputVideoUrl: "https://a/0.mp4",
      },
      {
        id: "t1",
        order: 1,
        startImageId: "x",
        endImageId: "c",
        outputVideoUrl: "https://a/1.mp4",
      },
    ]);
    assert.throws(
      () => validateOrderedTransitionSegments(segments),
      (err: unknown) => err instanceof InvalidSegmentMappingError
    );
  });
});
