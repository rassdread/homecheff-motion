import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  UNIVERSE_PLANET_ICON_CLASS,
  UNIVERSE_PLANET_ICON_SIZE_DESKTOP_PX,
  UNIVERSE_PLANET_ICON_SIZE_MOBILE_PX,
  UNIVERSE_PLANET_ICON_SIZE_TABLET_PX,
  UNIVERSE_PLANET_NAME_LABEL_CLASS,
} from "@/lib/universe-planet-ux";

describe("universe v6 visibility pass", () => {
  it("decorative Saturn ring has no product name textPath", () => {
    const ringSource = readFileSync("src/components/suite/universe/universe-saturn-ring.tsx", "utf8");
    assert.doesNotMatch(ringSource, /textPath/);
    assert.doesNotMatch(ringSource, /buildUniversePlanetRingText/);
    assert.match(ringSource, /universe-saturn-band-front/);
    assert.match(ringSource, /universe-saturn-band-back/);
  });

  it("product name label visible on every planet without hover", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    assert.match(planetSource, /UNIVERSE_PLANET_NAME_LABEL_CLASS/);
    assert.match(planetSource, /planet\.titleKey/);
    assert.match(planetSource, /UniversePlanetIcon/);
    assert.doesNotMatch(planetSource, /active &&\s*\(\s*<UniversePlanetIdentityRing/);
  });

  it("planet hero icons use target responsive sizes", () => {
    assert.equal(UNIVERSE_PLANET_ICON_SIZE_MOBILE_PX, 32);
    assert.equal(UNIVERSE_PLANET_ICON_SIZE_TABLET_PX, 40);
    assert.equal(UNIVERSE_PLANET_ICON_SIZE_DESKTOP_PX, 48);
    assert.match(UNIVERSE_PLANET_ICON_CLASS, /h-8/);
    assert.match(UNIVERSE_PLANET_ICON_CLASS, /sm:h-10/);
    assert.match(UNIVERSE_PLANET_ICON_CLASS, /lg:h-12/);
    assert.equal(UNIVERSE_PLANET_NAME_LABEL_CLASS, "universe-planet-name-label");
  });

  it("planet icons have glow and hover pulse without requiring focus", () => {
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(css, /universe-planet-hero-icon/);
    assert.match(css, /drop-shadow/);
    assert.match(css, /universe-planet-icon-pulse/);
    assert.match(css, /universe-planet-name-label/);
  });
});
