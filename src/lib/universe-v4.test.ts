import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { EARTH_CONTINENT_PATHS } from "@/lib/universe-globe-earth";
import {
  ECOSYSTEM_HUBS,
  ECOSYSTEM_ROUTES,
  allEcosystemRoutesResolve,
} from "@/lib/universe-globe-ecosystem";
import {
  UNIVERSE_PLANET_SATURN_RING_CLASS,
  UNIVERSE_PLANET_SATURN_SCENE_CLASS,
  UNIVERSE_PLANET_HOVER_SCALE,
  UNIVERSE_Z_GLOBE,
  UNIVERSE_Z_PLANET,
  UNIVERSE_Z_PORTAL,
  UNIVERSE_Z_RING,
  UNIVERSE_Z_SATELLITE,
  resolveSaturnRingVariant,
  resolveUniversePortalPlacement,
  resolveUniversePortalPositionClass,
} from "@/lib/universe-planet-ux";

describe("universe v4 saturn rings and smart portals", () => {
  it("renders Saturn ring classes instead of textPath spinner", () => {
    const ringSource = readFileSync("src/components/suite/universe/universe-saturn-ring.tsx", "utf8");
    assert.equal(UNIVERSE_PLANET_SATURN_RING_CLASS, "universe-saturn-ring");
    assert.equal(UNIVERSE_PLANET_SATURN_SCENE_CLASS, "universe-saturn-scene");
    assert.match(ringSource, /universe-saturn-band-back/);
    assert.match(ringSource, /universe-saturn-band-front/);
    assert.doesNotMatch(ringSource, /textPath/);
  });

  it("ring text stays upright via label track counter-tilt", () => {
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(css, /universe-saturn-label-track/);
    assert.match(css, /rotateX\(-68deg\)/);
    assert.match(css, /universe-saturn-y-spin/);
  });

  it("masks rear ring behind planet with front/back clip paths", () => {
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(css, /universe-saturn-band-back/);
    assert.match(css, /universe-saturn-band-front/);
    assert.match(css, /clip-path: inset\(0 0 52%/);
    assert.match(css, /clip-path: inset\(48%/);
  });

  it("product ring variants exist for all planets", () => {
    for (const planet of UNIVERSE_PLANETS) {
      const variant = resolveSaturnRingVariant(planet.id);
      assert.ok(variant.accent);
      assert.ok(variant.decoration);
    }
  });

  it("smart portal placement opens away from globe center", () => {
    assert.equal(resolveUniversePortalPlacement(-90), "below");
    assert.equal(resolveUniversePortalPlacement(90), "above");
    assert.equal(resolveUniversePortalPlacement(0), "left");
    assert.equal(resolveUniversePortalPlacement(180), "right");
  });

  it("portal position classes cover all sides", () => {
    for (const side of ["above", "below", "left", "right"] as const) {
      const cls = resolveUniversePortalPositionClass(side);
      assert.ok(cls.length > 8);
    }
  });

  it("layer hierarchy: satellites above portal above planet above ring", () => {
    assert.ok(UNIVERSE_Z_SATELLITE > UNIVERSE_Z_PORTAL);
    assert.ok(UNIVERSE_Z_PORTAL > UNIVERSE_Z_PLANET);
    assert.ok(UNIVERSE_Z_PLANET > UNIVERSE_Z_RING);
    assert.ok(UNIVERSE_Z_RING > UNIVERSE_Z_GLOBE);
    const orbitSource = readFileSync(
      "src/components/suite/universe/universe-orbit-system.tsx",
      "utf8"
    );
    assert.match(orbitSource, /UNIVERSE_Z_ORBIT_PLANETS/);
    assert.match(orbitSource, /UNIVERSE_Z_GLOBE_WRAPPER/);
  });

  it("hover expansion scale is premium range", () => {
    assert.ok(UNIVERSE_PLANET_HOVER_SCALE >= 1.18);
    assert.ok(UNIVERSE_PLANET_HOVER_SCALE <= 1.25);
  });

  it("Earth continents include all major landmasses", () => {
    const ids = EARTH_CONTINENT_PATHS.map((c) => c.id);
    assert.ok(ids.includes("north-america"));
    assert.ok(ids.includes("south-america"));
    assert.ok(ids.includes("europe"));
    assert.ok(ids.includes("africa"));
    assert.ok(ids.includes("asia"));
    assert.ok(ids.includes("australia"));
    assert.ok(ids.includes("antarctica"));
    assert.ok(ids.includes("arctic"));
  });

  it("ecosystem network resolves all routes and tier-1 hubs", () => {
    assert.equal(allEcosystemRoutesResolve(), true);
    const tier1 = ECOSYSTEM_HUBS.filter((h) => h.tier === 1);
    assert.equal(tier1.length, 2);
    assert.ok(tier1.some((h) => h.id === "rotterdam"));
    assert.ok(tier1.some((h) => h.id === "paramaribo"));
    assert.ok(ECOSYSTEM_ROUTES.length >= 10);
  });

  it("globe shows ecosystem layer and focus labels", () => {
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    const overlaySource = readFileSync(
      "src/components/suite/universe/universe-globe-ecosystem-overlay.tsx",
      "utf8"
    );
    assert.match(globeSource, /GlobeEcosystemOverlay/);
    assert.match(overlaySource, /ECOSYSTEM_HUBS/);
    assert.match(overlaySource, /focused/);
  });

  it("mobile uses inline portal without duplicate title labels", () => {
    const mobileSource = readFileSync(
      "src/components/suite/universe/universe-mobile-stack.tsx",
      "utf8"
    );
    assert.match(mobileSource, /UniversePlanetIdentityRing/);
    assert.match(mobileSource, /layout="inline"/);
    assert.doesNotMatch(mobileSource, /planet\.titleKey\}/);
  });
});
