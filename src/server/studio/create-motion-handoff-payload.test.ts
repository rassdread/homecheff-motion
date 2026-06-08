import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import { SCENE_SEMANTIC_RECIPE_VERSION } from "@/types/studio-scene-semantic-recipe";

describe("motion handoff payload shape", () => {
  it("uses version 26 with semantic recipe handoff fields", () => {
    assert.equal(MOTION_HANDOFF_PAYLOAD_VERSION, 26);
    assert.equal(SCENE_SEMANTIC_RECIPE_VERSION, 1);
  });
});
