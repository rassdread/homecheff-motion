import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCharacterSnapshot } from "@/server/studio/studio-character-service";

describe("studio character service", () => {
  it("maps row to CharacterSnapshot for Motion handoff", () => {
    const snap = toCharacterSnapshot({
      id: "c1",
      name: "Chef",
      role: "mascot",
      description: "HomeCheff chef mascot.",
      personality: "Friendly",
      referenceImageUrl: "https://example.com/chef.jpg",
    });
    assert.deepEqual(snap, {
      id: "c1",
      name: "Chef",
      role: "mascot",
      description: "HomeCheff chef mascot.",
      personality: "Friendly",
      referenceImageUrl: "https://example.com/chef.jpg",
    });
  });
});
