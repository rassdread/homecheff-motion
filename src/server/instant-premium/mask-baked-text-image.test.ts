import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { maskBakedTextInImageBuffer } from "@/server/instant-premium/mask-baked-text-image";
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
});
