import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampVideoState,
  classifyLocalVideoFile,
  defaultVideoTrimEnd,
  formatClock,
  formatClipSeconds,
  includedImageCount,
  includedVideoSeconds,
  isVideoPhoto,
  videoClipDuration,
  videoSourceTime,
} from "@/lib/photo-video/media-clip";

describe("PX.4A.7 media clip helpers", () => {
  it("treats missing mediaKind as an image slot", () => {
    assert.equal(isVideoPhoto({}), false);
    assert.equal(isVideoPhoto({ mediaKind: "image" }), false);
    assert.equal(
      isVideoPhoto({
        mediaKind: "video",
        video: clampVideoState({
          sourceDurationSeconds: 10,
          trimStartSeconds: 2,
          trimEndSeconds: 8,
        }),
      }),
      true
    );
  });

  it("uses trim window as real clip duration, never sped-up source length", () => {
    const photo = {
      included: true,
      mediaKind: "video" as const,
      video: clampVideoState({
        sourceDurationSeconds: 32,
        trimStartSeconds: 8,
        trimEndSeconds: 14,
      }),
    };
    assert.equal(videoClipDuration(photo), 6);
    assert.equal(videoSourceTime(photo, 0), 8);
    assert.ok(Math.abs(videoSourceTime(photo, 0.5) - 11) < 1e-9);
    assert.ok(videoSourceTime(photo, 1) <= 14);
  });

  it("sums included video seconds independently of image slots", () => {
    const photos = [
      { included: true },
      {
        included: true,
        mediaKind: "video" as const,
        video: clampVideoState({ sourceDurationSeconds: 20, trimStartSeconds: 0, trimEndSeconds: 5 }),
      },
      {
        included: true,
        mediaKind: "video" as const,
        video: clampVideoState({ sourceDurationSeconds: 12, trimStartSeconds: 1, trimEndSeconds: 5 }),
      },
      { included: false, mediaKind: "video" as const, video: clampVideoState({ sourceDurationSeconds: 9, trimStartSeconds: 0, trimEndSeconds: 9 }) },
    ];
    assert.equal(includedImageCount(photos), 1);
    assert.equal(includedVideoSeconds(photos), 9);
  });

  it("rejects oversized or unknown video files without claiming HEVC support", () => {
    assert.equal(classifyLocalVideoFile(new File([new Uint8Array(8)], "ok.mp4", { type: "video/mp4" })), "ok");
    assert.equal(
      classifyLocalVideoFile(new File([new Uint8Array(8)], "clip.mov", { type: "video/quicktime" })),
      "ok"
    );
    assert.equal(classifyLocalVideoFile(new File([new Uint8Array(8)], "song.mp3", { type: "audio/mpeg" })), "type");
    const big = new File([new Uint8Array(8)], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 41 * 1024 * 1024 });
    assert.equal(classifyLocalVideoFile(big), "size");
  });

  it("defaults a usable fragment from long sources", () => {
    assert.equal(defaultVideoTrimEnd(32), 6);
    assert.equal(defaultVideoTrimEnd(4), 4);
  });

  it("formats clocks and Dutch clip durations", () => {
    assert.equal(formatClock(32), "00:32");
    assert.equal(formatClock(8.2), "00:08");
    assert.equal(formatClipSeconds(6.2, "nl"), "6,2 sec");
    assert.equal(formatClipSeconds(6.2, "en"), "6.2 sec");
  });
});
