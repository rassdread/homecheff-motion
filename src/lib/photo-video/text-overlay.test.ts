import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_DEFAULT_TEXT_SIZE,
  PHOTO_VIDEO_FONTS,
  PHOTO_VIDEO_FONT_WEIGHT,
  PHOTO_VIDEO_TEXT_COLORS,
  PHOTO_VIDEO_TEXT_SIZE_MAX,
  PHOTO_VIDEO_TEXT_SIZE_MIN,
  canvasFontShorthand,
  clampOverlayPosition,
  clientPointToNormalized,
  createTextOverlay,
  fontSizePx,
  hitTestLayouts,
  nudgeOverlay,
  overlayCollidesWatermark,
  overlayVisibleForPhoto,
} from "@/lib/photo-video/text-overlay";

describe("PX.4A.2 text overlays", () => {
  it("creates an overlay with normalized defaults off the watermark", () => {
    const overlay = createTextOverlay({ id: "t1", photoId: "p0", text: "Vers gemaakt" });
    assert.equal(overlay.photoId, "p0");
    assert.equal(overlay.x, 0.5);
    assert.equal(overlay.y, 0.22);
    assert.equal(overlay.size, PHOTO_VIDEO_DEFAULT_TEXT_SIZE);
    assert.equal(overlay.align, "center");
    assert.equal(overlay.background, "dark");
    assert.equal(overlayCollidesWatermark(overlay.x, overlay.y), false);
  });

  it("clamps drag bounds and keeps text off the watermark corner", () => {
    assert.equal(clampOverlayPosition(0, 0).x >= 0.08, true);
    assert.equal(clampOverlayPosition(0, 0).y >= 0.08, true);
    const corner = clampOverlayPosition(0.99, 0.99);
    assert.equal(corner.x <= 0.58, true);
    assert.equal(overlayCollidesWatermark(corner.x, corner.y), false);
  });

  it("nudges without using raw pixels as canonical position", () => {
    const overlay = createTextOverlay({ id: "t1", photoId: "p0" });
    const next = nudgeOverlay(overlay, 0.1, -0.05);
    assert.equal(next.x > overlay.x, true);
    assert.equal(next.y < overlay.y, true);
    assert.ok(next.x <= 1 && next.x >= 0);
  });

  it("maps pointer coordinates to normalized 0..1 across preview sizes", () => {
    const a = clientPointToNormalized({
      clientX: 50,
      clientY: 100,
      rectLeft: 0,
      rectTop: 0,
      rectWidth: 200,
      rectHeight: 400,
    });
    const b = clientPointToNormalized({
      clientX: 100,
      clientY: 200,
      rectLeft: 0,
      rectTop: 0,
      rectWidth: 400,
      rectHeight: 800,
    });
    assert.equal(a.x, 0.25);
    assert.equal(a.y, 0.25);
    assert.equal(b.x, a.x);
    assert.equal(b.y, a.y);
  });

  it("hit-tests the topmost overlay", () => {
    const hit = hitTestLayouts(
      [
        { id: "a", x: 0, y: 0, width: 100, height: 40 },
        { id: "b", x: 20, y: 10, width: 80, height: 30 },
      ],
      30,
      20
    );
    assert.equal(hit, "b");
    assert.equal(hitTestLayouts([{ id: "a", x: 0, y: 0, width: 10, height: 10 }], 50, 50), null);
  });

  it("shows text only for the active photo", () => {
    const overlay = createTextOverlay({ id: "t1", photoId: "p1" });
    assert.equal(overlayVisibleForPhoto(overlay, "p1"), true);
    assert.equal(overlayVisibleForPhoto(overlay, "p2"), false);
    assert.equal(overlayVisibleForPhoto(overlay, null), false);
  });

  it("offers six named fonts and a compact color set", () => {
    assert.deepEqual([...PHOTO_VIDEO_FONTS], ["modern", "strong", "elegant", "playful", "classic", "script"]);
    assert.ok(PHOTO_VIDEO_TEXT_COLORS.includes("#FFFFFF"));
    assert.ok(PHOTO_VIDEO_TEXT_COLORS.includes("#041428"));
    assert.ok(PHOTO_VIDEO_TEXT_COLORS.includes("#006D52"));
    assert.ok(PHOTO_VIDEO_TEXT_COLORS.includes("#0067B1"));
  });

  it("scales size with canvas resolution without exposing px to the model", () => {
    const small = fontSizePx(PHOTO_VIDEO_TEXT_SIZE_MIN, 405);
    const large = fontSizePx(PHOTO_VIDEO_TEXT_SIZE_MAX, 405);
    const largeExport = fontSizePx(PHOTO_VIDEO_TEXT_SIZE_MAX, 1080);
    assert.ok(large > small);
    assert.ok(largeExport > large);
  });

  it("builds a canvas font shorthand without CSS variables so size is not dropped", () => {
    const geist = canvasFontShorthand("modern", 48, (name) =>
      name === "--font-geist-sans" ? '"Geist", "Geist Fallback"' : ""
    );
    assert.equal(geist.includes("var("), false);
    assert.equal(geist.startsWith("700 48px "), true);
    assert.match(geist, /Geist/);
    const missing = canvasFontShorthand("modern", 48, () => "");
    assert.equal(missing.includes("var("), false);
    assert.match(missing, /ui-sans-serif/);
    const strong = canvasFontShorthand("strong", 48, () => {
      throw new Error("strong must not read CSS variables");
    });
    assert.equal(strong.includes("var("), false);
    assert.equal(strong.startsWith("900 48px "), true);
  });

  it("resolves all six named fonts to a concrete canvas shorthand", () => {
    const geist = '"Geist", "Geist Fallback"';
    for (const font of PHOTO_VIDEO_FONTS) {
      const shorthand = canvasFontShorthand(font, 48, (name) =>
        name === "--font-geist-sans" ? geist : ""
      );
      assert.equal(shorthand.includes("var("), false, `${font} still contains var(`);
      assert.equal(shorthand.startsWith(`${PHOTO_VIDEO_FONT_WEIGHT[font]} 48px `), true, font);
    }
  });
});
