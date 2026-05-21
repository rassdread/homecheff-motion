import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInstantSegmentErrorCode } from "@/lib/instant-segment-error-code";

describe("instant-segment-error-code", () => {
  it("parses prefixed error codes", () => {
    assert.equal(parseInstantSegmentErrorCode("VIDU_PROMPT_TOO_LONG: over limit"), "VIDU_PROMPT_TOO_LONG");
  });

  it("returns null for empty messages", () => {
    assert.equal(parseInstantSegmentErrorCode(null), null);
  });

  it("falls back to SEGMENT_RENDER_FAILED", () => {
    assert.equal(parseInstantSegmentErrorCode("Something went wrong"), "SEGMENT_RENDER_FAILED");
  });
});
