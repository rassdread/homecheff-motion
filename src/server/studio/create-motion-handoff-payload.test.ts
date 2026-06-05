import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

describe("motion handoff payload shape", () => {
  it("uses version 24 with character blocking handoff fields", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 24);
  });
});
