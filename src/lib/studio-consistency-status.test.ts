import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreToConsistencyStatus } from "@/lib/studio-consistency-status";

describe("studio-consistency-status", () => {
  it("maps scores to tiers", () => {
    assert.equal(scoreToConsistencyStatus(95), "excellent");
    assert.equal(scoreToConsistencyStatus(80), "good");
    assert.equal(scoreToConsistencyStatus(60), "needs_review");
    assert.equal(scoreToConsistencyStatus(40), "poor");
  });
});
