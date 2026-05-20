import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOverlayToPosterCanvas } from "./poster-motion-normalize";

describe("normalizeOverlayToPosterCanvas", () => {
  it("scales overlay up and center-crops to portrait poster", () => {
    const r = normalizeOverlayToPosterCanvas({
      posterWidth: 1280,
      posterHeight: 1920,
      overlayWidth: 1280,
      overlayHeight: 720,
    });
    assert.equal(r.posterWidth, 1280);
    assert.equal(r.posterHeight, 1920);
    assert.equal(r.overlayAfterWidth, 1280);
    assert.equal(r.overlayAfterHeight, 1920);
    assert.match(
      r.overlayFilter,
      /scale=1280:1920:force_original_aspect_ratio=increase,crop=1280:1920/
    );
  });

  it("normalizes landscape poster and wide overlay", () => {
    const r = normalizeOverlayToPosterCanvas({
      posterWidth: 1920,
      posterHeight: 1080,
      overlayWidth: 1280,
      overlayHeight: 720,
    });
    assert.equal(r.overlayAfterWidth, 1920);
    assert.equal(r.overlayAfterHeight, 1080);
    assert.match(r.overlayFilter, /crop=1920:1080/);
  });

  it("pads base stream without stretching", () => {
    const r = normalizeOverlayToPosterCanvas({
      posterWidth: 1080,
      posterHeight: 1920,
      overlayWidth: 720,
      overlayHeight: 1280,
    });
    assert.match(r.baseFilter, /force_original_aspect_ratio=decrease/);
    assert.match(r.baseFilter, /pad=1080:1920/);
  });
});
