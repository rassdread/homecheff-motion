import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioMotionSyncPreview } from "@/lib/build-studio-motion-sync-preview";

function handoffScene(overrides: Record<string, unknown> = {}) {
  return {
    sceneId: "sc-1",
    order: 0,
    title: "Kitchen",
    description: "Chef cooks",
    action: "cooking",
    emotion: "proud",
    durationSeconds: 5,
    selectedSceneImageId: "img-1",
    selectedSceneImageUrl: "https://example.com/a.jpg",
    selectedSceneImagePromptVersion: 1,
    selectedSceneImageGenerationVersion: 1,
    ...overrides,
  };
}

describe("buildStudioMotionSyncPreview", () => {
  it("detects image change between stored and latest handoff", () => {
    const stored = {
      version: 9,
      scenes: [handoffScene({ selectedSceneImageId: "img-old", selectedSceneImageUrl: "https://x/old.jpg" })],
    };
    const latest = {
      version: 9,
      storyboardId: "sb-1",
      scenes: [handoffScene({ selectedSceneImageId: "img-new", selectedSceneImageUrl: "https://x/new.jpg" })],
    };
    const preview = buildStudioMotionSyncPreview({
      projectId: "p1",
      storyboardId: "sb-1",
      storyboardTitle: "Board",
      storedHandoff: stored,
      latestHandoff: latest as never,
      images: [
        {
          id: "motion-img-1",
          order: 0,
          previewUrl: "https://x/old.jpg",
          studioSceneId: "sc-1",
          studioSceneImageId: "img-old",
        },
      ],
      instantSceneTexts: [{ template: "scene", title: "Kitchen", subtitle: "Chef cooks" }],
      instantTransitionSeconds: 5,
    });
    assert.equal(preview.scenes[0]!.imageChanged, true);
    assert.equal(preview.suggestedDefaults.syncImages, true);
  });

  it("detects title change", () => {
    const scene = handoffScene();
    const stored = { version: 9, scenes: [scene] };
    const latest = {
      version: 9,
      storyboardId: "sb-1",
      scenes: [handoffScene({ title: "Updated kitchen" })],
    };
    const preview = buildStudioMotionSyncPreview({
      projectId: "p1",
      storyboardId: "sb-1",
      storyboardTitle: "Board",
      storedHandoff: stored,
      latestHandoff: latest as never,
      images: [{ id: "i1", order: 0, previewUrl: "https://x/a.jpg", studioSceneId: null, studioSceneImageId: null }],
      instantSceneTexts: [{ template: "scene", title: "Kitchen" }],
      instantTransitionSeconds: 5,
    });
    assert.equal(preview.scenes[0]!.titleChanged, true);
    assert.equal(preview.suggestedDefaults.syncTexts, true);
  });

  it("flags scene count mismatch warnings", () => {
    const preview = buildStudioMotionSyncPreview({
      projectId: "p1",
      storyboardId: "sb-1",
      storyboardTitle: "Board",
      storedHandoff: { version: 9, scenes: [handoffScene(), handoffScene({ sceneId: "sc-2", order: 1 })] },
      latestHandoff: {
        version: 9,
        storyboardId: "sb-1",
        scenes: [handoffScene()],
      } as never,
      images: [
        { id: "i1", order: 0, previewUrl: "https://a", studioSceneId: null, studioSceneImageId: null },
        { id: "i2", order: 1, previewUrl: "https://b", studioSceneId: null, studioSceneImageId: null },
      ],
      instantSceneTexts: [],
      instantTransitionSeconds: 5,
    });
    assert.equal(preview.requiresRemoveConfirmation, true);
    assert.ok(preview.warnings.length > 0);
  });
});
