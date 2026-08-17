import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPhotos,
  canAddPhoto,
  compositionDuration,
  createListingPhoto,
  createLocalPhoto,
  createPhotoVideoComposition,
  excludePhoto,
  includePhoto,
  isCompositionPreviewReady,
  movePhoto,
  removePhoto,
  reorderPhotos,
  setExtraText,
  setPace,
  setRatio,
  setStyle,
  setTitle,
} from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_MAX_PHOTOS } from "@/lib/photo-video/constants";

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
    assert.equal(c.audio.kind, "none");
    assert.equal(isCompositionPreviewReady(c), false);
  });

  it("2 photos become preview-ready", () => {
    const c = addPhotos(createPhotoVideoComposition(), nPhotos(2));
    assert.equal(isCompositionPreviewReady(c), true);
    assert.equal(compositionDuration(c).totalSeconds, 3.6);
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

  it("Kort Normaal Rustig and styles stay under 30s at 12 photos", () => {
    for (const pace of ["kort", "normaal", "rustig"] as const) {
      for (const style of ["auto", "smooth", "calm", "energetic"] as const) {
        const c = setStyle(setPace(addPhotos(createPhotoVideoComposition(), nPhotos(12)), pace), style);
        assert.equal(c.photos.length, PHOTO_VIDEO_MAX_PHOTOS);
        assert.equal(compositionDuration(c).exceedsMax, false, `${pace} ${style}`);
      }
    }
  });

  it("stores simple text", () => {
    let c = createPhotoVideoComposition();
    c = setTitle(c, "Tomaat");
    c = setExtraText(c, "Vers van de teler");
    assert.equal(c.title, "Tomaat");
    assert.equal(c.extraText, "Vers van de teler");
  });

  it("keeps an audio none slot for 4A.2", () => {
    const c = createPhotoVideoComposition({
      audio: { kind: "ownMusic", startSeconds: 4, durationSeconds: 12 },
    });
    assert.equal(c.audio.kind, "ownMusic");
    if (c.audio.kind === "ownMusic") {
      assert.equal(c.audio.startSeconds, 4);
      assert.equal(c.audio.durationSeconds, 12);
    }
  });
});
