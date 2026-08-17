import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MAX_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_PACE_HOLD_SECONDS,
  PHOTO_VIDEO_WATERMARK_SRC,
} from "@/lib/photo-video/constants";
import {
  calculatePhotoVideoDuration,
  formatPhotoVideoDuration,
  holdSecondsForPace,
  maxPhotosFitting,
  wouldExceedMaxDuration,
} from "@/lib/photo-video/duration";
import { styleRecipe } from "@/lib/photo-video/styles";

describe("PX.4A.1 duration calculator", () => {
  it("uses overlap subtraction, not addition", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 12,
      holdSeconds: 2,
      overlapSeconds: 0.4,
    });
    assert.equal(result.totalSeconds, 12 * 2 - 11 * 0.4);
    assert.equal(result.totalSeconds, 19.6);
    assert.equal(result.exceedsMax, false);
    assert.ok(result.remainingSeconds > 10);
  });

  it("2 photos at default hold/overlap stay well under 30s", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 2,
      holdSeconds: PHOTO_VIDEO_PACE_HOLD_SECONDS.normaal,
      overlapSeconds: styleRecipe("auto").overlapSeconds,
    });
    assert.equal(result.totalSeconds, 2 * 2 - 0.4);
    assert.equal(result.totalSeconds, 3.6);
  });

  it("never reports >30s as valid", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 20,
      holdSeconds: 2.5,
      overlapSeconds: 0,
    });
    assert.equal(result.exceedsMax, true);
    assert.ok(result.totalSeconds > PHOTO_VIDEO_MAX_SECONDS);
  });

  it("Kort / Normaal / Rustig map to hold values", () => {
    assert.equal(holdSecondsForPace("kort"), 1.5);
    assert.equal(holdSecondsForPace("normaal"), 2);
    assert.equal(holdSecondsForPace("rustig"), 2.5);
  });

  it("12 photos at Rustig still fit", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: PHOTO_VIDEO_MAX_PHOTOS,
      holdSeconds: holdSecondsForPace("rustig"),
      overlapSeconds: styleRecipe("calm").overlapSeconds,
    });
    assert.equal(result.exceedsMax, false);
    assert.ok(result.totalSeconds <= PHOTO_VIDEO_MAX_SECONDS);
  });

  it("formats Dutch decimal comma", () => {
    assert.equal(formatPhotoVideoDuration(19.6, "nl"), "19,6 sec");
    assert.equal(formatPhotoVideoDuration(19.6, "en"), "19.6 sec");
  });

  it("maxPhotosFitting respects 30s", () => {
    const n = maxPhotosFitting({ holdSeconds: 2.5, overlapSeconds: 0 });
    assert.ok(n <= PHOTO_VIDEO_MAX_PHOTOS);
    assert.equal(wouldExceedMaxDuration({ photoCount: 13, holdSeconds: 2.5, overlapSeconds: 0 }), true);
  });

  it("keeps photo product bounds", () => {
    assert.equal(PHOTO_VIDEO_MIN_PHOTOS, 2);
    assert.equal(PHOTO_VIDEO_MAX_PHOTOS, 12);
  });

  it("watermark uses the production globe asset", () => {
    assert.equal(PHOTO_VIDEO_WATERMARK_SRC, "/homecheff-globe-man.png");
  });
});
