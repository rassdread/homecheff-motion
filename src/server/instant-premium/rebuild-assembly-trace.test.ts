import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  finalizeRebuildAssemblyTrace,
  segmentsChangedSincePreviousRebuild,
  startRebuildAssemblyTrace,
} from "@/server/instant-premium/rebuild-assembly-trace";

describe("rebuild assembly trace", () => {
  it("detects segment hash changes between rebuilds", () => {
    startRebuildAssemblyTrace({
      projectId: "p1",
      rebuildId: "r1",
      workspacePath: "/tmp/rebuild-p1-r1",
      previousFinalHash: "abc",
    });
    finalizeRebuildAssemblyTrace("p1", {
      segmentHashes: ["hash-a", "hash-b"],
      finalOutputHash: "final-1",
    });
    startRebuildAssemblyTrace({
      projectId: "p1",
      rebuildId: "r2",
      workspacePath: "/tmp/rebuild-p1-r2",
      previousFinalHash: "def",
    });
    assert.equal(segmentsChangedSincePreviousRebuild("p1", ["hash-a", "hash-b"]), false);
    assert.equal(segmentsChangedSincePreviousRebuild("p1", ["hash-a", "hash-c"]), true);
  });
});
