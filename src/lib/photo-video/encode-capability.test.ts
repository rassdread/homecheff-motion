import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  claimedRecorderMimes,
  firstClaimedHomecheffMime,
  isHomecheffListingVideoMime,
  planClientEncode,
} from "@/lib/photo-video/encode-capability";
import { PHOTO_VIDEO_WATERMARK_SRC } from "@/lib/photo-video/constants";
import { HOMECHEFF_BRAND_ICON_SOURCE } from "@/lib/homecheff-brand-icon";

const ROOT = process.cwd();
const PV = join(ROOT, "src/lib/photo-video");
const COMP = join(ROOT, "src/components/photo-video");

function filesIn(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => (name.endsWith(".ts") || name.endsWith(".tsx")) && !name.includes(".test."))
    .map((name) => join(dir, name));
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const FORBIDDEN = [
  "vidu",
  "elevenlabs",
  "deevid",
  "ffmpeg",
  "instant-premium",
  "estimateCredits",
  "chargeCredits",
  "VIDEO_WORKER",
  "@ffmpeg",
];

describe("PX.4A.1 encode plan + isolation", () => {
  it("treats only MP4-family MIME as HomeCheff listing-compatible", () => {
    assert.equal(isHomecheffListingVideoMime("video/mp4"), true);
    assert.equal(isHomecheffListingVideoMime("video/mp4;codecs=avc1.42E01E"), true);
    assert.equal(isHomecheffListingVideoMime("video/webm"), false);
    assert.equal(isHomecheffListingVideoMime("video/webm;codecs=vp9"), false);
  });

  it("does not treat isTypeSupported as a real export", () => {
    const claims = claimedRecorderMimes((type) => type.startsWith("video/mp4"));
    assert.equal(firstClaimedHomecheffMime(claims)?.startsWith("video/mp4"), true);
    const unproven = planClientEncode({
      hasMediaRecorder: true,
      actualBlobMime: null,
      actualBlobSize: 0,
      claimedMp4: true,
      webCodecsAvcSupported: true,
    });
    assert.equal(unproven.homecheffListingCompatible, false);
    assert.equal(unproven.path, "webcodecs-avc-mp4");
  });

  it("rejects empty MP4 Blobs even when MIME looks compatible", () => {
    const plan = planClientEncode({
      hasMediaRecorder: true,
      actualBlobMime: "video/mp4; codecs=avc1.42000a",
      actualBlobSize: 0,
      claimedMp4: true,
      webCodecsAvcSupported: true,
    });
    assert.equal(plan.homecheffListingCompatible, false);
    assert.equal(plan.path, "webcodecs-avc-mp4");
  });

  it("plans WebCodecs AVC when real Blob is WebM", () => {
    const plan = planClientEncode({
      hasMediaRecorder: true,
      actualBlobMime: "video/webm;codecs=vp9",
      actualBlobSize: 1200,
      claimedMp4: false,
      webCodecsAvcSupported: true,
    });
    assert.equal(plan.path, "webcodecs-avc-mp4");
    assert.equal(plan.homecheffListingCompatible, false);
    assert.match(plan.notes, /WebCodecs/);
  });

  it("accepts a real MP4 Blob as the MediaRecorder path", () => {
    const plan = planClientEncode({
      hasMediaRecorder: true,
      actualBlobMime: "video/mp4",
      actualBlobSize: 4096,
      claimedMp4: true,
      webCodecsAvcSupported: false,
    });
    assert.equal(plan.path, "mediarecorder-mp4");
    assert.equal(plan.homecheffListingCompatible, true);
  });

  it("watermark constant matches brand SSOT", () => {
    assert.equal(PHOTO_VIDEO_WATERMARK_SRC, HOMECHEFF_BRAND_ICON_SOURCE);
    assert.equal(PHOTO_VIDEO_WATERMARK_SRC, "/homecheff-globe-man.png");
  });

  it("photo-video sources do not call paid providers, credits, or ffmpeg", () => {
    for (const file of [...filesIn(PV), ...filesIn(COMP)]) {
      const source = read(file).toLowerCase();
      for (const token of FORBIDDEN) {
        assert.equal(source.includes(token.toLowerCase()), false, `${file} contains ${token}`);
      }
    }
  });

  it("promotes free creator on Home funnel without loading the composer", () => {
    const dashboard = read(join(ROOT, "src/components/studio/studio-home-dashboard.tsx"));
    assert.match(dashboard, /StudioPx4aFreeCreatorBanner/);
    assert.doesNotMatch(dashboard, /photo-video-composer|photo-video-music-panel/);
    assert.doesNotMatch(read(join(ROOT, "src/components/studio/studio-px3-intent-chooser.tsx")), /photo-video/);
    assert.doesNotMatch(read(join(ROOT, "src/lib/studio-px3-home.ts")), /photo-video/);
    const funnel = read(join(ROOT, "src/components/studio/studio-experience-pack-funnel.tsx"));
    assert.match(funnel, /StudioPx4aFreeCreatorBanner/);
    assert.doesNotMatch(funnel, /photo-video-composer|photo-video-music-panel/);
    const banner = read(join(ROOT, "src/components/studio/studio-px4a-free-creator-banner.tsx"));
    assert.match(banner, /\/studio\/photo-video/);
    assert.doesNotMatch(banner, /photo-video-composer/);
  });

  it("lazy-loads the composer from its own route", () => {
    const page = read(join(ROOT, "src/app/studio/photo-video/page.tsx"));
    const client = read(join(ROOT, "src/app/studio/photo-video/photo-video-page-client.tsx"));
    assert.match(page, /maybeSilentHydratePublicStudio/);
    assert.match(page, /PhotoVideoPageClient/);
    assert.match(client, /next\/dynamic/);
    assert.match(client, /ssr:\s*false/);
    assert.match(client, /photo-video-composer/);
  });

  it("lazy-loads own-music tooling only from the composer, not Studio Home", () => {
    const composer = read(join(ROOT, "src/components/photo-video/photo-video-composer.tsx"));
    const home = read(join(ROOT, "src/app/page.tsx"));
    assert.match(composer, /next\/dynamic/);
    assert.match(composer, /photo-video-music-panel/);
    assert.doesNotMatch(composer, /decodeAudioData|AudioContext/);
    assert.doesNotMatch(home, /photo-video-music-panel|decodeAudioData/);
    const dashboard = read(join(ROOT, "src/components/studio/studio-home-dashboard.tsx"));
    assert.doesNotMatch(dashboard, /export-local|mediabunny/);
  });

  it("lazy-loads the HomeCheff item creator and hides Studio chrome", () => {
    const fromItem = read(join(ROOT, "src/app/studio/photo-video/from-item/from-item-client.tsx"));
    const composer = read(join(ROOT, "src/components/photo-video/photo-video-composer.tsx"));
    const chrome = read(join(ROOT, "src/components/layout/app-shell-chrome.tsx"));
    const preview = read(join(ROOT, "src/components/photo-video/photo-video-preview-canvas.tsx"));
    const render = read(join(ROOT, "src/lib/photo-video/render-frame.ts"));
    assert.match(fromItem, /next\/dynamic/);
    assert.match(fromItem, /ssr:\s*false/);
    assert.match(fromItem, /mode=\"homecheff-item\"/);
    assert.match(composer, /skipAuthGate/);
    assert.match(composer, /PHOTO_VIDEO_ITEM_DEFAULT_RATIO/);
    assert.match(composer, /px4a-item-back/);
    assert.match(composer, /px4a-item-finish-hint/);
    assert.match(composer, /px4a-export-download/);
    assert.match(composer, /export-local/);
    assert.doesNotMatch(composer, /from [\"']mediabunny[\"']/);
    assert.doesNotMatch(composer, /koop credits|upgrade nu/);
    assert.match(chrome, /isPx4aItemCreatorPath/);
    assert.match(chrome, /px4a-item-shell/);
    assert.match(preview, /drawPhotoVideoFrame/);
    assert.match(render, /HomeCheff Studio/);
  });

  it("does not sell credits inside the free composer", () => {
    for (const file of [...filesIn(PV), ...filesIn(COMP)]) {
      const source = read(file).toLowerCase();
      assert.equal(source.includes("koop credits"), false, file);
      assert.equal(source.includes("upgrade nu"), false, file);
    }
  });
});
