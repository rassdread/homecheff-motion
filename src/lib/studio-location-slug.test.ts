import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSlugCandidate, slugifyLocationName } from "@/lib/studio-location-slug";

describe("studio location slug", () => {
  it("slugifies location names", () => {
    assert.equal(slugifyLocationName("Community Garden"), "community-garden");
    assert.equal(slugifyLocationName("Rotterdam City Center"), "rotterdam-city-center");
  });

  it("appends collision suffixes", () => {
    assert.equal(nextSlugCandidate("garden", 1), "garden-2");
  });
});
