import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PX.4A.7 mixed media layout", () => {
  const composer = read("src/components/photo-video/photo-video-composer.tsx");
  const strip = read("src/components/photo-video/photo-video-photo-strip.tsx");
  const inspector = read("src/components/photo-video/photo-video-photo-inspector.tsx");
  const toolbar = read("src/components/photo-video/photo-video-edit-toolbar.tsx");
  const contextBar = read("src/components/photo-video/photo-video-context-bar.tsx");
  const trim = read("src/components/photo-video/photo-video-trim-control.tsx");
  const preview = read("src/components/photo-video/photo-video-preview-canvas.tsx");
  const duration = read("src/lib/photo-video/duration.ts");
  const exportLocal = read("src/lib/photo-video/export-local.ts");
  const draft = read("src/lib/photo-video/draft-storage.ts");
  const handoff = read("src/lib/photo-video/item-handoff.ts");

  it("exposes photo and video add tiles without hiding video", () => {
    assert.match(strip, /px4a-add-photo-tile/);
    assert.match(strip, /px4a-add-video-tile/);
    assert.match(composer, /px4a-video-input/);
    assert.doesNotMatch(composer, /advanced.*video/i);
  });

  it("shows trim, source audio, and no photo movement on video clips", () => {
    assert.match(trim, /px4a.video.trimLegend/);
    assert.match(inspector, /px4a-video-audio/);
    assert.match(inspector, /hasPhoto && !video/);
    assert.match(contextBar, /trim/);
  });

  it("uses one preview canvas and video elements only as hidden decoders", () => {
    assert.equal(composer.split("<PhotoVideoPreviewCanvas").length - 1, 1);
    assert.match(preview, /createDetachedVideoElement/);
    assert.match(preview, /data-testid="px4a-preview-canvas"/);
    assert.doesNotMatch(preview, /<canvas[\s\S]*<canvas/);
  });

  it("keeps one duration engine and blocks over-budget instead of speeding up", () => {
    assert.match(duration, /videoOverBudget/);
    assert.match(composer, /px4a.video.overBudget/);
    assert.doesNotMatch(duration, /playbackRate|speed up/i);
  });

  it("persists video metadata without object URLs and accepts v1/v2 drafts", () => {
    assert.match(draft, /PHOTO_VIDEO_DRAFT_VERSION = 3/);
    assert.match(draft, /PHOTO_VIDEO_DRAFT_ACCEPTED_VERSIONS = \[1, 2, 3\]/);
    assert.match(draft, /poster:\$\{photo.id\}/);
    assert.doesNotMatch(draft, /objectUrl: photo.video/);
  });

  it("does not write source clips into HomeCheff listing handoff tokens", () => {
    assert.match(handoff, /HTTPS listing Blob URLs only/);
    assert.doesNotMatch(handoff, /mediaKind|objectUrl|IndexedDB/);
  });

  it("flattens mixed media through the existing local encoder", () => {
    assert.match(exportLocal, /seekHtmlVideo/);
    assert.match(exportLocal, /mixExportAudio/);
    assert.match(exportLocal, /drawPhotoVideoFrame/);
    assert.doesNotMatch(exportLocal, /vidu|elevenlabs|ffmpeg/i);
  });
});
