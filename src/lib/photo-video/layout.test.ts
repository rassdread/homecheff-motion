import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasSizeForRatio, coverFitRect, safeZones } from "@/lib/photo-video/layout";

describe("PX.4A.1 layout", () => {
  it("sizes 9:16 1:1 16:9 without square-forcing", () => {
    const v = canvasSizeForRatio("9:16", 720);
    const s = canvasSizeForRatio("1:1", 720);
    const l = canvasSizeForRatio("16:9", 720);
    assert.equal(v.height, 720);
    assert.ok(v.width < v.height);
    assert.equal(s.width, s.height);
    assert.ok(l.width > l.height);
  });

  it("cover-fit does not distort (scale uniformly)", () => {
    const rect = coverFitRect({
      imageWidth: 1000,
      imageHeight: 500,
      canvasWidth: 405,
      canvasHeight: 720,
      zoom: 1,
    });
    const scaleX = rect.dw / rect.sw;
    const scaleY = rect.dh / rect.sh;
    assert.ok(Math.abs(scaleX - scaleY) < 1e-9);
  });

  it("keeps watermark in the bottom-right safe corner", () => {
    const zones = safeZones({ width: 405, height: 720 });
    assert.ok(zones.watermark.x > 405 / 2);
    assert.ok(zones.watermark.y > 720 / 2);
    assert.ok(zones.title.y < zones.watermark.y);
  });
});
