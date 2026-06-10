import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { loginHref } from "@/lib/auth-login-href";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { worldMapAssetConfigured } from "@/lib/universe-globe-earth";
import { ECOSYSTEM_HUBS } from "@/lib/universe-globe-ecosystem";
import { validateUniverseLayerOrder } from "@/lib/universe-globe-render";
import { resolveUniversePlanetHref } from "@/lib/universe-public-landing";
import {
  UNIVERSE_PLANET_HOVER_SCALE,
  UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS,
  UNIVERSE_Z_CAPABILITY,
} from "@/lib/universe-planet-ux";

describe("universe v5 clean planet interaction", () => {
  it("does not render hover portal cards on desktop planet", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.doesNotMatch(planetSource, /UniversePlanetPreview/);
    assert.doesNotMatch(planetSource, /universe-planet-preview-portal/);
  });

  it("mobile uses inline CTA not portal preview", () => {
    const mobileSource = readFileSync(
      "src/components/suite/universe/universe-mobile-stack.tsx",
      "utf8"
    );
    assert.doesNotMatch(mobileSource, /UniversePlanetPreview/);
    assert.match(mobileSource, /onSelect\(planet\)/);
    assert.match(mobileSource, /planet\.actionKey/);
  });

  it("planet is primary button with pointer cursor", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.match(planetSource, /type="button"/);
    assert.match(planetSource, /cursor-pointer/);
    assert.match(planetSource, /onClick=\{\(\) => onSelect\(planet\)\}/);
    assert.match(planetSource, /aria-label/);
  });

  it("auth-aware planet routing", () => {
    const editor = UNIVERSE_PLANETS.find((p) => p.id === "editor")!;
    assert.equal(resolveUniversePlanetHref(editor.href, false), loginHref("/editor"));
    assert.equal(resolveUniversePlanetHref(editor.href, true), "/editor");
  });

  it("hover scale is 130%", () => {
    assert.equal(UNIVERSE_PLANET_HOVER_SCALE, 1.3);
  });

  it("capability labels use rotating orbit on hover", () => {
    const satSource = readFileSync(
      "src/components/suite/universe/universe-planet-satellites.tsx",
      "utf8"
    );
    assert.match(satSource, /resolveCapabilityEllipsePosition/);
    assert.doesNotMatch(satSource, /universe-capability-orbit-spin/);
  });

  it("layer order has no portal above planets", () => {
    assert.equal(validateUniverseLayerOrder(), true);
    assert.equal(UNIVERSE_Z_CAPABILITY, 90);
  });

  it("single product name label on planet — no ring text duplicate", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    const ringSource = readFileSync("src/components/suite/universe/universe-saturn-ring.tsx", "utf8");
    assert.match(planetSource, /UNIVERSE_PLANET_NAME_LABEL_CLASS/);
    assert.match(planetSource, /UniversePlanetIdentityRing/);
    assert.doesNotMatch(ringSource, /textPath/);
  });

  it("pipeline route highlight module exists", () => {
    const pipelineSource = readFileSync("src/components/suite/universe/universe-pipeline.tsx", "utf8");
    assert.match(pipelineSource, /resolveUniversePipelineHighlight/);
  });

  it("globe uses real world map texture", () => {
    assert.equal(worldMapAssetConfigured(), true);
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    assert.match(globeSource, /WorldMapTexture/);
  });

  it("ecosystem nodes render", () => {
    assert.equal(ECOSYSTEM_HUBS.length, 13);
    const overlaySource = readFileSync(
      "src/components/suite/universe/universe-globe-ecosystem-overlay.tsx",
      "utf8"
    );
    assert.match(overlaySource, /ECOSYSTEM_HUBS/);
  });

  it("portal class retained only for legacy tests not UI", () => {
    assert.equal(UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS, "universe-planet-preview-portal");
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.doesNotMatch(homeSource, /UniversePlanetPreview/);
  });
});
