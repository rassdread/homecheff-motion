import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";

describe("scene intelligence", () => {
  it("detects mascot trio from keywords", () => {
    const scene = analyzeSceneIntelligence({
      animationStyleId: "cartoon_animation",
      userIntent: "HomeCheff chef garden and design mascots together",
      imageCount: 3,
    });
    assert.equal(scene.focusHint, "mascot_trio");
    assert.ok(scene.detectedRoles.some((r) => r.roleId === "CHEF_HOST"));
    assert.ok(scene.detectedRoles.some((r) => r.roleId === "GARDEN_GUIDE"));
  });

  it("resolves emotional preset for product showcase", () => {
    const scene = analyzeSceneIntelligence({
      animationStyleId: "product_showcase",
      imageCount: 2,
    });
    assert.equal(scene.resolvedEmotionalPreset, "confident_presenter");
  });
});
