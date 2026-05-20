import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRgbaForText } from "@/lib/ocr-text-heuristics";

function fillFlat(width: number, height: number, rgb: [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    data[o] = rgb[0];
    data[o + 1] = rgb[1];
    data[o + 2] = rgb[2];
    data[o + 3] = 255;
  }
  return data;
}

function addTextBand(data: Uint8ClampedArray, width: number, y: number, h: number): void {
  for (let row = y; row < y + h; row += 1) {
    for (let x = 0; x < width; x += 1) {
      const dark = x % 12 < 6;
      const o = (row * width + x) * 4;
      data[o] = dark ? 20 : 240;
      data[o + 1] = dark ? 20 : 240;
      data[o + 2] = dark ? 20 : 240;
    }
  }
}

describe("ocr-text-heuristics", () => {
  it("flags flat images as unlikely to have text", () => {
    const w = 128;
    const h = 128;
    const rgba = fillFlat(w, h, [120, 120, 120]);
    const r = analyzeRgbaForText(w, h, rgba);
    assert.equal(r.likelyHasText, false);
  });

  it("flags high-contrast band images as likely text", () => {
    const w = 128;
    const h = 128;
    const rgba = fillFlat(w, h, [200, 200, 200]);
    addTextBand(rgba, w, 40, 24);
    const r = analyzeRgbaForText(w, h, rgba);
    assert.equal(r.likelyHasText, true);
  });
});
