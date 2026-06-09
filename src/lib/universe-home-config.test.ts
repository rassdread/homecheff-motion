import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  UNIVERSE_QUICK_ACTIONS,
  resolveUniverseOrbitPosition,
  resolveUniversePipelineHighlight,
  resolveUniversePipelineSegmentActive,
  resolveUniverseWelcomeName,
} from "@/lib/universe-home-config";

describe("universe home config", () => {
  it("defines five product planets", () => {
    assert.equal(UNIVERSE_PLANETS.length, 5);
    assert.deepEqual(
      UNIVERSE_PLANETS.map((p) => p.id),
      ["editor", "studio", "motion", "publish", "library"]
    );
  });

  it("pipeline highlights upstream path on motion hover", () => {
    const highlighted = resolveUniversePipelineHighlight("motion");
    assert.deepEqual([...highlighted], ["editor", "studio", "motion"]);
  });

  it("pipeline segment active when both endpoints highlighted", () => {
    const highlighted = resolveUniversePipelineHighlight("publish");
    assert.equal(
      resolveUniversePipelineSegmentActive("editor", "studio", highlighted),
      true
    );
    assert.equal(
      resolveUniversePipelineSegmentActive("motion", "publish", highlighted),
      true
    );
  });

  it("library hover does not light pipeline segments", () => {
    const highlighted = resolveUniversePipelineHighlight("library");
    assert.equal(highlighted.has("library"), true);
    assert.equal(
      resolveUniversePipelineSegmentActive("editor", "studio", highlighted),
      false
    );
  });

  it("orbit positions stay within canvas bounds", () => {
    for (const planet of UNIVERSE_PLANETS) {
      const pos = resolveUniverseOrbitPosition(planet.orbitAngle, 22);
      assert.ok(pos.x >= 20 && pos.x <= 80);
      assert.ok(pos.y >= 20 && pos.y <= 80);
    }
  });

  it("extracts welcome name from email", () => {
    assert.equal(resolveUniverseWelcomeName("sergio@homecheff.eu"), "Sergio");
    assert.equal(resolveUniverseWelcomeName(undefined), null);
  });

  it("quick actions cover primary workflows", () => {
    assert.equal(UNIVERSE_QUICK_ACTIONS.length, 5);
    assert.ok(UNIVERSE_QUICK_ACTIONS.some((a) => a.href === "/editor"));
  });

  it("pipeline order matches creative flow", () => {
    assert.deepEqual(UNIVERSE_PIPELINE, ["editor", "studio", "motion", "publish"]);
  });
});
