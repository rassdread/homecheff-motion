import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PX.4A.6.2 sticky preview + mobile sheets", () => {
  const composer = read("src/components/photo-video/photo-video-composer.tsx");
  const preview = read("src/components/photo-video/photo-video-preview-canvas.tsx");
  const inspector = read("src/components/photo-video/photo-video-photo-inspector.tsx");
  const toolbar = read("src/components/photo-video/photo-video-edit-toolbar.tsx");
  const text = read("src/components/photo-video/photo-video-text-controls.tsx");
  const exportLocal = read("src/lib/photo-video/export-local.ts");
  const exportUpload = read("src/app/api/photo-video/export-upload/route.ts");
  const exportHandoff = read("src/app/api/photo-video/export-handoff/route.ts");

  it("keeps mobile structure preview → strip → toolbar → inspector", () => {
    const canvas = composer.indexOf("<PhotoVideoPreviewCanvas");
    const strip = composer.indexOf("<PhotoVideoPhotoStrip");
    const bar = composer.indexOf("<PhotoVideoEditToolbar");
    const inspectorUse = composer.indexOf("<PhotoVideoPhotoInspector");
    const global = composer.indexOf('data-testid="px4a-global-video"');
    const actions = composer.indexOf('data-testid="px4a-actions"');
    assert.ok(canvas > 0 && strip > canvas);
    assert.ok(bar > strip);
    assert.ok(inspectorUse > bar);
    assert.ok(global > inspectorUse);
    assert.ok(actions > inspectorUse);
    assert.ok(actions < global);
  });

  it("uses exactly one preview canvas and one rAF loop", () => {
    assert.equal(composer.split("<PhotoVideoPreviewCanvas").length - 1, 1);
    assert.equal(preview.split("requestAnimationFrame(paint)").length - 1, 2);
    assert.match(preview, /cancelAnimationFrame/);
    assert.doesNotMatch(inspector, /requestAnimationFrame/);
    assert.doesNotMatch(toolbar, /requestAnimationFrame/);
  });

  it("sticks preview and strip on small screens only", () => {
    assert.match(composer, /data-testid="px4a-preview-dock"/);
    assert.match(composer, /data-testid="px4a-strip-dock"/);
    assert.match(composer, /max-lg:sticky/);
    assert.match(composer, /safe-area-inset-top/);
    assert.match(composer, /safe-area-inset-bottom/);
    assert.match(composer, /lg:static/);
  });

  it("separates photo editing from whole-video settings", () => {
    assert.match(composer, /px4a.global.legend/);
    assert.match(inspector, /px4a.inspector.thisPhoto|px4a.inspector.titleN/);
    assert.match(toolbar, /px4a.toolbar.text/);
    assert.match(toolbar, /px4a.toolbar.motion/);
    assert.match(toolbar, /px4a.toolbar.order/);
  });

  it("keeps overlay input as explicit text without password rendering", () => {
    assert.match(text, /type="text"/);
    assert.match(text, /\[-webkit-text-security:none\]/);
    assert.doesNotMatch(text, /type="password"/);
    assert.doesNotMatch(text, /autoComplete="new-password"/);
  });

  it("does not let encoder modules import mobile sheet code", () => {
    assert.doesNotMatch(exportLocal, /PhotoVideoEditToolbar|px4a-preview-dock/);
    assert.doesNotMatch(exportUpload, /PhotoVideoEditToolbar|px4a-preview-dock/);
    assert.doesNotMatch(exportHandoff, /PhotoVideoEditToolbar|px4a-preview-dock/);
    assert.doesNotMatch(inspector, /export-local|mediabunny|vidu|elevenlabs/);
    assert.doesNotMatch(toolbar, /export-local|mediabunny|vidu|elevenlabs/);
  });
});
