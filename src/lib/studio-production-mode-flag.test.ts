import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStudioProductionModeEnabled } from "@/lib/studio-production-mode-flag";

describe("isStudioProductionModeEnabled", () => {
  const original = process.env.NEXT_PUBLIC_PRODUCTION_MODE;

  it("is enabled by default", () => {
    delete process.env.NEXT_PUBLIC_PRODUCTION_MODE;
    assert.equal(isStudioProductionModeEnabled(), true);
  });

  it("can be disabled via env", () => {
    process.env.NEXT_PUBLIC_PRODUCTION_MODE = "false";
    assert.equal(isStudioProductionModeEnabled(), false);
  });

  it("restores env", () => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PRODUCTION_MODE;
    } else {
      process.env.NEXT_PUBLIC_PRODUCTION_MODE = original;
    }
  });
});
