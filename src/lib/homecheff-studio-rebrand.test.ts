import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { brand } from "@/lib/brand";
import {
  UNIVERSE_HERO_PIPELINE_KEYS,
  UNIVERSE_WHY_STUDIO_PATH,
  resolveUniverseHowItWorksHref,
} from "@/lib/universe-public-landing";

describe("HomeCheff Studio rebrand", () => {
  it("app shell and metadata use HomeCheff Studio product name", () => {
    assert.equal(brand.studioProductName, "HomeCheff Studio");
    const shell = readFileSync("src/components/layout/app-shell.tsx", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    assert.match(shell, /brand\.studioProductName/);
    assert.match(shell, /studioVisual\.header/);
    assert.match(layout, /title: "HomeCheff Studio"/);
  });

  it("hero uses pipeline copy without after-hero production messaging", () => {
    const heroSource = readFileSync("src/components/suite/universe/universe-hero-copy.tsx", "utf8");
    assert.match(heroSource, /UNIVERSE_HERO_PIPELINE_KEYS/);
    assert.doesNotMatch(heroSource, /universe\.hero\.adaptIntro/);
    assert.doesNotMatch(heroSource, /universe\.productionLine\.title/);
    assert.doesNotMatch(heroSource, /universe\.hero\.body/);
    assert.equal(UNIVERSE_HERO_PIPELINE_KEYS.length, 4);
  });

  it("homepage includes premium after-hero sections without duplicate marketing blocks", () => {
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /UniverseHomeSections/);
    assert.match(homeSource, /home-after-hero/);
    assert.doesNotMatch(homeSource, /UniverseDifferentiation/);
    assert.doesNotMatch(homeSource, /UniverseMarketingSections/);
  });

  it("why studio page renders at dedicated route", () => {
    assert.equal(UNIVERSE_WHY_STUDIO_PATH, "/hoe-werkt-studio");
    assert.equal(resolveUniverseHowItWorksHref(), "/hoe-werkt-studio");
    const pageSource = readFileSync("src/app/hoe-werkt-studio/page.tsx", "utf8");
    const componentSource = readFileSync(
      "src/components/suite/universe/universe-why-studio-page.tsx",
      "utf8"
    );
    assert.match(pageSource, /UniverseWhyStudioPage/);
    assert.match(componentSource, /universe\.whyStudio\.problem\.title/);
    assert.match(componentSource, /universe\.whyStudio\.cta\.openStudio/);
  });

  it("user-facing locales no longer reference HomeCheff AI Suite", () => {
    const nl = readFileSync("src/i18n/locales/nl.ts", "utf8");
    const en = readFileSync("src/i18n/locales/en.ts", "utf8");
    assert.doesNotMatch(nl, /HomeCheff AI Suite/);
    assert.doesNotMatch(en, /HomeCheff AI Suite/);
    assert.doesNotMatch(nl, /Welkom bij HomeCheff AI"/);
    assert.doesNotMatch(en, /Welcome to HomeCheff AI"/);
  });

  it("NL and EN define brand, differentiation and why-studio keys", () => {
    const nl = readFileSync("src/i18n/locales/nl.ts", "utf8");
    const en = readFileSync("src/i18n/locales/en.ts", "utf8");
    for (const key of [
      "brand.studio.name",
      "brand.studio.watermark",
      "brand.studio.openIn",
      "brand.studio.editIn",
      "universe.hero.taglineAlt",
      "universe.hero.pipeline.images",
      "universe.differentiation.title",
      "universe.whyStudio.title",
      "universe.planet.publish.short",
    ]) {
      assert.match(nl, new RegExp(`"${key}"`));
      assert.match(en, new RegExp(`"${key}"`));
    }
    assert.match(nl, /Gemaakt met HomeCheff Studio/);
    assert.match(en, /Made with HomeCheff Studio/);
    assert.match(nl, /Openen in HomeCheff Studio/);
    assert.match(en, /Open in HomeCheff Studio/);
  });
});
