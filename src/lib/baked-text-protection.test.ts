import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultMaskRegionForTextPosition,
  parseBakedTextProtectionInput,
  projectUsesBakedTextProtection,
} from "@/lib/baked-text-protection";

describe("baked text protection", () => {
  it("builds a centered mask band from position Y", () => {
    const region = defaultMaskRegionForTextPosition(0.12);
    assert.ok(region.y >= 0 && region.y <= 0.2);
    assert.equal(region.width, 0.94);
    assert.equal(region.height, 0.22);
  });

  it("parses enabled protection with exact text", () => {
    const parsed = parseBakedTextProtectionInput({
      enabled: true,
      exactText: " €4,99 ",
      positionY: 0.82,
    });
    assert.equal(parsed?.enabled, true);
    assert.equal(parsed?.exactText, " €4,99 ");
    assert.equal(parsed?.positionY, 0.82);
  });

  it("detects protected projects from image rows", () => {
    assert.equal(
      projectUsesBakedTextProtection([{ bakedTextProtectionStatus: "masked" }]),
      true
    );
    assert.equal(projectUsesBakedTextProtection([{ bakedTextProtectionStatus: "none" }]), false);
  });
});
