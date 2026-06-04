import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudioSceneCreateInput } from "@/lib/studio-scene-validation";

describe("studio scene validation", () => {
  it("defaults duration and title", () => {
    const result = validateStudioSceneCreateInput({});
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.durationSeconds, 5);
      assert.equal(result.value.title, "Scene");
    }
  });

  it("rejects invalid duration", () => {
    const result = validateStudioSceneCreateInput({ durationSeconds: 999 });
    assert.equal(result.ok, false);
  });
});
