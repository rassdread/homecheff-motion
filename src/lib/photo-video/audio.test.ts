import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_DEFAULT_VOLUME,
  PHOTO_VIDEO_MAX_AUDIO_BYTES,
  audioTrackTimeAt,
  audioWindowFor,
  audioWindowPixels,
  classifyAudioFile,
  classifyDecodedDuration,
  clampOwnMusicToVideo,
  looksLikeAudioFile,
  sampleWaveformPeaks,
  setOwnMusicStart,
  setOwnMusicVolume,
  startSecondsFromClientX,
  type PhotoVideoOwnMusic,
} from "@/lib/photo-video/audio";

function own(partial?: Partial<PhotoVideoOwnMusic>): PhotoVideoOwnMusic {
  return {
    kind: "ownMusic",
    startSeconds: 0,
    durationSeconds: 19.6,
    trackDurationSeconds: 222,
    volume: PHOTO_VIDEO_DEFAULT_VOLUME,
    ...partial,
  };
}

describe("PX.4A.2 own music", () => {
  it("accepts audio MIME and rejects non-audio even with a music extension", () => {
    assert.equal(classifyAudioFile({ type: "audio/mpeg", name: "song.mp3", size: 1200 }), "ok");
    assert.equal(classifyAudioFile({ type: "audio/wav", name: "a.wav", size: 1200 }), "ok");
    assert.equal(looksLikeAudioFile({ type: "", name: "hook.m4a", size: 1200 }), true);
    assert.equal(classifyAudioFile({ type: "image/jpeg", name: "song.mp3", size: 1200 }), "type");
    assert.equal(classifyAudioFile({ type: "text/plain", name: "notes.txt", size: 1200 }), "type");
    assert.equal(classifyAudioFile({ type: "audio/mpeg", name: "song.mp3", size: PHOTO_VIDEO_MAX_AUDIO_BYTES + 1 }), "size");
    assert.equal(classifyAudioFile({ type: "audio/mpeg", name: "song.mp3", size: 0 }), "size");
  });

  it("rejects tiny or huge decoded durations", () => {
    assert.equal(classifyDecodedDuration(0.2), "duration");
    assert.equal(classifyDecodedDuration(12), "ok");
    assert.equal(classifyDecodedDuration(601), "duration");
  });

  it("uses a video-length window from 0, middle, and near the end", () => {
    const start0 = audioWindowFor({ videoDurationSeconds: 19.6, trackDurationSeconds: 222, startSeconds: 0 });
    assert.equal(start0.startSeconds, 0);
    assert.equal(start0.windowSeconds, 19.6);
    const mid = audioWindowFor({ videoDurationSeconds: 19.6, trackDurationSeconds: 222, startSeconds: 80 });
    assert.equal(mid.startSeconds, 80);
    assert.equal(mid.windowSeconds, 19.6);
    const near = audioWindowFor({ videoDurationSeconds: 19.6, trackDurationSeconds: 222, startSeconds: 220 });
    assert.equal(near.startSeconds, 222 - 19.6);
    assert.equal(near.maxStartSeconds, 222 - 19.6);
  });

  it("clamps the previous start when the video duration grows or shrinks", () => {
    const long = clampOwnMusicToVideo(own({ startSeconds: 20, trackDurationSeconds: 30 }), 19.6);
    assert.equal(long.startSeconds, 30 - 19.6);
    assert.equal(long.durationSeconds, 19.6);
    const grown = clampOwnMusicToVideo(long, 24.3);
    assert.equal(grown.durationSeconds, 24.3);
    assert.equal(grown.startSeconds, 30 - 24.3);
  });

  it("does not silently loop a short track: remaining video is silence", () => {
    const short = own({ trackDurationSeconds: 8, startSeconds: 0, durationSeconds: 8 });
    const window = audioWindowFor({ videoDurationSeconds: 19.6, trackDurationSeconds: 8, startSeconds: 4 });
    assert.equal(window.trackShorterThanVideo, true);
    assert.equal(window.startSeconds, 0);
    assert.equal(window.windowSeconds, 8);
    assert.equal(audioTrackTimeAt({ audio: short, compositionTimeSeconds: 0 }), 0);
    assert.equal(audioTrackTimeAt({ audio: short, compositionTimeSeconds: 7.9 }) != null, true);
    assert.equal(audioTrackTimeAt({ audio: short, compositionTimeSeconds: 8 }), null);
    assert.equal(audioTrackTimeAt({ audio: short, compositionTimeSeconds: 19 }), null);
    assert.equal(audioTrackTimeAt({ audio: { kind: "none" }, compositionTimeSeconds: 1 }), null);
  });

  it("clamps volume and maps a dragged window without a start-time field", () => {
    assert.equal(setOwnMusicVolume(own(), 1.4).volume, 1);
    assert.equal(setOwnMusicVolume(own(), -0.2).volume, 0);
    const start = startSecondsFromClientX({
      clientX: 200,
      rectLeft: 0,
      rectWidth: 400,
      trackDurationSeconds: 100,
      grabOffsetSeconds: 0,
      videoDurationSeconds: 20,
    });
    assert.equal(start, 50);
    const pixels = audioWindowPixels({
      trackDurationSeconds: 100,
      startSeconds: 50,
      windowSeconds: 20,
      width: 400,
    });
    assert.equal(pixels.x, 200);
    assert.equal(pixels.width, 80);
  });

  it("builds a lightweight normalized waveform", () => {
    const peaks = sampleWaveformPeaks(new Float32Array([0, 0.2, -1, 0.5, 0, 0.1]), 2);
    assert.equal(peaks.length, 2);
    assert.ok(peaks.every((value) => value >= 0 && value <= 1));
    assert.equal(sampleWaveformPeaks(new Float32Array(), 8).length, 0);
  });

  it("setOwnMusicStart reuses the window law", () => {
    const moved = setOwnMusicStart(own({ trackDurationSeconds: 40 }), 100, 19.6);
    assert.equal(moved.startSeconds, 40 - 19.6);
    assert.equal(moved.durationSeconds, 19.6);
  });
});
