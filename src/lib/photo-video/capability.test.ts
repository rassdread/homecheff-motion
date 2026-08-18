import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_CAPABILITY,
  photoVideoActionClass,
} from "@/lib/photo-video/capability";

describe("PX.4A.2 free/credit boundary", () => {
  it("classifies local compositor work as FREE_LOCAL", () => {
    for (const action of [
      "photo_composition",
      "transitions",
      "deterministic_motion",
      "text_overlays",
      "own_music",
      "no_music",
      "preview",
      "watermark",
      "local_export",
    ] as const) {
      assert.equal(photoVideoActionClass(action), PHOTO_VIDEO_CAPABILITY.FREE_LOCAL);
    }
  });

  it("keeps provider work off the free path", () => {
    assert.equal(photoVideoActionClass("ai_music"), PHOTO_VIDEO_CAPABILITY.PROVIDER_CREDIT);
    assert.equal(photoVideoActionClass("generative_video"), PHOTO_VIDEO_CAPABILITY.PROVIDER_CREDIT);
    assert.equal(photoVideoActionClass("paid_provider"), PHOTO_VIDEO_CAPABILITY.PROVIDER_CREDIT);
  });
});
