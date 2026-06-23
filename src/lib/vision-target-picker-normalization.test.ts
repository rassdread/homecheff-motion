import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferVisionTargetCategory,
  normalizeVisionTargetKey,
  normalizeVisionTargetLabel,
} from "@/lib/vision-target-normalization";

describe("vision target normalization (Sprint K1.2)", () => {
  it("normalizes sleeve and chest keys to Dutch labels", () => {
    assert.equal(normalizeVisionTargetKey("Left Sleeve"), "left_sleeve");
    assert.equal(normalizeVisionTargetLabel("left_sleeve"), "Mouw links");
    assert.equal(normalizeVisionTargetLabel("leftSleeve"), "Mouw links");
    assert.equal(normalizeVisionTargetLabel("sleeve_left"), "Mouw links");
    assert.equal(normalizeVisionTargetLabel("right_sleeve"), "Mouw rechts");
    assert.equal(normalizeVisionTargetLabel("chest"), "Borst");
    assert.equal(normalizeVisionTargetLabel("chest_left"), "Borst links");
    assert.equal(normalizeVisionTargetLabel("front_panel"), "Voorzijde");
  });

  it("infers categories for clothing packaging and vehicles", () => {
    assert.equal(inferVisionTargetCategory("Mouw links"), "clothing");
    assert.equal(inferVisionTargetCategory("Label", "packaging"), "packaging");
    assert.equal(inferVisionTargetCategory("Portier links"), "vehicle");
    assert.equal(inferVisionTargetCategory("Billboard oppervlak"), "signage");
    assert.equal(inferVisionTargetCategory("Scherm"), "screen");
    assert.equal(inferVisionTargetCategory("Borstembleem"), "mascot");
  });
});
