import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STUDIO_PLAN_DISPLAY } from "@/lib/studio-account-display-config";
import {
  OFFICIAL_PLAN_STORAGE_GB,
  OFFICIAL_STORAGE_PLAN_IDS,
} from "@/lib/studio-subscription-storage";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

/** Legacy storage limits that must not reappear as hardcoded SSOT values. */
const BANNED_LEGACY_STORAGE_HARDCODES = [2, 500];

describe("official subscription storage limits", () => {
  it("defines Free, Creator, Pro and Studio GB limits", () => {
    assert.equal(OFFICIAL_PLAN_STORAGE_GB.free, 1);
    assert.equal(OFFICIAL_PLAN_STORAGE_GB.creator, 5);
    assert.equal(OFFICIAL_PLAN_STORAGE_GB.pro, 25);
    assert.equal(OFFICIAL_PLAN_STORAGE_GB.studio, 100);
  });

  it("STUDIO_PLANS uses official storage limits", () => {
    for (const id of OFFICIAL_STORAGE_PLAN_IDS) {
      assert.equal(STUDIO_PLANS[id].storageLimitGb, OFFICIAL_PLAN_STORAGE_GB[id]);
    }
    assert.equal(STUDIO_PLANS.free.storageLimitGb, OFFICIAL_PLAN_STORAGE_GB.free);
  });

  it("client display config matches official storage limits", () => {
    for (const row of STUDIO_PLAN_DISPLAY) {
      const official =
        OFFICIAL_PLAN_STORAGE_GB[row.id as keyof typeof OFFICIAL_PLAN_STORAGE_GB];
      assert.equal(row.storageLimitGb, official);
    }
  });

  it("runtime sources do not hardcode removed legacy storage values (2 GB free, 500 GB studio)", () => {
    const paths = [
      "src/server/studio-account/studio-plan-config.ts",
      "src/server/studio-account/studio-billing-policy-service.ts",
      "src/lib/studio-account-display-config.ts",
    ];
    for (const path of paths) {
      const source = readFileSync(path, "utf8");
      for (const legacyGb of BANNED_LEGACY_STORAGE_HARDCODES) {
        assert.doesNotMatch(
          source,
          new RegExp(`storageLimitGb:\\s*${legacyGb}\\b`),
          `${path} must not hardcode legacy storageLimitGb: ${legacyGb}`
        );
      }
    }
  });
});
