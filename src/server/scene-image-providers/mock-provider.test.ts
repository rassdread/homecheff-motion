import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSelectedSceneImageProviderId, getSceneImageProvider } from "@/server/scene-image-providers";
import { MockSceneImageProvider } from "@/server/scene-image-providers/mock-provider";

describe("scene image providers", () => {
  it("mock provider returns image buffers", async () => {
    const provider = new MockSceneImageProvider();
    const result = await provider.generate({
      prompt: "A chef in a garden.",
      sceneId: "scene-1",
      imageRecordId: "img-1",
      ownerId: "user-1",
    });
    assert.equal(result.provider, "mock");
    assert.ok(result.imageBuffer.length > 0);
    assert.ok(result.thumbnailBuffer.length > 0);
  });

  it("getSceneImageProvider resolves without throw when mock selected", () => {
    const prev = process.env.STUDIO_SCENE_IMAGE_PROVIDER;
    process.env.STUDIO_SCENE_IMAGE_PROVIDER = "mock";
    assert.equal(getSelectedSceneImageProviderId(), "mock");
    assert.equal(getSceneImageProvider().id, "mock");
    if (prev === undefined) {
      delete process.env.STUDIO_SCENE_IMAGE_PROVIDER;
    } else {
      process.env.STUDIO_SCENE_IMAGE_PROVIDER = prev;
    }
  });
});
