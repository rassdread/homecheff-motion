import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listRecentLocalEdits } from "@/lib/recent-local-edits";

describe("recent-local-edits", () => {
  it("exports listRecentLocalEdits for projects hub", () => {
    assert.equal(typeof listRecentLocalEdits, "function");
    const items = listRecentLocalEdits(0);
    assert.ok(Array.isArray(items));
  });
});
