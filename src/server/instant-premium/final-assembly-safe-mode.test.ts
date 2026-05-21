import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPlainConcatSafeMode,
  readFinalAssemblySafeMode,
  resolveSafeModeSegmentTransitionType,
} from "@/server/instant-premium/final-assembly-safe-mode";

describe("final-assembly-safe-mode", () => {
  it("activates plain_concat from env", () => {
    const prev = process.env.FINAL_ASSEMBLY_SAFE_MODE;
    process.env.FINAL_ASSEMBLY_SAFE_MODE = "plain_concat";
    try {
      assert.equal(readFinalAssemblySafeMode(), "plain_concat");
      assert.equal(isPlainConcatSafeMode(), true);
      assert.equal(resolveSafeModeSegmentTransitionType("motion_blend"), "straight_cut");
    } finally {
      if (prev === undefined) {
        delete process.env.FINAL_ASSEMBLY_SAFE_MODE;
      } else {
        process.env.FINAL_ASSEMBLY_SAFE_MODE = prev;
      }
    }
  });
});
