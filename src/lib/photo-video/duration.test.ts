import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_MAX_PHOTOS,
  PHOTO_VIDEO_MAX_SECONDS,
  PHOTO_VIDEO_MIN_PHOTOS,
  PHOTO_VIDEO_STUDIO_MAX_SECONDS,
  PHOTO_VIDEO_WATERMARK_SRC,
  photoVideoMaxSeconds,
} from "@/lib/photo-video/constants";
import {
  calculatePhotoVideoDuration,
  formatAveragePerPhoto,
  formatPhotoVideoDuration,
  holdSecondsForPace,
  legacyDurationFromPhotoCount,
  resolveAutoDurationSeconds,
  wouldExceedMaxDuration,
} from "@/lib/photo-video/duration";
import { styleRecipe } from "@/lib/photo-video/styles";

describe("PX.4A.4B duration calculator", () => {
  it("fixed 15 sec distributes hold across photo count independently", () => {
    for (const photoCount of [2, 4, 12]) {
      const result = calculatePhotoVideoDuration({
        photoCount,
        durationMode: "fixed",
        durationSeconds: 15,
        holdSeconds: holdSecondsForPace("normaal"),
        overlapSeconds: styleRecipe("auto").overlapSeconds,
        maxSeconds: PHOTO_VIDEO_STUDIO_MAX_SECONDS,
      });
      assert.equal(result.totalSeconds, 15);
      assert.ok(result.holdSeconds > 0);
      assert.ok(result.averageSecondsPerPhoto > 0);
    }
  });

  it("2 photos at 15 sec hold longer than 12 photos at 15 sec", () => {
    const two = calculatePhotoVideoDuration({
      photoCount: 2,
      durationMode: "fixed",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: 60,
    });
    const twelve = calculatePhotoVideoDuration({
      photoCount: 12,
      durationMode: "fixed",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: 60,
    });
    assert.ok(two.holdSeconds > twelve.holdSeconds);
    assert.equal(two.totalSeconds, 15);
    assert.equal(twelve.totalSeconds, 15);
  });

  it("auto mode resolves legacy pace×photo recommendation once", () => {
    const legacy = legacyDurationFromPhotoCount({
      photoCount: 12,
      holdSeconds: 2,
      overlapSeconds: 0.4,
    });
    assert.equal(legacy, 19.6);
    const result = calculatePhotoVideoDuration({
      photoCount: 12,
      durationMode: "auto",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: PHOTO_VIDEO_MAX_SECONDS,
    });
    assert.equal(result.durationSeconds, 19.6);
    assert.equal(result.totalSeconds, 19.6);
  });

  it("respects HomeCheff 30s max and Studio 60s max", () => {
    assert.equal(photoVideoMaxSeconds("homecheff-item"), PHOTO_VIDEO_MAX_SECONDS);
    assert.equal(photoVideoMaxSeconds("studio"), PHOTO_VIDEO_STUDIO_MAX_SECONDS);
    const over = calculatePhotoVideoDuration({
      photoCount: 4,
      durationMode: "fixed",
      durationSeconds: 60,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: PHOTO_VIDEO_MAX_SECONDS,
    });
    assert.equal(over.durationSeconds, 30);
    assert.equal(over.totalSeconds, 30);
  });

  it("uses overlap subtraction, not addition", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 12,
      durationMode: "auto",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: PHOTO_VIDEO_MAX_SECONDS,
    });
    assert.equal(result.totalSeconds, 12 * 2 - 11 * 0.4);
  });

  it("Kort / Normaal / Rustig map to hold values", () => {
    assert.equal(holdSecondsForPace("kort"), 1.5);
    assert.equal(holdSecondsForPace("normaal"), 2);
    assert.equal(holdSecondsForPace("rustig"), 2.5);
  });

  it("formats duration and average per photo in Dutch", () => {
    assert.equal(formatPhotoVideoDuration(15, "nl"), "15 sec");
    assert.equal(formatAveragePerPhoto(3.75, "nl"), "ongeveer 3,8 sec per foto");
  });

  it("resolveAutoDurationSeconds clamps to max", () => {
    const resolved = resolveAutoDurationSeconds({
      photoCount: 20,
      pace: "rustig",
      overlapSeconds: 0,
      maxSeconds: 30,
    });
    assert.equal(resolved, 30);
    assert.equal(
      wouldExceedMaxDuration({
        photoCount: 20,
        durationMode: "auto",
        durationSeconds: 15,
        holdSeconds: 2.5,
        overlapSeconds: 0,
        maxSeconds: 30,
      }),
      false
    );
  });

  it("keeps photo product bounds", () => {
    assert.equal(PHOTO_VIDEO_MIN_PHOTOS, 2);
    assert.equal(PHOTO_VIDEO_MAX_PHOTOS, 12);
  });

  it("watermark uses the production globe asset", () => {
    assert.equal(PHOTO_VIDEO_WATERMARK_SRC, "/homecheff-globe-man.png");
  });

  it("photo-only mixed fields stay inert", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 4,
      durationMode: "fixed",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: 60,
    });
    assert.equal(result.videoSeconds, 0);
    assert.equal(result.imageCount, 4);
    assert.equal(result.videoOverBudget, false);
    assert.equal(result.totalSeconds, 15);
  });

  it("video clips consume real time and photos share the remainder", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 4,
      imageCount: 2,
      videoSeconds: 9,
      durationMode: "fixed",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: 60,
    });
    assert.equal(result.totalSeconds, 15);
    assert.equal(result.videoSeconds, 9);
    assert.equal(result.videoOverBudget, false);
    assert.ok(result.holdSeconds > 0);
    const overlap = result.overlapSeconds;
    const reconstructed = 9 + 2 * result.holdSeconds - 3 * overlap;
    assert.ok(Math.abs(reconstructed - 15) < 1e-6);
  });

  it("does not speed up video when fragments exceed the selected duration", () => {
    const result = calculatePhotoVideoDuration({
      photoCount: 3,
      imageCount: 1,
      videoSeconds: 18,
      durationMode: "fixed",
      durationSeconds: 15,
      holdSeconds: 2,
      overlapSeconds: 0.4,
      maxSeconds: 60,
    });
    assert.equal(result.videoOverBudget, true);
    assert.ok(result.totalSeconds > 15);
    assert.equal(result.videoSeconds, 18);
  });
});
