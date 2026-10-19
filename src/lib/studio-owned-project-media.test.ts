import assert from "node:assert/strict";
import test from "node:test";
import {
  choosePlayableVideoUrl,
  mapOwnedProjectMediaToLibraryAssets,
} from "@/lib/studio-owned-project-media";

const owner = "founder-account";

test("keeps original project names and does not invent a missing title", () => {
  const assets = mapOwnedProjectMediaToLibraryAssets({
    ownerId: owner,
    untitledLabel: "Naamloze video",
    sceneImages: [
      {
        id: "scene-1",
        imageUrl: "https://cdn.example/scene.png",
        thumbnailUrl: "",
        createdAt: "2026-05-01T00:00:00.000Z",
        projectId: "story-1",
        projectTitle: "Lokale designer campagne",
        sceneTitle: "Opening",
      },
    ],
    animationImages: [],
    videos: [
      {
        projectId: "video-1",
        projectTitle: null,
        createdAt: "2026-05-02T00:00:00.000Z",
        videoUrl: "https://cdn.example/final.mp4",
        posterUrl: "https://cdn.example/poster.png",
      },
    ],
  });

  assert.equal(assets[0]?.name, "Lokale designer campagne — Opening");
  assert.equal(assets[0]?.description, "Lokale designer campagne");
  assert.equal(assets[0]?.projectHref, "/studio/storyboards/story-1");
  assert.equal(assets[1]?.name, "Naamloze video");
  assert.equal(assets[1]?.sourceRef.entityType, "animation_video");
  assert.equal(assets[1]?.projectHref, "/videos/video-1");
  assert.equal(assets[1]?.downloadUrl, "https://cdn.example/final.mp4");
});

test("does not duplicate a scene image that is also stored on the animation", () => {
  const input = {
    ownerId: owner,
    untitledLabel: "Naamloze video",
    sceneImages: [
      {
        id: "scene-1",
        imageUrl: "https://cdn.example/same.png",
        thumbnailUrl: "",
        createdAt: "2026-05-01T00:00:00.000Z",
        projectId: "story-1",
        projectTitle: "Reclame",
        sceneTitle: "",
      },
    ],
    animationImages: [
      {
        id: "still-1",
        previewUrl: "https://cdn.example/same.png",
        fileName: "frame.png",
        createdAt: "2026-05-01T00:00:00.000Z",
        projectId: "video-1",
        projectTitle: "Reclame",
        studioSceneImageId: "scene-1",
      },
      {
        id: "still-2",
        previewUrl: "https://cdn.example/other.png",
        fileName: "frame-2.png",
        createdAt: "2026-05-01T00:00:00.000Z",
        projectId: "video-1",
        projectTitle: "Reclame",
        studioSceneImageId: null,
      },
    ],
    videos: [],
  };

  const first = mapOwnedProjectMediaToLibraryAssets(input);
  const second = mapOwnedProjectMediaToLibraryAssets(input);
  assert.deepEqual(first.map((asset) => asset.id), ["scene-image:scene-1", "animation-image:still-2"]);
  assert.deepEqual(second.map((asset) => asset.id), first.map((asset) => asset.id));
  assert.equal(first.every((asset) => asset.owner === owner), true);
});

test("drops assets when the owner is missing and prefers an export over a render", () => {
  assert.deepEqual(
    mapOwnedProjectMediaToLibraryAssets({
      ownerId: " ",
      untitledLabel: "Naamloze video",
      sceneImages: [],
      animationImages: [],
      videos: [],
    }),
    []
  );
  assert.equal(
    choosePlayableVideoUrl({
      exportUrls: ["", "https://cdn.example/export.mp4"],
      renderUrls: ["https://cdn.example/render.mp4"],
      previousUrl: "https://cdn.example/previous.mp4",
    }),
    "https://cdn.example/export.mp4"
  );
  assert.equal(
    choosePlayableVideoUrl({
      exportUrls: [""],
      renderUrls: ["https://cdn.example/render.mp4"],
    }),
    "https://cdn.example/render.mp4"
  );
});
