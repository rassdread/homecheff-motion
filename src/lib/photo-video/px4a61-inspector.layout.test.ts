import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PX.4A.6.1 selected-photo inspector layout", () => {
  const composer = read("src/components/photo-video/photo-video-composer.tsx");
  const strip = read("src/components/photo-video/photo-video-photo-strip.tsx");
  const inspector = read("src/components/photo-video/photo-video-photo-inspector.tsx");
  const text = read("src/components/photo-video/photo-video-text-controls.tsx");
  const exportLocal = read("src/lib/photo-video/export-local.ts");
  const exportUpload = read("src/app/api/photo-video/export-upload/route.ts");
  const exportHandoff = read("src/app/api/photo-video/export-handoff/route.ts");

  it("keeps preview, strip, and inspector before global controls", () => {
    const preview = composer.indexOf("<PhotoVideoPreviewCanvas");
    const stripUse = composer.indexOf("<PhotoVideoPhotoStrip");
    const inspectorUse = composer.indexOf("<PhotoVideoPhotoInspector");
    const ratio = composer.indexOf('testId="px4a-ratio"');
    const audio = composer.indexOf('data-testid="px4a-audio"');
    const finish = composer.indexOf('data-testid="px4a-item-finish"');
    assert.ok(preview > 0 && stripUse > preview);
    assert.ok(inspectorUse > stripUse);
    assert.ok(ratio > inspectorUse);
    assert.ok(audio > ratio);
    assert.ok(finish > inspectorUse);
  });

  it("adds a + Foto tile on the existing file input path", () => {
    assert.match(strip, /px4a-add-photo-tile/);
    assert.match(strip, /getElementById\(fileInputId\)/);
    assert.match(composer, /data-testid="px4a-file-input"/);
    assert.match(composer, /canAdd=\{canAddPhoto/);
    assert.match(composer, /createLocalPhoto/);
    assert.doesNotMatch(strip, /type="file"/);
  });

  it("selecting a photo seeks and pauses preview", () => {
    assert.match(composer, /const selectPhoto = useCallback/);
    assert.match(composer, /clockRef\.current = seekTimeForPhoto/);
    assert.match(composer, /setPlaying\(false\)/);
  });

  it("makes overlay input an explicit text field", () => {
    assert.match(text, /type="text"/);
    assert.match(text, /autoComplete="off"/);
    assert.match(text, /autoCorrect="on"/);
    assert.match(text, /inputMode="text"/);
    assert.doesNotMatch(text, /type="password"/);
    assert.doesNotMatch(text, /text-security/);
    assert.doesNotMatch(text, /autoComplete="new-password"/);
  });

  it("does not touch encoder, upload, or HMAC routes", () => {
    assert.doesNotMatch(inspector, /export-local|mediabunny|vidu|elevenlabs/);
    assert.doesNotMatch(exportLocal, /PhotoVideoPhotoInspector/);
    assert.doesNotMatch(exportUpload, /PhotoVideoPhotoInspector/);
    assert.doesNotMatch(exportHandoff, /PhotoVideoPhotoInspector/);
  });
});
