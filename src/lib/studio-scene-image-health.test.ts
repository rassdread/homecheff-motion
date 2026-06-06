import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreSceneImageHealth } from "@/lib/studio-scene-image-health";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

const richScene: SceneSnapshot = {
  sceneId: "s1",
  order: 0,
  title: "Scene",
  description: "Desc",
  location: {
    id: "l1",
    name: "Rotterdam",
    category: "city",
    description: "City",
    referenceImageUrl: "",
  },
  characters: [
    {
      id: "c1",
      name: "Chef",
      role: "mascot",
      description: "",
      personality: "",
      referenceImageUrl: "",
    },
  ],
  props: [],
  action: "walking",
  emotion: "happy",
  camera: "wide_shot",
  transitionToNext: "",
  durationSeconds: 5,
};

describe("studio scene image health", () => {
  it("returns strong when prompt is complete and image succeeded", () => {
    const health = scoreSceneImageHealth({
      scene: richScene,
      styleProfile: "commercial",
      latestImageStatus: "completed",
    });
    assert.equal(health.tier, "strong");
    assert.equal(health.generationSucceeded, true);
  });

  it("returns weak when empty scene and no image", () => {
    const health = scoreSceneImageHealth({
      scene: {
        ...richScene,
        location: null,
        characters: [],
        action: "",
        emotion: "",
        camera: "",
      },
      styleProfile: "commercial",
      latestImageStatus: null,
    });
    assert.equal(health.tier, "weak");
  });
});
