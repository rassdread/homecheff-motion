import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStudioSceneImageHandoff } from "@/lib/studio-scene-image-handoff";

describe("resolveStudioSceneImageHandoff", () => {
  const images = [
    {
      id: "img-old",
      status: "completed",
      imageUrl: "https://example.com/old.jpg",
      thumbnailUrl: "https://example.com/old-thumb.jpg",
      promptVersion: 3,
      generationVersion: 1,
    },
    {
      id: "img-new",
      status: "completed",
      imageUrl: "https://example.com/new.jpg",
      thumbnailUrl: "https://example.com/new-thumb.jpg",
      promptVersion: 3,
      generationVersion: 2,
    },
  ];

  it("uses selected image when set", () => {
    const resolved = resolveStudioSceneImageHandoff({
      storyboardId: "sb-1",
      sceneId: "scene-1",
      selectedSceneImageId: "img-new",
      sceneImages: images,
    });
    assert.equal(resolved.selectedSceneImageUrl, "https://example.com/new.jpg");
    assert.equal(resolved.selectedSceneImageGenerationVersion, 2);
    assert.equal(resolved.reference?.sceneImageId, "img-new");
  });

  it("falls back to latest completed when selection missing", () => {
    const resolved = resolveStudioSceneImageHandoff({
      storyboardId: "sb-1",
      sceneId: "scene-1",
      selectedSceneImageId: "missing",
      sceneImages: images,
    });
    assert.equal(resolved.selectedSceneImageUrl, "https://example.com/old.jpg");
  });

  it("returns empty when no completed images", () => {
    const resolved = resolveStudioSceneImageHandoff({
      storyboardId: "sb-1",
      sceneId: "scene-1",
      selectedSceneImageId: null,
      sceneImages: [{ ...images[0]!, status: "failed", imageUrl: "" }],
    });
    assert.equal(resolved.selectedSceneImageUrl, null);
    assert.equal(resolved.reference, null);
  });
});
