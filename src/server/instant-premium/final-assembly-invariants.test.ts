import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFinalAssemblyTransitionInvariant,
  assertFinalConcatInputCount,
  buildAdminFinalAssemblyReport,
  buildConcatIncludedByTransitionId,
  expectedTransitionCountForImageCount,
  FinalAssemblyTransitionCountMismatchError,
} from "@/server/instant-premium/final-assembly-invariants";
import { validateJoinPlansAlignment } from "@/server/instant-premium/concat-segment-mapping";
import { buildOrderedTransitionSegments } from "@/server/instant-premium/concat-segment-mapping";
import { buildSegmentJoinPlan } from "@/lib/exact-frame-continuity";

function transition(id: string, order: number, start: string, end: string, url: string) {
  return {
    id,
    order,
    startImageId: start,
    endImageId: end,
    status: "completed" as const,
    providerJobId: `job-${order}`,
    outputVideoUrl: url,
  };
}

describe("expectedTransitionCountForImageCount", () => {
  it("requires N-1 transitions for N images", () => {
    assert.equal(expectedTransitionCountForImageCount(4), 3);
    assert.equal(expectedTransitionCountForImageCount(1), 0);
  });
});

describe("assertFinalAssemblyTransitionInvariant", () => {
  it("passes for 4 images and 3 completed transitions", () => {
    const images = [
      { id: "i1", order: 0 },
      { id: "i2", order: 1 },
      { id: "i3", order: 2 },
      { id: "i4", order: 3 },
    ];
    const transitions = [
      transition("t0", 0, "i1", "i2", "https://x/0.mp4"),
      transition("t1", 1, "i2", "i3", "https://x/1.mp4"),
      transition("t2", 2, "i3", "i4", "https://x/2.mp4"),
    ];
    assert.doesNotThrow(() =>
      assertFinalAssemblyTransitionInvariant({
        projectId: "p1",
        images,
        transitions,
      })
    );
  });

  it("throws when transition count does not match image count", () => {
    const images = [
      { id: "i1", order: 0 },
      { id: "i2", order: 1 },
      { id: "i3", order: 2 },
      { id: "i4", order: 3 },
    ];
    const transitions = [
      transition("t0", 0, "i1", "i2", "https://x/0.mp4"),
      transition("t2", 2, "i3", "i4", "https://x/2.mp4"),
    ];
    assert.throws(
      () =>
        assertFinalAssemblyTransitionInvariant({
          projectId: "p1",
          images,
          transitions,
        }),
      (err: unknown) => {
        assert.ok(err instanceof FinalAssemblyTransitionCountMismatchError);
        return true;
      }
    );
  });
});

describe("assertFinalConcatInputCount", () => {
  it("requires exact concat input count", () => {
    assert.throws(() =>
      assertFinalConcatInputCount({
        projectId: "p1",
        expectedTransitionCount: 3,
        actualConcatInputCount: 2,
      })
    );
  });
});

describe("exact-frame join plans", () => {
  it("produces exactly N-1 joins for N segments without dropping middle", () => {
    const segments = buildOrderedTransitionSegments([
      { id: "t0", order: 0, startImageId: "a", endImageId: "b", outputVideoUrl: "u0" },
      { id: "t1", order: 1, startImageId: "b", endImageId: "c", outputVideoUrl: "u1" },
      { id: "t2", order: 2, startImageId: "c", endImageId: "d", outputVideoUrl: "u2" },
    ]);
    const plans = segments.slice(0, -1).map((seg, i) => {
      const next = segments[i + 1]!;
      return buildSegmentJoinPlan({
        segmentA: seg.segmentIndex,
        segmentB: next.segmentIndex,
        score: { similarity: 0.999, mode: "continuation", reason: "test" },
        baseTransitionSec: 0.27,
      });
    });
    validateJoinPlansAlignment(plans, segments.length);
    assert.equal(plans.length, 2);
    assert.equal(plans[1]!.segmentA, 1);
    assert.equal(plans[1]!.segmentB, 2);
  });
});

describe("buildConcatIncludedByTransitionId", () => {
  it("marks middle transition missing when rebuild trace omits concat input", () => {
    const transitions = [
      transition("t0", 0, "i1", "i2", "https://x/0.mp4"),
      transition("t1", 1, "i2", "i3", "https://x/1.mp4"),
      transition("t2", 2, "i3", "i4", "https://x/2.mp4"),
    ];
    const included = buildConcatIncludedByTransitionId({
      transitions,
      rebuildSegmentTraces: [
        { transitionId: "t0", concatInputPath: "/tmp/0.mp4" },
        { transitionId: "t1" },
        { transitionId: "t2", concatInputPath: "/tmp/2.mp4" },
      ],
      latestExportCompleted: false,
    });
    assert.equal(included.get("t1"), false);
    assert.equal(included.get("t0"), true);
    assert.equal(included.get("t2"), true);
  });
});

describe("buildAdminFinalAssemblyReport", () => {
  it("flags missing middle concat inclusion", () => {
    const images = [
      { id: "i1", order: 0 },
      { id: "i2", order: 1 },
      { id: "i3", order: 2 },
      { id: "i4", order: 3 },
    ];
    const transitions = [
      transition("t0", 0, "i1", "i2", "https://x/0.mp4"),
      transition("t1", 1, "i2", "i3", "https://x/1.mp4"),
      transition("t2", 2, "i3", "i4", "https://x/2.mp4"),
    ];
    const included = new Map([
      ["t0", true],
      ["t1", false],
      ["t2", true],
    ]);
    const report = buildAdminFinalAssemblyReport({
      images,
      transitions,
      concatIncludedByTransitionId: included,
    });
    assert.equal(report.ok, false);
    assert.equal(report.transitions[1]!.error, "missing_from_final_concat");
  });
});
