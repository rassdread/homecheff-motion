import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UNIVERSE_ORBIT_RADIUS_PERCENT,
  UNIVERSE_PIPELINE,
  UNIVERSE_PLANETS,
  UNIVERSE_QUICK_ACTIONS,
  UNIVERSE_WELCOME_KEYS,
  resolveUniverseOrbitPosition,
  resolveUniversePipelineHighlight,
  resolveUniversePipelineSegmentActive,
  resolveUniverseWelcomeMessages,
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
      const pos = resolveUniverseOrbitPosition(planet.orbitAngle, UNIVERSE_ORBIT_RADIUS_PERCENT);
      assert.ok(pos.x >= 18 && pos.x <= 82);
      assert.ok(pos.y >= 18 && pos.y <= 82);
    }
  });

  it("welcome messages include personalized line when email present", () => {
    const msgs = resolveUniverseWelcomeMessages("sergio@homecheff.eu");
    assert.equal(msgs[0], "universe.welcome.back");
    assert.ok(UNIVERSE_WELCOME_KEYS.every((k) => msgs.includes(k)));
  });

  it("each planet defines preview metrics", () => {
    for (const planet of UNIVERSE_PLANETS) {
      assert.equal(planet.metricsKeys.length, 3);
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
