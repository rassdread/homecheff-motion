import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canvasSizeForRatio, containFitRect, coverFitRect, safeZones } from "@/lib/photo-video/layout";

describe("PX.4A.1 layout", () => {
  it("sizes 9:16 1:1 16:9 without square-forcing", () => {
    const v = canvasSizeForRatio("9:16", 720);
    const s = canvasSizeForRatio("1:1", 720);
    const l = canvasSizeForRatio("16:9", 720);
    assert.equal(v.height, 720);
    assert.equal(v.width % 2, 0);
    assert.equal(v.height % 2, 0);
    assert.equal(s.width % 2, 0);
    assert.equal(l.height % 2, 0);
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

  it("contain-fit letterboxes without cropping or distorting", () => {
    const rect = containFitRect({
      imageWidth: 1920,
      imageHeight: 1080,
      canvasWidth: 405,
      canvasHeight: 720,
    });
    const scaleX = rect.dw / rect.sw;
    const scaleY = rect.dh / rect.sh;
    assert.ok(Math.abs(scaleX - scaleY) < 1e-9);
    assert.ok(rect.dw <= 405 + 1e-6);
    assert.ok(rect.dh <= 720 + 1e-6);
  });

  it("keeps watermark in the bottom-right safe corner", () => {
    const zones = safeZones({ width: 405, height: 720 });
    assert.ok(zones.watermark.x > 405 / 2);
    assert.ok(zones.watermark.y > 720 / 2);
    assert.ok(zones.watermark.width > zones.watermark.size);
    assert.ok(zones.title.y < zones.watermark.y);
  });
});
