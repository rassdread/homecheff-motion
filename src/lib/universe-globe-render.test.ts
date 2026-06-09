import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  EARTH_REQUIRED_CONTINENT_IDS,
  allRequiredContinentsPresent,
} from "@/lib/universe-globe-earth";
import { ECOSYSTEM_HUBS, allEcosystemRoutesResolve } from "@/lib/universe-globe-ecosystem";
import {
  UNIVERSE_GLOBE_HERO_MAX_PX,
  UNIVERSE_Z_GLOBE_WRAPPER,
  UNIVERSE_Z_ORBIT_PLANETS,
  resolveUniverseGlobeDebugLayer,
  validateUniverseLayerOrder,
} from "@/lib/universe-globe-render";

describe("universe globe render audit", () => {
  it("globe wrapper z-index is below orbit planets", () => {
    assert.ok(UNIVERSE_Z_ORBIT_PLANETS > UNIVERSE_Z_GLOBE_WRAPPER);
    const orbitSource = readFileSync(
      "src/components/suite/universe/universe-orbit-system.tsx",
      "utf8"
    );
    assert.match(orbitSource, /UNIVERSE_Z_GLOBE_WRAPPER/);
    assert.match(orbitSource, /UNIVERSE_Z_ORBIT_PLANETS/);
    assert.doesNotMatch(orbitSource, /z-\[10\].*Globe|Globe.*z-\[10\]/);
  });

  it("planet internal layer order is correct", () => {
    assert.equal(validateUniverseLayerOrder(), true);
  });

  it("hero globe size does not dominate orbit", () => {
    assert.ok(UNIVERSE_GLOBE_HERO_MAX_PX <= 340);
  });

  it("Earth map includes all required continents", () => {
    assert.equal(allRequiredContinentsPresent(), true);
    for (const id of EARTH_REQUIRED_CONTINENT_IDS) {
      assert.ok(EARTH_REQUIRED_CONTINENT_IDS.includes(id));
    }
  });

  it("ecosystem overlay renders all hubs and routes", () => {
    assert.equal(ECOSYSTEM_HUBS.length, 13);
    assert.equal(allEcosystemRoutesResolve(), true);
    const overlaySource = readFileSync(
      "src/components/suite/universe/universe-globe-ecosystem-overlay.tsx",
      "utf8"
    );
    assert.match(overlaySource, /ECOSYSTEM_HUBS/);
    assert.match(overlaySource, /ECOSYSTEM_ROUTES/);
    assert.match(overlaySource, /projectHubToGlobe|projectLatLonToGlobePoint/);
  });

  it("globe debug layers resolve from query param", () => {
    assert.equal(resolveUniverseGlobeDebugLayer("ocean"), "ocean");
    assert.equal(resolveUniverseGlobeDebugLayer("continents"), "continents");
    assert.equal(resolveUniverseGlobeDebugLayer("nodes"), "nodes");
    assert.equal(resolveUniverseGlobeDebugLayer("full"), "full");
    assert.equal(resolveUniverseGlobeDebugLayer("invalid"), null);
  });

  it("globe uses separate continent map and ecosystem overlay", () => {
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    assert.match(globeSource, /GlobeEcosystemOverlay/);
    assert.match(globeSource, /EarthContinentMap/);
    assert.match(globeSource, /UNIVERSE_GLOBE_HERO_MAX_PX/);
  });
});
