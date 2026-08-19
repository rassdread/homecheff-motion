import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  PHOTO_CONTEXT_ACTIONS,
  VIDEO_CONTEXT_ACTIONS,
  contextActionsForMode,
  normalizeContextAction,
} from "@/lib/photo-video/context-actions";

describe("Slice 1B — Quick Video clarity", () => {
  const composer = readFileSync("src/components/photo-video/photo-video-composer.tsx", "utf8");
  const inspector = readFileSync("src/components/photo-video/photo-video-photo-inspector.tsx", "utf8");
  const contextBar = readFileSync("src/components/photo-video/photo-video-context-bar.tsx", "utf8");
  const strip = readFileSync("src/components/photo-video/photo-video-photo-strip.tsx", "utf8");
  const picker = readFileSync("src/components/photo-video/photo-video-transition-picker.tsx", "utf8");
  const exportLocal = readFileSync("src/lib/photo-video/export-local.ts", "utf8");

  it("replaces mobile tab toolbar with contextual action bar", () => {
    assert.match(composer, /PhotoVideoContextBar/);
    assert.doesNotMatch(composer, /PhotoVideoEditToolbar/);
    assert.match(contextBar, /data-testid="px4a-context-bar"/);
    assert.match(contextBar, /data-testid=\{`px4a-context-\$\{id\}`\}/);
    assert.match(contextBar, /contextActionsForMode/);
  });

  it("maps photo and video selections to distinct context actions", () => {
    assert.deepEqual(PHOTO_CONTEXT_ACTIONS, ["text", "motion", "order"]);
    assert.deepEqual(VIDEO_CONTEXT_ACTIONS, ["text", "trim", "fit", "audio", "order"]);
    assert.ok(contextActionsForMode("video").includes("trim"));
    assert.equal(normalizeContextAction("photo", "trim"), "text");
  });

  it("shows trim, fit, and source audio in separate inspector sections", () => {
    assert.match(inspector, /sectionVisible\(contextAction, "trim"\)/);
    assert.match(inspector, /sectionVisible\(contextAction, "fit"\)/);
    assert.match(inspector, /sectionVisible\(contextAction, "audio"\)/);
    assert.match(inspector, /px4a.slice1b.video.audio/);
    assert.match(inspector, /px4a.slice1b.fit.cover/);
    assert.doesNotMatch(inspector, /panel === "clip"/);
  });

  it("implements phone landscape side-by-side posture", () => {
    assert.match(composer, /usePhotoVideoLayoutPosture/);
    assert.match(composer, /data-posture=\{posture\}/);
    assert.match(composer, /data-testid="px4a-left-pane"/);
    assert.match(composer, /data-testid="px4a-right-pane"/);
    assert.match(composer, /data-testid="px4a-landscape-header"/);
    assert.match(composer, /flex-\[55\]/);
    assert.match(composer, /flex-\[45\]/);
  });

  it("collapses global settings on mobile when a clip is selected", () => {
    assert.match(composer, /data-testid="px4a-global-video"/);
    assert.match(composer, /px4a.slice1b.global.title/);
    assert.match(composer, /globalExpanded/);
  });

  it("keeps signature transitions visible under HomeCheff Studio group", () => {
    assert.match(picker, /px4a-transition-group-signature/);
    assert.match(picker, /px4a.slice1b.transition.signatureBrand/);
    assert.match(picker, /data-testid=\{`px4a-transition-\$\{kind\}`\}/);
    assert.match(picker, /hc_shards/);
  });

  it("shows video preparing state instead of broken black tile", () => {
    assert.match(strip, /px4a-video-preparing/);
    assert.match(strip, /px4a.slice1b.media.preparing/);
    assert.match(strip, /px4a.slice1b.media.videoBadge/);
  });

  it("does not change local encode pipeline or provider isolation", () => {
    assert.doesNotMatch(composer, /vidu|elevenlabs|ffmpeg/i);
    assert.match(exportLocal, /drawPhotoVideoFrame/);
    assert.doesNotMatch(exportLocal, /PhotoVideoContextBar/);
  });

  it("has NL/EN parity for slice1b keys", () => {
    const prefix = "px4a.slice1b.";
    const nlKeys = Object.keys(nl).filter((key) => key.startsWith(prefix));
    const enKeys = Object.keys(en).filter((key) => key.startsWith(prefix));
    assert.deepEqual(nlKeys.sort(), enKeys.sort());
    assert.equal(nl["px4a.slice1b.context.trim"], "Inkorten");
    assert.equal(en["px4a.slice1b.context.trim"], "Trim");
  });
});
