import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strictestContinuityStrength } from "@/lib/studio-continuity-strength";

describe("studio-continuity-strength", () => {
  it("picks strictest strength", () => {
    assert.equal(strictestContinuityStrength(["loose", "normal", "strict"]), "strict");
    assert.equal(strictestContinuityStrength(["strong", "loose"]), "strong");
  });
});
