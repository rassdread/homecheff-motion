import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toLocationSnapshot } from "@/server/studio/studio-location-service";

describe("studio location service", () => {
  it("maps row to LocationSnapshot for Motion handoff", () => {
    const snap = toLocationSnapshot({
      id: "loc-1",
      name: "Community Garden",
      category: "garden",
      description: "Local community growing space.",
      referenceImageUrl: "https://example.com/garden.jpg",
    });
    assert.deepEqual(snap, {
      id: "loc-1",
      name: "Community Garden",
      category: "garden",
      description: "Local community growing space.",
      referenceImageUrl: "https://example.com/garden.jpg",
    });
  });
});
