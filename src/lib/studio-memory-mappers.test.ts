import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSceneMemoryBundle,
  toCharacterMemorySnapshot,
} from "@/lib/studio-memory-mappers";

describe("studio-memory-mappers", () => {
  it("maps character memory snapshot with world", () => {
    const snap = toCharacterMemorySnapshot({
      id: "c1",
      name: "Chef",
      role: "mascot",
      description: "",
      personality: "Friendly",
      referenceImageUrl: "https://example.com/c.png",
      appearanceMemory: "White hat",
      personalityMemory: "",
      continuityNotes: "",
      defaultClothing: "",
      defaultAccessories: "",
      visualKeywords: "clean",
      primaryReferenceImageId: null,
      referenceNotes: "",
      identityStrength: "strong",
      continuityStrength: "strict",
      worldProfileId: "w1",
      worldProfile: {
        id: "w1",
        name: "HomeCheff Universe",
        description: "",
        visualStyle: "Brand",
        tone: "",
        continuityRules: "",
        continuityStrength: "strong",
      },
    });
    assert.equal(snap.worldProfileName, "HomeCheff Universe");
    assert.equal(snap.continuityStrength, "strict");
    assert.equal(snap.primaryReferenceImageId, "c1");
    assert.ok(snap.canonicalIdentity);
    assert.equal(snap.canonicalIdentity?.primaryReference?.imageUrl, "https://example.com/c.png");
  });

  it("aggregates strictest continuity across assets", () => {
    const bundle = buildSceneMemoryBundle({
      characters: [
        {
          id: "c1",
          name: "A",
          role: "human",
          description: "",
          personality: "",
          referenceImageUrl: "",
          appearanceMemory: "",
          personalityMemory: "",
          continuityNotes: "",
          defaultClothing: "",
          defaultAccessories: "",
          visualKeywords: "",
          primaryReferenceImageId: null,
          referenceNotes: "",
          identityStrength: "loose",
          continuityStrength: "loose",
          worldProfileId: null,
          worldProfile: null,
        },
      ],
      location: {
        id: "l1",
        name: "Garden",
        category: "garden",
        description: "",
        referenceImageUrl: "",
        worldMemory: "",
        visualIdentity: "",
        environmentKeywords: "",
        continuityNotes: "",
        continuityStrength: "strict",
        worldProfileId: null,
        worldProfile: null,
      },
      props: [],
    });
    assert.equal(bundle.continuityStrength, "strict");
  });
});
