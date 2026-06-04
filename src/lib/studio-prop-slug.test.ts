import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextSlugCandidate, slugifyPropName } from "@/lib/studio-prop-slug";

describe("studio prop slug", () => {
  it("slugifies prop names", () => {
    assert.equal(slugifyPropName("HomeCheff Mug"), "homecheff-mug");
  });

  it("appends collision suffixes", () => {
    assert.equal(nextSlugCandidate("mug", 1), "mug-2");
  });
});
