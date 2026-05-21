import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSegmentIntegrityReport,
  evaluateSegmentIssues,
  validateTransitionImageChain,
  type TransitionRow,
} from "@/lib/instant-segment-integrity-check";

function row(overrides: Partial<TransitionRow> & { order: number }): TransitionRow {
  return {
    id: `t-${overrides.order}`,
    status: "completed",
    startImageId: `img-${overrides.order}`,
    endImageId: `img-${overrides.order + 1}`,
    providerJobId: "job",
    outputVideoUrl: `https://cdn.example/seg-${overrides.order}.mp4`,
    ...overrides,
  };
}

describe("validateTransitionImageChain", () => {
  it("passes when endImageId chains to next startImageId", () => {
    const chain = validateTransitionImageChain([
      row({ order: 0, startImageId: "a", endImageId: "b" }),
      row({ order: 1, startImageId: "b", endImageId: "c" }),
    ]);
    assert.equal(chain.ok, true);
  });

  it("fails on broken chain", () => {
    const chain = validateTransitionImageChain([
      row({ order: 0, startImageId: "a", endImageId: "b" }),
      row({ order: 1, startImageId: "x", endImageId: "c" }),
    ]);
    assert.equal(chain.ok, false);
    assert.equal(chain.breaks.length, 1);
  });
});

describe("buildSegmentIntegrityReport", () => {
  it("returns SEGMENTS_OK when no issues", () => {
    const report = buildSegmentIntegrityReport({
      projectId: "p1",
      chain: { ok: true, breaks: [] },
      segments: [
        {
          transitionId: "t0",
          order: 0,
          status: "completed",
          startImageId: "a",
          endImageId: "b",
          providerJobId: null,
          outputVideoUrl: "https://x/0.mp4",
          metrics: {
            durationSec: 4,
            frameCount: 120,
            width: 1280,
            height: 720,
            fps: 30,
            sha256: "abc",
            motionScore: 12,
            likelyFrozen: false,
            imagePlaceholderUrl: false,
            probeError: null,
          },
          duplicateUrl: false,
          duplicateHash: false,
          issues: [],
        },
      ],
    });
    assert.equal(report.verdict, "SEGMENTS_OK");
    assert.match(report.summary, /SEGMENTS_OK/);
  });

  it("lists bad orders for failed segments", () => {
    const issues = evaluateSegmentIssues({
      row: row({ order: 2, status: "failed", outputVideoUrl: null }),
      metrics: {
        durationSec: null,
        frameCount: null,
        width: null,
        height: null,
        fps: null,
        sha256: null,
        motionScore: null,
        likelyFrozen: null,
        imagePlaceholderUrl: true,
        probeError: "no_url",
      },
      duplicateUrl: false,
      duplicateHash: false,
    });
    const report = buildSegmentIntegrityReport({
      projectId: "p1",
      chain: { ok: true, breaks: [] },
      segments: [
        {
          transitionId: "t2",
          order: 2,
          status: "failed",
          startImageId: "c",
          endImageId: "d",
          providerJobId: null,
          outputVideoUrl: null,
          metrics: {
            durationSec: null,
            frameCount: null,
            width: null,
            height: null,
            fps: null,
            sha256: null,
            motionScore: null,
            likelyFrozen: null,
            imagePlaceholderUrl: true,
            probeError: "no_url",
          },
          duplicateUrl: false,
          duplicateHash: false,
          issues,
        },
      ],
    });
    assert.equal(report.verdict, "SEGMENTS_BAD");
    assert.deepEqual(report.badOrders, [2]);
  });
});
