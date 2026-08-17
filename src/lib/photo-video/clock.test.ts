import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addPhotos, createLocalPhoto, createPhotoVideoComposition } from "@/lib/photo-video/composition";
import { activePhotoIdAt, seekTimeForPhoto, wrapCompositionTime } from "@/lib/photo-video/clock";

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

describe("PX.4A.2 composition clock", () => {
  it("wraps time on one loop so photos, text, and music share a clock", () => {
    assert.equal(wrapCompositionTime(19.6, 19.6), 0);
    assert.equal(wrapCompositionTime(-1, 10), 9);
    assert.equal(wrapCompositionTime(3, 10), 3);
  });

  it("resolves the active photo and a seek time for that photo", () => {
    const c = addPhotos(createPhotoVideoComposition(), photos(3));
    assert.equal(activePhotoIdAt(c, 0), "p0");
    assert.equal(seekTimeForPhoto(c, "p1") > 0, true);
    assert.equal(activePhotoIdAt(c, seekTimeForPhoto(c, "p2")), "p2");
  });
});
