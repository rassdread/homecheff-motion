import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localizeVisionPartLabel, visionPartDisplayLabelKey } from "@/lib/editor-vision-part-display-label";

describe("editor vision part display labels", () => {
  it("maps sunglasses/glasses/eyewear aliases to i18n keys", () => {
    assert.equal(visionPartDisplayLabelKey("Sunglasses"), "editor.visionPart.sunglasses");
    assert.equal(visionPartDisplayLabelKey("Glasses"), "editor.visionPart.glasses");
    assert.equal(visionPartDisplayLabelKey("Eyewear"), "editor.visionPart.glasses");
    assert.equal(visionPartDisplayLabelKey("Sun eyewear"), "editor.visionPart.sunglasses");
    assert.equal(visionPartDisplayLabelKey("Aviator glasses"), "editor.visionPart.sunglasses");
    assert.equal(visionPartDisplayLabelKey("Reading glasses"), "editor.visionPart.glasses");
  });

  it("localizes to Zonnebril in Dutch", () => {
    const t = (key: string) =>
      key === "editor.visionPart.sunglasses" ? "Zonnebril" : key;
    assert.equal(localizeVisionPartLabel("Sunglasses", t), "Zonnebril");
  });
});
