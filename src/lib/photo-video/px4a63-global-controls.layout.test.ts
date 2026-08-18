import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_ITEM_DURATION_PRESETS,
  PHOTO_VIDEO_RATIOS,
  PHOTO_VIDEO_STYLES,
  PHOTO_VIDEO_STUDIO_DURATION_PRESETS,
  photoVideoDurationPresets,
  photoVideoMaxSeconds,
} from "@/lib/photo-video/constants";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PX.4A.6.3 whole-video settings", () => {
  const composer = read("src/components/photo-video/photo-video-composer.tsx");
  const inspector = read("src/components/photo-video/photo-video-photo-inspector.tsx");
  const chrome = read("src/components/layout/app-shell-chrome.tsx");
  const nl = read("src/i18n/locales/nl.ts");
  const music = read("src/components/photo-video/photo-video-music-panel.tsx");
  const draft = read("src/lib/photo-video/draft-storage.ts");
  const exportLocal = read("src/lib/photo-video/export-local.ts");
  const exportUpload = read("src/app/api/photo-video/export-upload/route.ts");
  const exportHandoff = read("src/app/api/photo-video/export-handoff/route.ts");

  it("keeps whole-video settings after selected-photo editing and actions", () => {
    const inspectorUse = composer.indexOf("<PhotoVideoPhotoInspector");
    const actions = composer.indexOf('data-testid="px4a-actions"');
    const global = composer.indexOf('data-testid="px4a-global-video"');
    const duration = composer.indexOf('testId="px4a-video-duration"');
    const ratio = composer.indexOf('testId="px4a-ratio"');
    const style = composer.indexOf('testId="px4a-style"');
    const movement = composer.indexOf('testId="px4a-movement"');
    const audio = composer.indexOf('data-testid="px4a-audio"');
    assert.ok(inspectorUse > 0 && actions > inspectorUse);
    assert.ok(global > actions);
    assert.ok(duration > global);
    assert.ok(ratio > duration);
    assert.ok(style > ratio);
    assert.ok(movement > style);
    assert.ok(audio > movement);
    assert.match(composer, /lg:grid-cols-2/);
    assert.match(composer, /data-testid="px4a-global-more"/);
    assert.match(composer, /max-lg:sticky/);
  });

  it("keeps context-specific duration limits", () => {
    assert.deepEqual([...photoVideoDurationPresets("homecheff-item")], [...PHOTO_VIDEO_ITEM_DURATION_PRESETS]);
    assert.deepEqual([...photoVideoDurationPresets("studio")], [...PHOTO_VIDEO_STUDIO_DURATION_PRESETS]);
    assert.equal(photoVideoMaxSeconds("homecheff-item"), 30);
    assert.equal(photoVideoMaxSeconds("studio"), 60);
    assert.equal(PHOTO_VIDEO_ITEM_DURATION_PRESETS.includes(60 as never), false);
    assert.match(composer, /photoVideoDurationPresets\(draftContext\)/);
    assert.match(composer, /px4a.videoDuration.homecheffMax/);
  });

  it("maps format and overgang UI to existing stored values", () => {
    assert.deepEqual([...PHOTO_VIDEO_RATIOS], ["9:16", "1:1", "16:9"]);
    assert.deepEqual([...PHOTO_VIDEO_STYLES], ["auto", "smooth", "calm", "energetic"]);
    assert.match(nl, /"px4a.ratio.verticalHint": "9:16"/);
    assert.match(nl, /"px4a.ratio.squareHint": "1:1"/);
    assert.match(nl, /"px4a.ratio.landscapeHint": "16:9"/);
    assert.match(nl, /"px4a.style.legend": "Overgang"/);
    assert.match(composer, /setStyle\(current, id, draftContext\)/);
    assert.match(composer, /value=\{composition\.style\}/);
    assert.doesNotMatch(composer, /transitionKind|new Transition/);
  });

  it("keeps selected-photo movement separate from the video default", () => {
    assert.match(inspector, /data-testid="px4a-movement-photo"/);
    assert.match(composer, /testId="px4a-movement"/);
    assert.match(composer, /px4a.movement.globalHint/);
    assert.match(inspector, /px4a.movement.photoAutoHint/);
    assert.doesNotMatch(composer.split('testId="px4a-movement"')[1] ?? "", /zoom-in|pan-left/);
  });

  it("shows own-music controls only after Eigen muziek", () => {
    assert.match(composer, /showMusic \? \(/);
    assert.match(composer, /<PhotoVideoMusicPanel/);
    assert.match(music, /px4a.audio.volume/);
    assert.match(music, /px4a.audio.window/);
  });

  it("restores stored style, pace, and movement without a draft migration", () => {
    assert.match(draft, /style:/);
    assert.match(draft, /pace:/);
    assert.match(draft, /movementMode/);
    assert.match(draft, /durationSeconds/);
    assert.match(draft, /migrateComposition/);
    assert.doesNotMatch(draft, /px4a-global-more/);
  });

  it("does not introduce encoder, provider, or credit imports", () => {
    assert.doesNotMatch(composer, /vidu|elevenlabs|estimatecredits|chargecredits/i);
    assert.doesNotMatch(exportLocal, /px4a-global-more|px4a.style.hint/);
    assert.doesNotMatch(exportUpload, /px4a-global-more|PhotoVideoEditToolbar/);
    assert.doesNotMatch(exportHandoff, /px4a-global-more|px4a.style.hint/);
  });

  it("hides standalone credit chrome without removing billing architecture", () => {
    assert.match(chrome, /isPx4aStandaloneCreatorPath/);
    assert.match(chrome, /standaloneCreator \? null : <GlobalCreditIndicator/);
    assert.match(chrome, /standaloneCreator \? null : <BillingConversionShell/);
    assert.match(chrome, /<BillingConversionShell/);
    assert.match(chrome, /<GlobalCreditIndicator/);
  });
});
