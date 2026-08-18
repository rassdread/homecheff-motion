import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPhotos,
  addTextForPhoto,
  canAddPhoto,
  compositionDuration,
  createListingPhoto,
  createLocalPhoto,
  createPhotoVideoComposition,
  excludePhoto,
  includePhoto,
  isCompositionPreviewReady,
  movePhoto,
  moveTextOverlay,
  overlaysForPhoto,
  removePhoto,
  removeTextOverlay,
  reorderPhotos,
  setAudio,
  setOverlayAlign,
  setOverlayBackground,
  setOverlayColor,
  setOverlayFont,
  setOverlaySize,
  setPhotoMotionKind,
  setDurationMode,
  setDurationSeconds,
  setMovementMode,
  setPace,
  setRatio,
  setStyle,
  updateTextOverlay,
} from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_MAX_PHOTOS } from "@/lib/photo-video/constants";
import { PHOTO_VIDEO_DEFAULT_VOLUME } from "@/lib/photo-video/audio";
import { PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO } from "@/lib/photo-video/text-overlay";

function nPhotos(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createLocalPhoto({
      id: `p${i}`,
      previewUrl: `blob:test/${i}`,
      naturalWidth: 800,
      naturalHeight: 1200,
    })
  );
}

describe("PX.4A.1 composition model", () => {
  it("starts empty and not preview-ready", () => {
    const c = createPhotoVideoComposition();
    assert.equal(c.photos.length, 0);
    assert.equal(c.pace, "normaal");
    assert.equal(c.style, "auto");
    assert.equal(c.ratio, "9:16");
    assert.equal(c.durationMode, "fixed");
    assert.equal(c.durationSeconds, 15);
    assert.equal(c.movementMode, "auto");
    assert.equal(c.audio.kind, "none");
    assert.deepEqual(c.overlays, []);
    assert.equal(isCompositionPreviewReady(c), false);
  });

  it("2 photos become preview-ready at the selected duration", () => {
    const c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    assert.equal(isCompositionPreviewReady(c), true);
    assert.equal(compositionDuration(c).totalSeconds, 15);
  });

  it("caps at 12 photos", () => {
    const c = addPhotos(createPhotoVideoComposition(), nPhotos(12));
    assert.equal(c.photos.length, 12);
    assert.equal(canAddPhoto(c, 1), false);
    const extra = addPhotos(c, nPhotos(1).map((p) => ({ ...p, id: "overflow" })));
    assert.equal(extra.photos.length, 12);
  });

  it("reorders and moves with non-drag deltas", () => {
    const c = addPhotos(createPhotoVideoComposition(), nPhotos(3));
    const reordered = reorderPhotos(c, 0, 2);
    assert.deepEqual(reordered.photos.map((p) => p.id), ["p1", "p2", "p0"]);
    const moved = movePhoto(c, "p0", 1);
    assert.equal(moved.photos[1]?.id, "p0");
  });

  it("can remove down to zero with incomplete preview UX", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    c = removePhoto(c, "p0");
    assert.equal(c.photos.length, 1);
    assert.equal(isCompositionPreviewReady(c), false);
    c = removePhoto(c, "p1");
    assert.equal(c.photos.length, 0);
  });

  it("exclude/include listing photos without dropping the slot when include is safe", () => {
    const listing = createListingPhoto({
      id: "l1",
      listingUrl: "https://example.com/a.jpg",
      naturalWidth: 100,
      naturalHeight: 100,
    });
    const local = nPhotos(2);
    let c = addPhotos(createPhotoVideoComposition(), [listing, ...local]);
    assert.equal(c.photos[0]?.source, "HOME_CHEFF_LISTING");
    c = excludePhoto(c, "l1");
    assert.equal(c.photos[0]?.included, false);
    assert.equal(c.photos[0]?.listingUrl, "https://example.com/a.jpg");
    c = includePhoto(c, "l1");
    assert.equal(c.photos[0]?.included, true);
  });

  it("supports 9:16, 1:1, 16:9", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    c = setRatio(c, "1:1");
    assert.equal(c.ratio, "1:1");
    c = setRatio(c, "16:9");
    assert.equal(c.ratio, "16:9");
    c = setRatio(c, "9:16");
    assert.equal(c.ratio, "9:16");
  });

  it("Kort Normaal Rustig and styles stay under 30s at 12 photos with fixed duration", () => {
    for (const pace of ["kort", "normaal", "rustig"] as const) {
      for (const style of ["auto", "smooth", "calm", "energetic"] as const) {
        const c = setStyle(setPace(addPhotos(createPhotoVideoComposition(), nPhotos(12)), pace), style);
        assert.equal(c.photos.length, PHOTO_VIDEO_MAX_PHOTOS);
        assert.equal(compositionDuration(c).exceedsMax, false, `${pace} ${style}`);
        assert.equal(compositionDuration(c).totalSeconds, 15);
      }
    }
  });

  it("auto duration mode follows pace when photo count changes", () => {
    let c = setDurationMode(addPhotos(createPhotoVideoComposition(), nPhotos(12)), "auto");
    assert.equal(compositionDuration(c).totalSeconds, 19.6);
    c = setPace(c, "rustig");
    assert.ok(compositionDuration(c).totalSeconds > 19.6);
  });

  it("stores multiple per-photo text overlays with style and delete", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(3));
    c = addTextForPhoto(c, { id: "t0", photoId: "p0", text: "Vers gemaakt" });
    c = addTextForPhoto(c, { id: "t1", photoId: "p1", text: "Vandaag verkrijgbaar" });
    c = addTextForPhoto(c, { id: "t2", photoId: "p2", text: "Bestel lokaal" });
    assert.equal(c.overlays.length, 3);
    assert.equal(overlaysForPhoto(c, "p0")[0]?.text, "Vers gemaakt");
    assert.equal(overlaysForPhoto(c, "p1")[0]?.photoId, "p1");
    c = updateTextOverlay(c, "t0", { text: "Vers" });
    c = setOverlayFont(c, "t0", "strong");
    c = setOverlayColor(c, "t0", "#006D52");
    c = setOverlaySize(c, "t0", 7);
    c = setOverlayAlign(c, "t0", "left");
    c = setOverlayBackground(c, "t0", "light");
    const edited = c.overlays.find((overlay) => overlay.id === "t0");
    assert.equal(edited?.text, "Vers");
    assert.equal(edited?.font, "strong");
    assert.equal(edited?.color, "#006D52");
    assert.equal(edited?.size, 7);
    assert.equal(edited?.align, "left");
    assert.equal(edited?.background, "light");
    c = removeTextOverlay(c, "t1");
    assert.equal(c.overlays.some((overlay) => overlay.id === "t1"), false);
    assert.equal(c.overlays.length, 2);
  });

  it("keeps normalized positions when the ratio changes and drops overlays with the photo", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    c = addTextForPhoto(c, { id: "t0", photoId: "p0", text: "Hallo" });
    c = moveTextOverlay(c, "t0", 0.4, 0.3);
    const before = c.overlays[0];
    c = setRatio(c, "16:9");
    assert.equal(c.overlays[0]?.x, before?.x);
    assert.equal(c.overlays[0]?.y, before?.y);
    c = removePhoto(c, "p0");
    assert.equal(c.overlays.some((overlay) => overlay.photoId === "p0"), false);
  });

  it("caps overlays per photo", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    for (let i = 0; i < PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO + 2; i += 1) {
      c = addTextForPhoto(c, { id: `t${i}`, photoId: "p0", text: `L${i}` });
    }
    assert.equal(overlaysForPhoto(c, "p0").length, PHOTO_VIDEO_MAX_OVERLAYS_PER_PHOTO);
  });

  it("keeps no-music first-class and clamps own-music to the video window", () => {
    const none = createPhotoVideoComposition();
    assert.equal(none.audio.kind, "none");
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(12));
    const videoSeconds = compositionDuration(c).totalSeconds;
    assert.equal(videoSeconds, 15);
    c = setAudio(c, {
      kind: "ownMusic",
      startSeconds: 40,
      durationSeconds: 1,
      trackDurationSeconds: 30,
      volume: PHOTO_VIDEO_DEFAULT_VOLUME,
    });
    assert.equal(c.audio.kind, "ownMusic");
    if (c.audio.kind === "ownMusic") {
      assert.equal(c.audio.startSeconds, 30 - videoSeconds);
      assert.equal(c.audio.durationSeconds, videoSeconds);
    }
    c = setDurationSeconds(c, 30);
    const longer = compositionDuration(c).totalSeconds;
    assert.equal(longer, 30);
    if (c.audio.kind === "ownMusic") {
      assert.equal(c.audio.durationSeconds, longer);
      assert.equal(c.audio.startSeconds, 30 - longer);
    }
    c = setAudio(c, { kind: "none" });
    assert.equal(c.audio.kind, "none");
  });

  it("stores movement mode and per-photo overrides", () => {
    let c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    c = setMovementMode(c, "none");
    assert.equal(c.movementMode, "none");
    c = setPhotoMotionKind(c, "p0", "zoom-in");
    assert.equal(c.photos[0]?.motionKind, "zoom-in");
  });
});
