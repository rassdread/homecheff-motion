import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PX.4A.6.4 transition selector + renderer wiring", () => {
  const composer = read("src/components/photo-video/photo-video-composer.tsx");
  const picker = read("src/components/photo-video/photo-video-transition-picker.tsx");
  const preview = read("src/components/photo-video/photo-video-preview-canvas.tsx");
  const renderFrame = read("src/lib/photo-video/render-frame.ts");
  const exportLocal = read("src/lib/photo-video/export-local.ts");
  const exportUpload = read("src/app/api/photo-video/export-upload/route.ts");
  const exportHandoff = read("src/app/api/photo-video/export-handoff/route.ts");
  const draft = read("src/lib/photo-video/draft-storage.ts");
  const nl = read("src/i18n/locales/nl.ts");

  it("groups standard and signature transitions without a second preview canvas", () => {
    assert.match(composer, /<PhotoVideoTransitionPicker/);
    assert.match(composer, /setTransitionKind\(current, kind, draftContext\)/);
    assert.match(composer, /firstTransitionSeekTime/);
    assert.match(picker, /data-testid="px4a-style"/);
    assert.match(picker, /px4a-transition-group-standard/);
    assert.match(picker, /px4a-transition-group-signature/);
    assert.match(picker, /px4a.transition.cut/);
    assert.match(picker, /px4a.transition.shards/);
    assert.match(picker, /role="radio"/);
    assert.match(picker, /aria-checked/);
    assert.match(picker, /min-h-11/);
    assert.doesNotMatch(picker, /requestAnimationFrame|<canvas/i);
    assert.equal(composer.split("<PhotoVideoPreviewCanvas").length - 1, 1);
    assert.equal(preview.split("requestAnimationFrame(paint)").length - 1, 2);
  });

  it("keeps Overgang first-class after Video, before Beweging and Muziek", () => {
    const duration = composer.indexOf('testId="px4a-video-duration"');
    const ratio = composer.indexOf('testId="px4a-ratio"');
    const grid = composer.indexOf("lg:grid-cols-2");
    const style = composer.indexOf("<PhotoVideoTransitionPicker");
    const movement = composer.indexOf('testId="px4a-movement"');
    const audio = composer.indexOf('data-testid="px4a-audio"');
    assert.ok(duration > 0 && ratio > duration);
    assert.ok(style > ratio && movement > style && audio > movement);
    const videoBlock = composer.slice(grid, style);
    assert.match(videoBlock, /px4a-video-duration/);
    assert.match(videoBlock, /px4a-ratio/);
    assert.doesNotMatch(videoBlock, /px4a-movement/);
    assert.match(nl, /"px4a.style.legend": "Overgang"/);
    assert.match(nl, /"px4a.transition.shards": "Scherven"/);
    assert.match(nl, /"px4a.transition.split": "Split"/);
    assert.match(nl, /"px4a.audio.catalog": "Gratis muziek"/);
    assert.match(picker, /px4a.slice1b.transition.signatureBrand/);
    assert.match(composer, /PHOTO_VIDEO_MUSIC_CATALOG_STATUS !== "empty"/);
    assert.match(composer, /data-testid="px4a-audio-own"/);
    assert.match(picker, /px4a.transition.split/);
    assert.match(picker, /px4a.transition.strips/);
    assert.match(picker, /px4a.transition.lens/);
  });

  it("uses one compositor for preview and export and keeps watermark last", () => {
    assert.match(renderFrame, /renderTransitionFrame/);
    assert.match(renderFrame, /hashTransitionSeed/);
    const watermark = renderFrame.indexOf("drawWatermark");
    const transition = renderFrame.indexOf("renderTransitionFrame");
    assert.ok(transition > 0 && watermark > transition);
    assert.match(exportLocal, /drawPhotoVideoFrame/);
    assert.doesNotMatch(exportLocal, /renderTransitionFrame/);
  });

  it("persists transitionKind and mixed-media metadata in draft v3", () => {
    assert.match(draft, /transitionKind: composition.transitionKind/);
    assert.match(draft, /PHOTO_VIDEO_DRAFT_VERSION = 3/);
    assert.match(draft, /migrateComposition/);
  });

  it("does not introduce encoder, provider, or credit imports", () => {
    assert.doesNotMatch(picker, /vidu|runway|kling|elevenlabs|estimatecredits|chargecredits|mediabunny/i);
    assert.doesNotMatch(composer, /vidu|elevenlabs|estimatecredits|chargecredits/i);
    assert.doesNotMatch(exportLocal, /PhotoVideoTransitionPicker|px4a.transition.shards/);
    assert.doesNotMatch(exportUpload, /PhotoVideoTransitionPicker|px4a.transition.shards/);
    assert.doesNotMatch(exportHandoff, /PhotoVideoTransitionPicker|px4a.transition.shards/);
  });
});
