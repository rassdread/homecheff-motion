import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { loginHref } from "@/lib/auth-login-href";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { resolveUniversePlanetHref } from "@/lib/universe-public-landing";
import {
  UNIVERSE_PLANET_CLUSTER_CLASS,
  UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS,
  UNIVERSE_PLANET_IDENTITY_RING_CLASS,
  UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX,
  UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS,
  UNIVERSE_PLANET_RING_SVG_FONT_SIZE,
  UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT,
  UNIVERSE_PLANET_SATELLITE_CLASS,
  UNIVERSE_PLANET_STATIC_LABEL_CLASS,
  allUniversePlanetsHavePreviewContent,
  resolveUniversePlanetPreviewContent,
} from "@/lib/universe-planet-ux";

describe("universe planet ux", () => {
  it("uses ring-only labels — no static label in orbit planet component", () => {
    const source = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.equal(UNIVERSE_PLANET_STATIC_LABEL_CLASS, "universe-planet-static-label");
    assert.equal(UNIVERSE_PLANET_IDENTITY_RING_CLASS, "universe-planet-identity-ring");
    assert.equal(UNIVERSE_PLANET_CLUSTER_CLASS, "universe-planet-cluster");
    assert.doesNotMatch(source, /UNIVERSE_PLANET_STATIC_LABEL_CLASS/);
    assert.doesNotMatch(source, /planet\.titleKey\}\s*<\/p>/);
  });

  it("identity ring and satellite scale tokens are enlarged", () => {
    assert.ok(UNIVERSE_PLANET_RING_SVG_FONT_SIZE >= 11);
    assert.ok(UNIVERSE_PLANET_RING_SVG_SCALE_PERCENT >= 680);
    assert.match(UNIVERSE_PLANET_SATELLITE_CLASS, /satellite/);
    assert.equal(UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS, "universe-planet-preview-portal");
    assert.ok(UNIVERSE_PLANET_ORBIT_CLUSTER_SIZE_PX >= 260);
  });

  it("hover close delay supports hover grace window", () => {
    assert.ok(UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS >= 150);
    assert.ok(UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS <= 250);
  });

  it("ring labels render for all products via preview content ids", () => {
    for (const planet of UNIVERSE_PLANETS) {
      const content = resolveUniversePlanetPreviewContent(planet.id);
      assert.ok(content.titleKey);
    }
  });

  it("portal has title description metrics and CTA for every planet", () => {
    assert.equal(allUniversePlanetsHavePreviewContent(), true);
    for (const planet of UNIVERSE_PLANETS) {
      const content = resolveUniversePlanetPreviewContent(planet.id);
      assert.equal(content.metrics.length, 3);
      assert.equal(content.previewChipKeys.length, 3);
      assert.ok(content.actionKey.startsWith("suite.home."));
      assert.ok(content.descriptionKey.startsWith("universe.planet."));
      for (const metric of content.metrics) {
        assert.ok(metric.sampleKey.startsWith("universe.preview.sample."));
        assert.notEqual(metric.sampleKey, "universe.preview.sample.ready");
      }
    }
  });

  it("portal preview content helpers remain for metadata", () => {
    const previewSource = readFileSync(
      "src/components/suite/universe/universe-planet-preview.tsx",
      "utf8"
    );
    assert.match(previewSource, /resolveUniversePlanetPreviewContent/);
  });

  it("portal CTA routes auth-aware", () => {
    const editor = UNIVERSE_PLANETS.find((p) => p.id === "editor")!;
    assert.equal(resolveUniversePlanetHref(editor.href, false), loginHref("/editor"));
    assert.equal(resolveUniversePlanetHref(editor.href, true), "/editor");
  });

  it("mobile expanded card uses inline chips and CTA not portal", () => {
    const mobileSource = readFileSync(
      "src/components/suite/universe/universe-mobile-stack.tsx",
      "utf8"
    );
    assert.doesNotMatch(mobileSource, /UniversePlanetPreview/);
    assert.match(mobileSource, /onSelect\(planet\)/);
    assert.match(mobileSource, /planet\.actionKey/);
    assert.doesNotMatch(mobileSource, /planet\.titleKey\}/);
  });

  it("editor portal metrics match spec labels", () => {
    const content = resolveUniversePlanetPreviewContent("editor");
    assert.deepEqual(
      content.metrics.map((m) => m.labelKey),
      [
        "universe.preview.metric.photos",
        "universe.preview.metric.characters",
        "universe.preview.metric.designs",
      ]
    );
  });

  it("globe uses spherical class and earth map layer", () => {
    const globeSource = readFileSync("src/components/suite/universe/universe-globe.tsx", "utf8");
    assert.match(globeSource, /universe-globe-spherical|UNIVERSE_GLOBE_SPHERICAL_CLASS/);
    assert.match(globeSource, /WorldMapTexture|universe-globe-world-map/);
    assert.match(globeSource, /aspectRatio.*1.*1/);
  });
});
