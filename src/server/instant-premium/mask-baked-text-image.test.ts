import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  maskBakedTextInImageBuffer,
  maskBakedTextRegionsInImageBuffer,
} from "@/server/instant-premium/mask-baked-text-image";
import { defaultMaskRegionForTextPosition } from "@/lib/baked-text-protection";

describe("maskBakedTextInImageBuffer", () => {
  it("returns a jpeg buffer with similar dimensions", async () => {
    const input = await sharp({
      create: {
        width: 320,
        height: 480,
        channels: 3,
        background: { r: 200, g: 180, b: 160 },
      },
    })
      .jpeg()
      .toBuffer();

    const masked = await maskBakedTextInImageBuffer(
      input,
      defaultMaskRegionForTextPosition(0.12)
    );
    const meta = await sharp(masked).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 320);
    assert.equal(meta.height, 480);
    assert.ok(masked.length > 0);
  });

  it("skips invalid regions without throwing", async () => {
    const input = await sharp({
      create: {
        width: 200,
        height: 300,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const { buffer, skippedRegionCount } = await maskBakedTextRegionsInImageBuffer(input, [
      defaultMaskRegionForTextPosition(0.12),
      { x: 0, y: 0, width: 0.2, height: Number.NaN },
    ]);
    assert.equal(skippedRegionCount, 1);
    const meta = await sharp(buffer).metadata();
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 300);
  });
});
