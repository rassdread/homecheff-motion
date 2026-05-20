import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPosterMotionBlendFilterSimple,
  normalizeOverlayToPosterCanvas,
} from "./poster-motion-normalize";
import { resolvePosterMotionBlendStrength } from "./poster-motion-preserve";
import { DEFAULT_POSTER_MOTION_SETTINGS } from "./poster-motion-preserve";

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

  it("uses lighten blend not screen", () => {
    const graph = buildPosterMotionBlendFilterSimple({
      baseFilter: "scale=1280:1920",
      overlayFilter: "scale=1280:1920:force_original_aspect_ratio=increase,crop=1280:1920",
      blendStrength: 0.18,
    });
    assert.match(graph, /blend=all_mode=lighten:all_opacity=0\.18/);
    assert.doesNotMatch(graph, /screen/);
    assert.match(graph, /saturation=0\.25/);
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

describe("resolvePosterMotionBlendStrength", () => {
  it("defaults to cinematic 0.18 when text preservation is off", () => {
    assert.equal(
      resolvePosterMotionBlendStrength({
        ...DEFAULT_POSTER_MOTION_SETTINGS,
        preserveAllText: false,
      }),
      0.18
    );
  });

  it("uses 0.10 for text-heavy posters", () => {
    assert.equal(
      resolvePosterMotionBlendStrength({
        ...DEFAULT_POSTER_MOTION_SETTINGS,
        preserveAllText: true,
      }),
      0.1
    );
  });

  it("clamps custom strength to 0.30 max", () => {
    assert.equal(
      resolvePosterMotionBlendStrength({
        ...DEFAULT_POSTER_MOTION_SETTINGS,
        posterMotionBlendStrength: 0.9,
      }),
      0.3
    );
  });
});
