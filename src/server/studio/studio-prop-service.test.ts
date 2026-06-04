import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPropSnapshot } from "@/server/studio/studio-prop-service";

describe("studio prop service", () => {
  it("maps row to PropSnapshot", () => {
    const snap = toPropSnapshot({
      id: "p1",
      name: "HomeCheff Mug",
      category: "brand_asset",
      description: "Official mug.",
      referenceImageUrl: "https://example.com/mug.jpg",
    });
    assert.equal(snap.name, "HomeCheff Mug");
    assert.equal(snap.category, "brand_asset");
  });
});
