import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateStudioStoryboardCreateInput,
  validateStudioStoryboardUpdateInput,
} from "@/lib/studio-storyboard-validation";

describe("studio storyboard validation", () => {
  it("requires title on create", () => {
    const result = validateStudioStoryboardCreateInput({ title: "" });
    assert.equal(result.ok, false);
  });

  it("accepts valid create", () => {
    const result = validateStudioStoryboardCreateInput({
      title: "HomeCheff Promo",
      description: "Rotterdam + garden scenes.",
    });
    assert.equal(result.ok, true);
  });

  it("rejects empty update", () => {
    assert.equal(validateStudioStoryboardUpdateInput({}).ok, false);
  });
});
