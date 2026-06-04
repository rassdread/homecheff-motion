import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudioWorldProfileCreateInput } from "@/lib/studio-world-profile-validation";

describe("studio-world-profile-validation", () => {
  it("requires name", () => {
    const result = validateStudioWorldProfileCreateInput({ name: "" });
    assert.equal(result.ok, false);
  });

  it("accepts world with continuity strength", () => {
    const result = validateStudioWorldProfileCreateInput({
      name: "HomeCheff Universe",
      visualStyle: "Warm brand",
      continuityStrength: "strict",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.continuityStrength, "strict");
    }
  });
});
