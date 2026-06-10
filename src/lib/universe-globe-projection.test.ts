import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ECOSYSTEM_HUBS,
  ECOSYSTEM_ROUTES,
  projectHubToGlobe,
  resolveHubById,
} from "@/lib/universe-globe-ecosystem";
import {
  UNIVERSE_GLOBE_ROTATION_DURATION_MS,
  UNIVERSE_GLOBE_ROTATION_DURATION_REDUCED_MS,
  buildGlobeRoutePath,
  distanceBetweenProjectedPoints,
  projectLatLonToGlobePoint,
  resolveGlobeMapTranslatePercent,
  resolveGlobeNodeLabelOpacity,
  resolveUniverseGlobeProjectionDebug,
  shouldDrawGlobeRoute,
} from "@/lib/universe-globe-projection";

describe("universe globe geo projection", () => {
  it("city coordinates exist for all hubs", () => {
    assert.equal(ECOSYSTEM_HUBS.length, 13);
    for (const hub of ECOSYSTEM_HUBS) {
      assert.ok(Number.isFinite(hub.lat));
      assert.ok(Number.isFinite(hub.lon));
      assert.ok(hub.lat >= -90 && hub.lat <= 90);
      assert.ok(hub.lon >= -180 && hub.lon <= 180);
    }
  });

  it("projection returns x/y/z/visible/opacity", () => {
    const p = projectLatLonToGlobePoint({ lat: 51.9244, lon: 4.4777, rotationDeg: 5 });
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.y));
    assert.ok(Number.isFinite(p.z));
    assert.equal(typeof p.visible, "boolean");
    assert.ok(p.opacity >= 0 && p.opacity <= 1);
    assert.ok(p.scale > 0);
  });

  it("Rotterdam and Amsterdam project near each other", () => {
    const rotationDeg = 4.5;
    const r = projectHubToGlobe(51.9244, 4.4777, rotationDeg);
    const a = projectHubToGlobe(52.3676, 4.9041, rotationDeg);
    assert.equal(r.visible, true);
    assert.equal(a.visible, true);
    assert.ok(distanceBetweenProjectedPoints(r, a) < 4);
  });

  it("Caribbean tier-3 hubs cluster near Paramaribo", () => {
    const rotationDeg = -55.2;
    const paramaribo = projectHubToGlobe(5.852, -55.2038, rotationDeg);
    const philipsburg = projectHubToGlobe(18.026, -63.0458, rotationDeg);
    const willemstad = projectHubToGlobe(12.1696, -68.99, rotationDeg);
    const oranjestad = projectHubToGlobe(12.5092, -70.0086, rotationDeg);
    assert.equal(paramaribo.visible, true);
    assert.ok(distanceBetweenProjectedPoints(paramaribo, philipsburg) < 12);
    assert.ok(distanceBetweenProjectedPoints(paramaribo, willemstad) < 15);
    assert.ok(distanceBetweenProjectedPoints(paramaribo, oranjestad) < 15);
  });

  it("São Paulo projects south of Paramaribo on Americas-facing view", () => {
    const rotationDeg = -50;
    const paramaribo = projectHubToGlobe(5.852, -55.2038, rotationDeg);
    const saoPaulo = projectHubToGlobe(-23.5558, -46.6396, rotationDeg);
    assert.equal(paramaribo.visible, true);
    assert.equal(saoPaulo.visible, true);
    assert.ok(saoPaulo.y > paramaribo.y);
  });

  it("Sydney projects southeast of Singapore on Asia-Pacific view", () => {
    const rotationDeg = 104;
    const singapore = projectHubToGlobe(1.3521, 103.8198, rotationDeg);
    const sydney = projectHubToGlobe(-33.8688, 151.2093, rotationDeg);
    assert.equal(singapore.visible, true);
    assert.equal(sydney.visible, true);
    assert.ok(sydney.x > singapore.x);
    assert.ok(sydney.y > singapore.y);
  });

  it("New York appears on front hemisphere when Americas face forward", () => {
    const ny = projectHubToGlobe(40.7128, -74.006, -74);
    assert.equal(ny.visible, true);
    assert.ok(ny.z > 0.5);
    assert.ok(ny.opacity > 0.6);
  });

  it("European hubs appear on front hemisphere when Europe faces forward", () => {
    const rotationDeg = 4;
    for (const id of ["rotterdam", "amsterdam", "london"] as const) {
      const hub = resolveHubById(id)!;
      const p = projectHubToGlobe(hub.lat, hub.lon, rotationDeg);
      assert.equal(p.visible, true, id);
      assert.ok(p.z > 0.4, id);
    }
  });

  it("backside points are hidden or dimmed", () => {
    const front = projectHubToGlobe(51.9244, 4.4777, 4.4777);
    const back = projectHubToGlobe(51.9244, 4.4777, 4.4777 + 180);
    assert.equal(front.visible, true);
    assert.equal(back.visible, false);
    assert.equal(back.opacity, 0);
  });

  it("route endpoints use projected city points", () => {
    const rotationDeg = 10;
    for (const route of ECOSYSTEM_ROUTES) {
      const from = resolveHubById(route.from)!;
      const to = resolveHubById(route.to)!;
      const a = projectHubToGlobe(from.lat, from.lon, rotationDeg);
      const b = projectHubToGlobe(to.lat, to.lon, rotationDeg);
      if (shouldDrawGlobeRoute(a, b)) {
        const path = buildGlobeRoutePath(a, b);
        assert.match(path, /^M [\d.]+ [\d.]+ Q/);
        assert.match(path, /[\d.]+ [\d.]+$/);
      }
    }
  });

  it("map translate percent syncs with rotation", () => {
    assert.ok(Math.abs(resolveGlobeMapTranslatePercent(0)) < 0.001);
    assert.equal(resolveGlobeMapTranslatePercent(360), -50);
    assert.equal(resolveGlobeMapTranslatePercent(180), -25);
  });

  it("rotation duration configured 20–30 seconds", () => {
    assert.ok(UNIVERSE_GLOBE_ROTATION_DURATION_MS >= 20_000);
    assert.ok(UNIVERSE_GLOBE_ROTATION_DURATION_MS <= 30_000);
    assert.equal(UNIVERSE_GLOBE_ROTATION_DURATION_MS, 24_000);
  });

  it("reduced motion uses slower static-friendly duration constant", () => {
    assert.ok(UNIVERSE_GLOBE_ROTATION_DURATION_REDUCED_MS > UNIVERSE_GLOBE_ROTATION_DURATION_MS);
  });

  it("projection debug flag resolves from query param", () => {
    assert.equal(resolveUniverseGlobeProjectionDebug("1"), true);
    assert.equal(resolveUniverseGlobeProjectionDebug("projection"), true);
    assert.equal(resolveUniverseGlobeProjectionDebug("false"), false);
  });

  it("hub labels only appear when globe is focused", () => {
    const point = projectLatLonToGlobePoint({ lat: 51.9244, lon: 4.4777, rotationDeg: 4.5 });
    assert.equal(resolveGlobeNodeLabelOpacity(point, false, 1), 0);
    assert.equal(resolveGlobeNodeLabelOpacity(point, false, 2), 0);
    assert.ok(resolveGlobeNodeLabelOpacity(point, true, 1) > 0);
  });

  it("globe and overlay share rotation-driven projection", () => {
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    const overlaySource = readFileSync(
      "src/components/suite/universe/universe-globe-ecosystem-overlay.tsx",
      "utf8"
    );
    assert.match(globeSource, /useUniverseGlobeRotation/);
    assert.match(globeSource, /resolveGlobeMapTranslatePercent/);
    assert.match(overlaySource, /rotationDeg/);
    assert.match(overlaySource, /projectHubToGlobe/);
    assert.doesNotMatch(overlaySource, /centerLon\s*=\s*10/);
  });
});
