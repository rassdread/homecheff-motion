import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS,
  UNIVERSE_PLANET_HOVER_LOCK_MS,
} from "@/lib/universe-planet-ux";

describe("universe v8 layout and hover stability", () => {
  it("hero is left-aligned with universe tagline", () => {
    const heroSource = readFileSync("src/components/suite/universe/universe-hero-copy.tsx", "utf8");
    assert.match(heroSource, /text-left/);
    assert.match(heroSource, /justify-start/);
    assert.match(heroSource, /universe\.hero\.tagline/);
    assert.match(heroSource, /universe\.welcome\.back/);
    assert.match(heroSource, /universe\.hero\.todayPrompt/);
    assert.doesNotMatch(heroSource, /text-center/);
  });

  it("home page places hero and orbit side by side on desktop", () => {
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /home-hero-grid/);
    assert.match(homeSource, /home-hero-copy/);
    assert.match(homeSource, /home-universe-zone/);
    assert.match(homeSource, /home-after-hero/);
    assert.doesNotMatch(homeSource, /UniverseDynamicWelcome/);
  });

  it("universe zone is centered without negative overlap offsets", () => {
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(css, /\.home-universe-zone/);
    assert.match(css, /justify-content:\s*center/);
    assert.doesNotMatch(css, /margin-top:\s*-7\.5rem/);
    assert.doesNotMatch(css, /margin-top:\s*-9\.375rem/);
  });

  it("dashboard section uses positive spacing in document flow", () => {
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(css, /\.universe-dashboard-section/);
    assert.match(css, /margin-top:\s*0/);
    assert.match(css, /padding-top:\s*clamp/);
  });

  it("capability labels never capture pointer events", () => {
    const satSource = readFileSync(
      "src/components/suite/universe/universe-planet-satellites.tsx",
      "utf8"
    );
    assert.match(satSource, /pointer-events-none/);
    assert.doesNotMatch(satSource, /UNIVERSE_PLANET_HOVER_SCALE/);
    assert.doesNotMatch(satSource, /depthStyle\.scale/);
  });

  it("hover lock uses 500ms minimum", () => {
    assert.equal(UNIVERSE_PLANET_HOVER_CLOSE_DELAY_MS, 500);
    assert.equal(UNIVERSE_PLANET_HOVER_LOCK_MS, 500);
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /UNIVERSE_PLANET_HOVER_LOCK_MS/);
    assert.match(homeSource, /hoverOpenedAt/);
  });

  it("planet cluster scales as one unit for stable hover", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.match(planetSource, /transform: `scale\(\$\{hoverScale\}\)`/);
    assert.doesNotMatch(planetSource, /scale\(\$\{hoverScale\}\) translateZ/);
  });
});
