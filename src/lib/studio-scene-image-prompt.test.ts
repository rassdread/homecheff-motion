import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenePrompt } from "@/lib/studio-prompt-builder";
import {
  buildSceneImageGenerationPrompt,
  buildSceneImageReferenceAssets,
} from "@/lib/studio-scene-image-prompt";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

const scene: SceneSnapshot = {
  sceneId: "s1",
  order: 0,
  title: "Chef presents",
  description: "Launch moment",
  location: {
    id: "loc-1",
    name: "Community Garden",
    category: "garden",
    description: "Vegetables and herbs",
    referenceImageUrl: "https://blob.example/garden.jpg",
  },
  characters: [
    {
      id: "c1",
      name: "Chef",
      role: "mascot",
      description: "HomeCheff mascot",
      personality: "Friendly, energetic",
      referenceImageUrl: "https://blob.example/chef.jpg",
    },
  ],
  props: [
    {
      id: "p1",
      name: "HomeCheff Mug",
      category: "brand_asset",
      description: "Branded mug with globe logo",
      referenceImageUrl: "https://blob.example/mug.jpg",
    },
  ],
  action: "presenting",
  emotion: "excited",
  camera: "medium_shot",
  transitionToNext: "",
  durationSeconds: 8,
};

describe("studio scene image prompt", () => {
  it("includes reference consistency lines", () => {
    const promptOutput = buildScenePrompt(scene, "commercial");
    const text = buildSceneImageGenerationPrompt(scene, promptOutput);
    assert.match(text, /facial consistency/i);
    assert.match(text, /Community Garden/i);
    assert.match(text, /HomeCheff Mug/i);
  });

  it("buildSceneImageReferenceAssets lists reference urls", () => {
    const assets = buildSceneImageReferenceAssets(scene);
    assert.equal(assets.characters[0]?.referenceImageUrl, "https://blob.example/chef.jpg");
    assert.equal(assets.location?.referenceImageUrl, "https://blob.example/garden.jpg");
    assert.equal(assets.props[0]?.referenceImageUrl, "https://blob.example/mug.jpg");
  });
});
