import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX,
  UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX,
  resolveCapabilityEllipsePosition,
  resolveCapabilityLabelDepthStyle,
  resolveUniverseOrbitDebug,
} from "@/lib/universe-planet-ux";

describe("universe v7 brand globe and upright orbit labels", () => {
  it("globe uses HomeCheff brand ocean and land tint", () => {
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(globeSource, /#0067B1/);
    assert.match(globeSource, /universe-globe-ocean/);
    assert.match(css, /universe-globe-world-map/);
    assert.match(css, /hue-rotate\(122deg\)/);
    assert.doesNotMatch(globeSource, /opacity-22 mix-blend-screen/);
  });

  it("orbit labels use translate position without rotate on text", () => {
    const satSource = readFileSync(
      "src/components/suite/universe/universe-planet-satellites.tsx",
      "utf8"
    );
    assert.match(satSource, /resolveCapabilityEllipsePosition/);
    assert.match(satSource, /translate\(calc\(-50% \+/);
    assert.doesNotMatch(satSource, /universe-capability-orbit-spin/);
    assert.doesNotMatch(satSource, /rotate\(\$\{angleDeg\}deg\)/);
    assert.doesNotMatch(satSource, /universe-capability-orbit-label-upright/);
  });

  it("ellipse orbit uses brand radii in suggested range", () => {
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX >= 150);
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_X_RADIUS_PX <= 190);
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX >= 85);
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_Y_RADIUS_PX <= 120);
  });

  it("labels stay upright at all orbit angles — no rotation in transform", () => {
    for (let angle = 0; angle < 360; angle += 30) {
      const pos = resolveCapabilityEllipsePosition(angle);
      assert.ok(Number.isFinite(pos.x));
      assert.ok(Number.isFinite(pos.y));
      assert.ok(pos.depth >= 0 && pos.depth <= 1);
    }
  });

  it("backside labels fade and scale down", () => {
    const back = resolveCapabilityLabelDepthStyle(0.1);
    const front = resolveCapabilityLabelDepthStyle(0.9);
    assert.ok(back.opacity < front.opacity);
    assert.ok(back.scale < front.scale);
    assert.ok(back.opacity >= 0.2 && back.opacity <= 0.35);
  });

  it("orbit debug param resolves", () => {
    assert.equal(resolveUniverseOrbitDebug("1"), true);
    assert.equal(resolveUniverseOrbitDebug("false"), false);
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /universeOrbitDebug/);
  });

  it("Saturn product ring stays separate from capability orbit", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.match(planetSource, /UniversePlanetIdentityRing/);
    assert.match(planetSource, /UniversePlanetSatellites/);
  });
});
