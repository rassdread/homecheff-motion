import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { resolveUniversePlanetLabel } from "@/lib/universe-public-landing";
import {
  UNIVERSE_CAPABILITY_ORBIT_DURATION_S,
  resolveCapabilityOrbitAngleDeg,
  resolveUniversePlanetVisualDebug,
} from "@/lib/universe-planet-ux";

describe("universe v6 rotating capability orbits", () => {
  it("product name ring text renders for every planet via SVG textPath", () => {
    const ringSource = readFileSync("src/components/suite/universe/universe-saturn-ring.tsx", "utf8");
    assert.match(ringSource, /textPath/);
    assert.match(ringSource, /universe-saturn-ring-text/);
    for (const planet of UNIVERSE_PLANETS) {
      const label = resolveUniversePlanetLabel(planet.id);
      assert.ok(label.length > 0);
    }
  });

  it("product ring visible in default state (front arc always mounted)", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.match(planetSource, /layer="front"/);
    assert.match(planetSource, /UniversePlanetIdentityRing/);
    assert.doesNotMatch(planetSource, /planet\.titleKey\}\s*<\/p>/);
  });

  it("capability labels orbit via ellipse position animation", () => {
    const satSource = readFileSync(
      "src/components/suite/universe/universe-planet-satellites.tsx",
      "utf8"
    );
    assert.match(satSource, /resolveCapabilityEllipsePosition/);
    assert.match(satSource, /useCapabilityOrbitAngle/);
    assert.match(satSource, /resolveCapabilityOrbitAngleDeg/);
    assert.doesNotMatch(satSource, /resolveCapabilityRadialSlot/);
  });

  it("orbit duration is premium range 20–30 seconds", () => {
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_DURATION_S >= 20);
    assert.ok(UNIVERSE_CAPABILITY_ORBIT_DURATION_S <= 30);
  });

  it("capability orbit distributes labels evenly", () => {
    const a = resolveCapabilityOrbitAngleDeg(0, 4);
    const b = resolveCapabilityOrbitAngleDeg(1, 4);
    assert.equal(b - a, 90);
  });

  it("portal cards remain removed", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.doesNotMatch(planetSource, /UniversePlanetPreview/);
  });

  it("mobile uses chip fallback not desktop orbit", () => {
    const mobileSource = readFileSync(
      "src/components/suite/universe/universe-mobile-stack.tsx",
      "utf8"
    );
    assert.match(mobileSource, /capabilityKeys\.slice/);
    assert.doesNotMatch(mobileSource, /useCapabilityOrbitAngle/);
  });

  it("reduced motion disables orbit angle animation", () => {
    const satSource = readFileSync(
      "src/components/suite/universe/universe-planet-satellites.tsx",
      "utf8"
    );
    assert.match(satSource, /reducedMotion/);
    assert.match(satSource, /useCapabilityOrbitAngle/);
  });

  it("planet visual debug resolves from query param", () => {
    assert.equal(resolveUniversePlanetVisualDebug("editor"), "editor");
    assert.equal(resolveUniversePlanetVisualDebug("invalid"), null);
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /universePlanetDebug/);
  });
});
