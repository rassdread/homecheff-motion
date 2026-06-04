import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  assessRepairOutputAlignment,
  isCleanUrlAlignedWithRenderVersion,
  parseMotionBlobVersionFromUrl,
  renderSegmentSnapshotMatchesTransitions,
  resolveProjectVideoDisplayState,
} from "@/lib/render-output-lineage";
import type { RenderSegmentSnapshotEntry } from "@/lib/render-version-snapshots";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("render-output-lineage", () => {
  it("parses versioned and unversioned motion blob paths", () => {
    assert.equal(
      parseMotionBlobVersionFromUrl("https://cdn.example.com/motion/final/p1/clean-v3.mp4"),
      3
    );
    assert.equal(
      parseMotionBlobVersionFromUrl("https://cdn.example.com/motion/final/p1/final-v2.mp4"),
      2
    );
    assert.equal(
      parseMotionBlobVersionFromUrl("https://cdn.example.com/motion/final/p1/clean.mp4"),
      0
    );
  });

  it("matches segment snapshots to current transition clips", () => {
    const snapshot: RenderSegmentSnapshotEntry[] = [
      {
        order: 0,
        transitionId: "t1",
        status: "completed",
        outputVideoUrl: "https://blob/seg-0.mp4",
        providerJobId: "job-1",
      },
    ];
    assert.equal(
      renderSegmentSnapshotMatchesTransitions(snapshot, [
        {
          order: 0,
          id: "t1",
          status: "completed",
          outputVideoUrl: "https://blob/seg-0.mp4",
        },
      ]),
      true
    );
    assert.equal(
      renderSegmentSnapshotMatchesTransitions(snapshot, [
        {
          order: 0,
          id: "t1",
          status: "completed",
          outputVideoUrl: "https://blob/seg-stale.mp4",
        },
      ]),
      false
    );
  });

  it("rejects repair completion when export still references archived previous", () => {
    const previous = "https://cdn.example.com/motion/final/p1/final-v1.mp4";
    const result = assessRepairOutputAlignment({
      projectStatus: "completed",
      exportStatus: "completed",
      exportOutputUrl: previous,
      previousFinalVideoUrl: previous,
      projectCleanUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
      transitions: [
        { order: 0, id: "t1", status: "completed", outputVideoUrl: "https://blob/new.mp4" },
      ],
      pendingRenderVersionNumber: 2,
      pendingSegmentSnapshot: [
        {
          order: 0,
          transitionId: "t1",
          status: "completed",
          outputVideoUrl: "https://blob/new.mp4",
          providerJobId: null,
        },
      ],
      auditJson: { pendingFullRerender: { renderVersionNumber: 2 } },
    });
    assert.equal(result.aligned, false);
    assert.equal(result.reason, "export_matches_archived_previous");
  });

  it("accepts repair when export and clean match pending render version clips", () => {
    const result = assessRepairOutputAlignment({
      projectStatus: "completed",
      exportStatus: "completed",
      exportOutputUrl: "https://cdn.example.com/motion/final/p1/final-v2.mp4",
      previousFinalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v1.mp4",
      projectCleanUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
      transitions: [
        { order: 0, id: "t1", status: "completed", outputVideoUrl: "https://blob/new.mp4" },
      ],
      pendingRenderVersionNumber: 2,
      pendingSegmentSnapshot: [
        {
          order: 0,
          transitionId: "t1",
          status: "completed",
          outputVideoUrl: "https://blob/new.mp4",
          providerJobId: null,
        },
      ],
      auditJson: null,
    });
    assert.equal(result.aligned, true);
  });

  it("hides stale clean while full rerender is running", () => {
    const state = resolveProjectVideoDisplayState({
      projectCleanUrl: "https://cdn.example.com/motion/final/p1/clean-v1.mp4",
      exportOutputUrl: null,
      previousFinalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v1.mp4",
      projectStatus: "generating",
      exportStatus: "queued",
      rerenderInProgress: true,
    });
    assert.equal(state.cleanUrl, null);
    assert.equal(state.cleanIsStale, true);
  });

  it("shows latest bare clean when final overlay failed but clean matches pending version", () => {
    const state = resolveProjectVideoDisplayState({
      projectCleanUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
      exportOutputUrl: null,
      previousFinalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v1.mp4",
      projectStatus: "failed_overlay",
      exportStatus: "failed_overlay",
      renderVersions: [
        {
          renderVersionNumber: 1,
          status: "completed",
          isDefault: false,
          finalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v1.mp4",
          cleanVideoUrl: "https://cdn.example.com/motion/final/p1/clean-v1.mp4",
        },
        {
          renderVersionNumber: 2,
          status: "failed",
          isDefault: true,
          finalVideoUrl: null,
          cleanVideoUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
        },
      ],
    });
    assert.equal(state.finalIsArchivedFallback, true);
    assert.equal(state.cleanIsLatestBareOnly, true);
    assert.equal(state.cleanUrl, "https://cdn.example.com/motion/final/p1/clean-v2.mp4");
  });

  it("does not treat old clean as current when export is the latest final", () => {
    const state = resolveProjectVideoDisplayState({
      projectCleanUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
      exportOutputUrl: "https://cdn.example.com/motion/final/p1/final-v2.mp4",
      previousFinalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v1.mp4",
      projectStatus: "completed",
      exportStatus: "completed",
      renderVersions: [
        {
          renderVersionNumber: 2,
          status: "completed",
          isDefault: true,
          finalVideoUrl: "https://cdn.example.com/motion/final/p1/final-v2.mp4",
          cleanVideoUrl: "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
        },
      ],
    });
    assert.equal(state.cleanUrl, "https://cdn.example.com/motion/final/p1/clean-v2.mp4");
    assert.equal(state.finalIsArchivedFallback, false);
    assert.equal(state.cleanIsLatestBareOnly, false);
  });
});

describe("full rerender clean video wiring", () => {
  it("clears project clean URL at rerender start and passes clean through merge commit", () => {
    const rerenderSrc = readFileSync(
      join(__dirname, "../server/instant-premium/full-rerender-project.ts"),
      "utf8"
    );
    assert.match(rerenderSrc, /instantCleanFinalVideoUrl: null/);

    const mergeSrc = readFileSync(
      join(__dirname, "../server/instant-premium/merge-instant-project.ts"),
      "utf8"
    );
    assert.match(mergeSrc, /const cleanUrl = await persistCleanFinalVideoUrl/);
    assert.match(mergeSrc, /cleanVideoUrl:\s*cleanUrl/);

    const commitSrc = readFileSync(
      join(__dirname, "../server/instant-premium/final-video-export-commit.ts"),
      "utf8"
    );
    assert.match(commitSrc, /cleanVideoUrl\?:/);
    assert.match(commitSrc, /cleanVideoUrl: committedCleanVideoUrl/);
  });

  it("stores cleanVideoUrl on ProjectRenderVersion from explicit commit param", () => {
    const commitSrc = readFileSync(
      join(__dirname, "../server/instant-premium/final-video-export-commit.ts"),
      "utf8"
    );
    assert.match(commitSrc, /completePendingFullRerenderVersion/);
    assert.doesNotMatch(
      commitSrc,
      /cleanVideoUrl:\s*projectForVersion\.instantCleanFinalVideoUrl/
    );
  });

  it("repair completion checks output alignment before clearing audit", () => {
    const repairSrc = readFileSync(
      join(__dirname, "../server/instant-premium/start-instant-video-repair.ts"),
      "utf8"
    );
    assert.match(repairSrc, /assessRepairOutputAlignment/);
    assert.match(repairSrc, /canMarkVideoRepairCompleted/);
  });
});

describe("isCleanUrlAlignedWithRenderVersion", () => {
  it("aligns versioned clean paths with render version numbers", () => {
    assert.equal(
      isCleanUrlAlignedWithRenderVersion(
        "https://cdn.example.com/motion/final/p1/clean-v2.mp4",
        2
      ),
      true
    );
    assert.equal(
      isCleanUrlAlignedWithRenderVersion(
        "https://cdn.example.com/motion/final/p1/clean-v1.mp4",
        2
      ),
      false
    );
  });
});
