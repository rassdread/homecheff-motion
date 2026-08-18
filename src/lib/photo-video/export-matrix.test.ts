import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPhotos,
  addTextForPhoto,
  compositionDuration,
  createLocalPhoto,
  createPhotoVideoComposition,
  setAudio,
  setDurationSeconds,
  setMovementMode,
  setPhotoMotionKind,
  setStyle,
} from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_MAX_SECONDS, PHOTO_VIDEO_STUDIO_MAX_SECONDS, photoVideoDurationPresets } from "@/lib/photo-video/constants";
import { ownMusicExportWindow, ownMusicIsSilentAt } from "@/lib/photo-video/export-audio";
import { nextListingVideoAfterExport, exportBusyGuard, canAttemptPhotoVideoExport } from "@/lib/photo-video/export-handoff";
import { PHOTO_VIDEO_MUXER_LICENSE, PHOTO_VIDEO_MUXER_PACKAGE, PHOTO_VIDEO_EXPORT_FILENAME } from "@/lib/photo-video/export-muxer";
import { photoVideoExportMaxEdge, photoVideoExportSettings, PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS } from "@/lib/photo-video/export-settings";
import {
  isSafeExportFilename,
  looksLikeMp4Bytes,
  validatePhotoVideoExportComposition,
  validatePhotoVideoExportFile,
} from "@/lib/photo-video/export-validate";
import {
  createExportAttachPayload,
  isAllowedExportVideoUrl,
  parseExportAttachPayload,
} from "@/lib/photo-video/export-attach-payload";
import { signExportAttachPayload, verifyExportAttachToken } from "@/lib/photo-video/export-attach-crypto";
import { playheadAt, motionKindForClip } from "@/lib/photo-video/timeline";
import { PHOTO_VIDEO_DEFAULT_VOLUME } from "@/lib/photo-video/audio";
import { photoVideoActionClass, PHOTO_VIDEO_CAPABILITY } from "@/lib/photo-video/capability";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function photos(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createLocalPhoto({
      id: `p${i}`,
      previewUrl: `blob:test/${i}`,
      naturalWidth: 800,
      naturalHeight: 1200,
    })
  );
}

function composition(count: number, seconds: number, context: "studio" | "homecheff-item" = "homecheff-item") {
  return setDurationSeconds(addPhotos(createPhotoVideoComposition(undefined, context), photos(count)), seconds, context);
}

describe("PX.4A.5 export matrix", () => {
  it("A. selected duration is export duration", () => {
    for (const seconds of [10, 15, 30]) {
      const c = composition(4, seconds, "homecheff-item");
      const v = validatePhotoVideoExportComposition(c, "homecheff-item");
      assert.equal(v.ok, true);
      if (v.ok) assert.equal(v.durationSeconds, seconds);
      assert.equal(compositionDuration(c, "homecheff-item").totalSeconds, seconds);
    }
  });

  it("B. HomeCheff cannot export >30 sec", () => {
    assert.equal(PHOTO_VIDEO_MAX_SECONDS, 30);
    assert.equal(photoVideoDurationPresets("homecheff-item").includes(45), false);
    assert.equal(photoVideoDurationPresets("homecheff-item").includes(60), false);
    const c = setDurationSeconds(composition(4, 30, "homecheff-item"), 45, "homecheff-item");
    assert.equal(compositionDuration(c, "homecheff-item").totalSeconds, 30);
    assert.equal(validatePhotoVideoExportComposition(c, "homecheff-item").ok, true);
  });

  it("C. Studio duration context remains separate", () => {
    const studio = composition(4, 45, "studio");
    assert.equal(compositionDuration(studio, "studio").totalSeconds, 45);
    assert.equal(photoVideoDurationPresets("studio").includes(45), true);
    assert.equal(photoVideoDurationPresets("studio").includes(60), true);
    assert.equal(photoVideoDurationPresets("homecheff-item").includes(45), false);
    assert.equal(PHOTO_VIDEO_STUDIO_MAX_SECONDS, 60);
    assert.equal(PHOTO_VIDEO_STUDIO_CERTIFIED_EXPORT_MAX_SECONDS, 30);
  });

  it("D–G. photo count x duration preflight", () => {
    for (const [count, seconds] of [
      [2, 15],
      [12, 15],
      [4, 30],
      [12, 30],
    ] as const) {
      const c = composition(count, seconds, "homecheff-item");
      const v = validatePhotoVideoExportComposition(c, "homecheff-item");
      assert.equal(v.ok, true);
      if (v.ok) {
        assert.equal(v.photoCount, count);
        assert.equal(v.durationSeconds, seconds);
      }
    }
  });

  it("H. transitions come from the canonical timeline", () => {
    const c = setStyle(composition(4, 15), "smooth");
    const head = playheadAt(c, 0.01, "homecheff-item");
    assert.ok(head.from);
    assert.equal(typeof head.mix, "number");
  });

  it("I–K. movement auto, none, and per-photo", () => {
    const auto = setMovementMode(composition(3, 15), "auto");
    const none = setMovementMode(composition(3, 15), "none");
    const clip = playheadAt(auto, 0.2, "homecheff-item").from;
    assert.ok(clip);
    assert.equal(motionKindForClip(none, clip), "none");
    const per = setPhotoMotionKind(auto, clip.photo.id, "zoom-in");
    assert.equal(motionKindForClip(per, clip), "zoom-in");
  });

  it("L. text overlays stay on the composition used for export", () => {
    const c = addTextForPhoto(composition(2, 15), { id: "t0", photoId: "p0", text: "Hallo" });
    assert.equal(c.overlays[0]?.text, "Hallo");
  });

  it("M–Q. own music window, start, volume, none, and no loop", () => {
    const none = composition(2, 15);
    assert.equal(ownMusicExportWindow(none.audio, 15), null);
    const music = setAudio(none, {
      kind: "ownMusic",
      startSeconds: 12,
      durationSeconds: 15,
      trackDurationSeconds: 40,
      volume: 0.4,
    });
    const window = ownMusicExportWindow(music.audio, 15);
    assert.ok(window);
    assert.equal(window.startSeconds, 12);
    assert.equal(window.durationSeconds, 15);
    assert.equal(window.volume, 0.4);
    assert.equal(window.loops, false);
    const short = setAudio(none, {
      kind: "ownMusic",
      startSeconds: 0,
      durationSeconds: 4,
      trackDurationSeconds: 4,
      volume: PHOTO_VIDEO_DEFAULT_VOLUME,
    });
    const shortWindow = ownMusicExportWindow(short.audio, 15);
    assert.equal(shortWindow?.durationSeconds, 4);
    assert.equal(ownMusicIsSilentAt(short.audio, 4.01), true);
    assert.equal(ownMusicIsSilentAt(short.audio, 1), false);
  });

  it("R. watermark lockup is required by the render path", () => {
    const render = readFileSync(join(process.cwd(), "src/lib/photo-video/render-frame.ts"), "utf8");
    assert.match(render, /HomeCheff Studio/);
    assert.match(render, /drawWatermark/);
  });

  it("S–U. 9:16, 1:1, 16:9 export sizes", () => {
    for (const ratio of ["9:16", "1:1", "16:9"] as const) {
      const settings = photoVideoExportSettings({
        ratio,
        durationSeconds: 15,
        photoCount: 4,
        context: "homecheff-item",
        isMobile: true,
      });
      if (ratio === "9:16") assert.ok(settings.height > settings.width);
      if (ratio === "16:9") assert.ok(settings.width > settings.height);
      if (ratio === "1:1") assert.equal(settings.width, settings.height);
      assert.equal(settings.width % 2, 0);
      assert.equal(settings.height % 2, 0);
    }
  });

  it("V–X. non-zero, size, and duration guards", () => {
    const empty = new Blob([]);
    assert.equal(validatePhotoVideoExportFile({ file: empty, durationSeconds: 15, context: "homecheff-item" }).ok, false);
    const ftyp = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);
    assert.equal(looksLikeMp4Bytes(ftyp), true);
    assert.equal(looksLikeMp4Bytes(new Uint8Array(8)), false);
    const huge = { size: 51 * 1024 * 1024, type: "video/mp4" } as File;
    assert.equal(validatePhotoVideoExportFile({ file: huge, durationSeconds: 15, context: "homecheff-item" }).ok, false);
    assert.equal(
      validatePhotoVideoExportFile({
        file: { size: 12, type: "video/mp4" } as File,
        durationSeconds: 31,
        context: "homecheff-item",
      }).ok,
      false
    );
    assert.equal(isSafeExportFilename(PHOTO_VIDEO_EXPORT_FILENAME), true);
    assert.equal(isSafeExportFilename("secret-title.mp4"), false);
  });

  it("Y–AB. attach/replace transaction and cancel/fail keep the old video", () => {
    const existing = { url: "https://cdn.example/old.mp4", duration: 12 };
    const generated = { url: "https://cdn.example/new.mp4", duration: 15 };
    assert.deepEqual(
      nextListingVideoAfterExport({ existing, cancelled: true, exportOk: false, generated }),
      existing
    );
    assert.deepEqual(
      nextListingVideoAfterExport({ existing, cancelled: false, exportOk: false, generated: null }),
      existing
    );
    assert.deepEqual(
      nextListingVideoAfterExport({ existing: null, cancelled: false, exportOk: true, generated }),
      generated
    );
    assert.deepEqual(
      nextListingVideoAfterExport({ existing, cancelled: false, exportOk: true, generated }),
      generated
    );
  });

  it("AC. Studio direct export preflight uses studio context", () => {
    const c = composition(2, 15, "studio");
    assert.equal(canAttemptPhotoVideoExport(c, "studio"), true);
    assert.equal(validatePhotoVideoExportComposition(c, "studio").ok, true);
  });

  it("AD. local export stays FREE_LOCAL and muxer is documented", () => {
    assert.equal(photoVideoActionClass("local_export"), PHOTO_VIDEO_CAPABILITY.FREE_LOCAL);
    assert.equal(PHOTO_VIDEO_MUXER_PACKAGE, "mediabunny");
    assert.equal(PHOTO_VIDEO_MUXER_LICENSE, "MPL-2.0");
    const sources = [
      readFileSync(join(process.cwd(), "src/lib/photo-video/export-local.ts"), "utf8"),
      readFileSync(join(process.cwd(), "src/lib/photo-video/export-attach-client.ts"), "utf8"),
    ].join("\n").toLowerCase();
    for (const token of ["vidu", "elevenlabs", "estimatecredits", "chargecredits"]) {
      assert.equal(sources.includes(token), false, token);
    }
  });

  it("AE. failed export does not clear draft persistence", () => {
    const composer = readFileSync(join(process.cwd(), "src/components/photo-video/photo-video-composer.tsx"), "utf8");
    assert.match(composer, /persistDraft\(\)\.catch/);
    const runLocal = composer.slice(composer.indexOf("const runLocalExport"), composer.indexOf("const onFinishItem"));
    assert.doesNotMatch(runLocal, /clearPhotoVideoDraft/);
  });

  it("AF. duplicate export click is blocked", () => {
    assert.equal(exportBusyGuard(true), "busy");
    assert.equal(exportBusyGuard(false), "ok");
  });

  it("prefers 720-class output on mobile and long clips", () => {
    assert.equal(photoVideoExportMaxEdge({ durationSeconds: 15, photoCount: 4, isMobile: true }), 720);
    assert.equal(photoVideoExportMaxEdge({ durationSeconds: 45, photoCount: 4, isMobile: false }), 720);
  });

  it("signs export-attach HTTPS URLs only", () => {
    assert.equal(isAllowedExportVideoUrl("https://abc.blob.vercel-storage.com/homecheff-video.mp4"), true);
    assert.equal(isAllowedExportVideoUrl("https://evil.example/x.mp4"), false);
    const payload = createExportAttachPayload({
      centralUserId: "user-1",
      videoUrl: "https://abc.blob.vercel-storage.com/homecheff-video.mp4",
      durationSeconds: 15,
      nowSec: 1_000_000,
    });
    assert.ok(payload);
    const token = signExportAttachPayload(payload!, "secret");
    assert.deepEqual(verifyExportAttachToken(token, ["secret"], 1_000_000), payload);
    assert.equal(verifyExportAttachToken(token, ["other"], 1_000_000), null);
    assert.equal(parseExportAttachPayload({ ...payload, videoUrl: "https://evil.example/x.mp4" }), null);
  });
});
