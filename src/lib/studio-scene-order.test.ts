import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reorderSceneIds } from "@/lib/studio-scene-order";

describe("studio scene order", () => {
  it("moves active id before over id", () => {
    const next = reorderSceneIds(["a", "b", "c"], "c", "a");
    assert.deepEqual(next, ["c", "a", "b"]);
  });

  it("returns null for unknown ids", () => {
    assert.equal(reorderSceneIds(["a"], "x", "a"), null);
  });
});
