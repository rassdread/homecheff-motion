import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearRunningFullRerenderAudit,
  isFullRerenderInProgress,
  markFullRerenderAuditFailed,
  mergeFullRerenderAudit,
  readFullRerenderAudit,
} from "@/lib/full-rerender-audit";

describe("full-rerender-audit", () => {
  it("merges running audit with transition archive", () => {
    const merged = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      previousFinalVideoUrl: "https://cdn.example/final.mp4",
      previousCleanFinalVideoUrl: "https://cdn.example/clean.mp4",
      previousTransitions: [{ order: 0, outputVideoUrl: "https://cdn.example/seg.mp4", providerJobId: "p1" }],
      newProviderJobsCreated: true,
    });
    const entry = readFullRerenderAudit(merged);
    assert.equal(entry?.previousFinalVideoUrl, "https://cdn.example/final.mp4");
    assert.equal(entry?.previousTransitions?.length, 1);
    assert.equal(isFullRerenderInProgress(merged), true);
  });

  it("clears running audit on completion", () => {
    const running = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      newProviderJobsCreated: true,
    });
    const cleared = clearRunningFullRerenderAudit(running, {
      status: "completed",
      completedAt: "2026-06-03T12:05:00.000Z",
    });
    assert.equal(isFullRerenderInProgress(cleared), false);
    assert.equal(readFullRerenderAudit(cleared), null);
    assert.equal(
      (cleared.lastFullRerender as { status?: string } | undefined)?.status,
      "completed"
    );
  });

  it("stores imageChanges on audit entry", () => {
    const merged = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      rerenderSource: "editor",
      imageChanges: {
        beforeImageCount: 3,
        afterImageCount: 4,
        reordered: false,
        addedCount: 1,
        removedCount: 0,
        replacedCount: 1,
      },
      newProviderJobsCreated: true,
    });
    assert.equal(readFullRerenderAudit(merged)?.imageChanges?.afterImageCount, 4);
  });

  it("stores rerenderSource on audit entry", () => {
    const merged = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      rerenderSource: "quick",
      newProviderJobsCreated: true,
    });
    assert.equal(readFullRerenderAudit(merged)?.rerenderSource, "quick");
  });

  it("marks failed rerender and clears running state", () => {
    const running = mergeFullRerenderAudit(null, {
      rebuildType: "full_rerender",
      status: "running",
      startedAt: "2026-06-03T12:00:00.000Z",
      previousFinalVideoUrl: "https://cdn.example/old-final.mp4",
      newProviderJobsCreated: true,
    });
    const failed = markFullRerenderAuditFailed(running, "Merge failed");
    assert.ok(failed);
    assert.equal(isFullRerenderInProgress(failed), false);
    assert.equal(
      (failed!.lastFullRerender as { status?: string; previousFinalVideoUrl?: string }).status,
      "failed"
    );
    assert.equal(
      (failed!.lastFullRerender as { previousFinalVideoUrl?: string }).previousFinalVideoUrl,
      "https://cdn.example/old-final.mp4"
    );
  });
});
