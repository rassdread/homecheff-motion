import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeMaskRegion,
  normalizeMaskRegionNormalized,
} from "@/lib/baked-text-protection";

describe("normalizeMaskRegion", () => {
  it("returns null for NaN or zero height", () => {
    assert.equal(normalizeMaskRegionNormalized({ x: 0, y: 0, width: 0.2, height: 0 }), null);
    assert.equal(
      normalizeMaskRegionNormalized({ x: 0, y: 0, width: 0.2, height: Number.NaN }),
      null
    );
    assert.equal(
      normalizeMaskRegion({ x: 0, y: 0, width: 0.2, height: Number.NaN }, 320, 480),
      null
    );
  });

  it("returns pixel box inside image bounds with minimum size", () => {
    const box = normalizeMaskRegion({ x: 0.1, y: 0.2, width: 0.3, height: 0.15 }, 320, 480);
    assert.ok(box);
    assert.equal(box!.left, 32);
    assert.equal(box!.top, 96);
    assert.ok(box!.width >= 4);
    assert.ok(box!.height >= 4);
    assert.ok(box!.left + box!.width <= 320);
    assert.ok(box!.top + box!.height <= 480);
  });

  it("clamps overflow regions to fit the image", () => {
    const box = normalizeMaskRegion({ x: 0.95, y: 0.95, width: 0.2, height: 0.2 }, 100, 100);
    assert.ok(box);
    assert.ok(box!.left + box!.width <= 100);
    assert.ok(box!.top + box!.height <= 100);
  });
});
