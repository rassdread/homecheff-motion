import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filmClipMediaKind,
  filmClipVisualState,
  ownedSceneStillUrl,
} from "@/lib/studio-timeline-scene-media";
import { narrationClipCarriesProjectAudio, narrationPlayheadInsideClip } from "@/lib/studio-narration-playback";

describe("film timeline scene media", () => {
  it("keeps a selected scene still ahead of other completed images", () => {
    assert.equal(
      ownedSceneStillUrl({
        selectedImageUrl: "https://blob.vercel-storage.com/selected.png",
        completedImageUrls: [
          "https://blob.vercel-storage.com/newer.png",
          "https://blob.vercel-storage.com/selected.png",
        ],
      }),
      "https://blob.vercel-storage.com/selected.png",
    );
  });

  it("reuses the newest completed scene still when nothing is selected", () => {
    assert.equal(
      ownedSceneStillUrl({
        selectedImageUrl: null,
        completedImageUrls: [
          "https://blob.vercel-storage.com/baker-completed.png",
          "",
          null,
        ],
      }),
      "https://blob.vercel-storage.com/baker-completed.png",
    );
  });

  it("does not invent a video URL for a scene placeholder", () => {
    assert.equal(
      filmClipVisualState({
        playbackUrl: null,
        stillUrl: null,
        sourceKind: "scene",
      }),
      "scene_awaiting_video",
    );
    assert.equal(filmClipMediaKind("scene_awaiting_video"), "reference");
  });

  it("marks a recovered still as an image, not a playable video", () => {
    assert.equal(
      filmClipVisualState({
        playbackUrl: null,
        stillUrl: "https://blob.vercel-storage.com/baker-completed.png",
        sourceKind: "scene",
      }),
      "playable_image",
    );
    assert.equal(filmClipMediaKind("playable_image"), "still");
  });

  it("keeps working library video and narration independent of scene stills", () => {
    assert.equal(
      filmClipVisualState({
        playbackUrl: "https://blob.vercel-storage.com/baker.mp4",
        stillUrl: null,
        sourceKind: "library_asset",
      }),
      "playable_video",
    );
    assert.equal(
      narrationClipCarriesProjectAudio({
        trackType: "NARRATION",
        sourceKind: "narration_script",
        sourceId: "board-1",
        storyboardId: "board-1",
      }),
      true,
    );
    assert.equal(narrationPlayheadInsideClip(4000, 2461, 5200), true);
  });

  it("treats an empty non-scene clip as missing media, not a scene placeholder", () => {
    assert.equal(
      filmClipVisualState({
        playbackUrl: "",
        stillUrl: "",
        sourceKind: "library_asset",
      }),
      "missing_media",
    );
  });
});
