import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSlugCandidate, slugifyCharacterName } from "@/lib/studio-character-slug";

describe("studio character slug", () => {
  it("slugifies names", () => {
    assert.equal(slugifyCharacterName("Chef"), "chef");
    assert.equal(slugifyCharacterName("  Home Cheff Chef  "), "home-cheff-chef");
  });

  it("falls back when name has no alphanumerics", () => {
    assert.equal(slugifyCharacterName("   "), "character");
  });

  it("appends collision suffixes", () => {
    assert.equal(nextSlugCandidate("chef", 0), "chef");
    assert.equal(nextSlugCandidate("chef", 1), "chef-2");
    assert.equal(nextSlugCandidate("chef", 2), "chef-3");
  });
});
