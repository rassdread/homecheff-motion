import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSceneSnapshot, toStoryboardSnapshot } from "@/server/studio/studio-storyboard-service";

describe("studio storyboard snapshots", () => {
  it("maps scene to SceneSnapshot", () => {
    const snap = toSceneSnapshot({
      id: "scene-1",
      order: 0,
      title: "Chef cooking",
      description: "Kitchen promo",
      action: "cooking",
      emotion: "proud",
      camera: "wide_shot",
      transitionToNext: "",
      durationSeconds: 8,
      location: {
        id: "loc-1",
        ownerId: "u1",
        name: "Rotterdam",
        slug: "rotterdam",
        category: "city",
        description: "",
        referenceImageUrl: "https://example.com/r.jpg",
        referenceStorageKey: "k",
        isSystemLocation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      characters: [
        {
          sceneId: "scene-1",
          characterId: "ch-1",
          character: {
            id: "ch-1",
            ownerId: "u1",
            name: "Chef",
            slug: "chef",
            role: "human",
            description: "",
            personality: "",
            referenceImageUrl: "https://example.com/c.jpg",
            referenceStorageKey: "k",
            isMascot: false,
            isSystemCharacter: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      props: [],
    });
    assert.equal(snap.title, "Chef cooking");
    assert.equal(snap.location?.name, "Rotterdam");
    assert.equal(snap.characters[0]?.name, "Chef");
  });

  it("maps storyboard with ordered scenes", () => {
    const snap = toStoryboardSnapshot(
      { id: "sb-1", title: "Promo", description: "Test" },
      []
    );
    assert.equal(snap.scenes.length, 0);
    assert.equal(snap.title, "Promo");
  });
});
