import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { loginHref } from "@/lib/auth-login-href";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import {
  UNIVERSE_HERO_HIGHLIGHT_KEYS,
  UNIVERSE_HOW_IT_WORKS_PATH,
  resolveUniversePlanetHref,
  resolveUniversePrimaryCtaHref,
  resolveUniversePublicHeadlineKey,
  resolveUniversePublicSubheadlineKey,
  resolveUniverseStartProjectHref,
  resolveUniverseWelcomeMessagesPublic,
} from "@/lib/universe-public-landing";

describe("universe production line messaging", () => {
  it("homepage hero shows AI production line copy", () => {
    const heroSource = readFileSync("src/components/suite/universe/universe-hero-copy.tsx", "utf8");
    assert.match(heroSource, /universe\.hero\.tagline/);
    assert.match(heroSource, /universe\.hero\.body/);
    assert.match(heroSource, /universe\.hero\.oneProject/);
    assert.match(heroSource, /UNIVERSE_HERO_HIGHLIGHT_KEYS/);
    assert.doesNotMatch(heroSource, /Maak assets\. Bouw verhalen/);
  });

  it("signed-in copy differs from signed-out copy", () => {
    assert.equal(resolveUniversePublicHeadlineKey(false), "universe.hero.welcomeSignedOut");
    assert.equal(resolveUniversePublicHeadlineKey(true), "universe.welcome.signedInHeadline");
    assert.equal(resolveUniversePublicSubheadlineKey(false), "universe.hero.leadA");
    assert.equal(resolveUniversePublicSubheadlineKey(true), "universe.hero.signedInReady");
    const signedOutMsgs = resolveUniverseWelcomeMessagesPublic("a@b.com", false);
    assert.deepEqual(signedOutMsgs, ["universe.hero.welcomeSignedOut"]);
    const signedInMsgs = resolveUniverseWelcomeMessagesPublic("a@b.com", true);
    assert.equal(signedInMsgs[0], "universe.welcome.back");
  });

  it("CTA block and production line section render on homepage", () => {
    const homeSource = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    assert.match(homeSource, /UniverseHeroCopy/);
    assert.match(homeSource, /UniverseProductionLine/);
    assert.doesNotMatch(homeSource, /UniverseEcosystemStory/);
  });

  it("product flow uses production-line capability labels", () => {
    for (const planet of UNIVERSE_PLANETS) {
      assert.equal(planet.capabilityKeys.length, 5);
      for (const key of planet.capabilityKeys) {
        assert.match(key, /^universe\.capability\./);
      }
    }
    const editor = UNIVERSE_PLANETS.find((p) => p.id === "editor")!;
    assert.equal(editor.capabilityKeys[0], "universe.capability.editor.photos");
    const publish = UNIVERSE_PLANETS.find((p) => p.id === "publish")!;
    assert.equal(publish.capabilityKeys[0], "universe.capability.publish.languages");
  });

  it("how-it-works page renders at dedicated route", () => {
    assert.equal(UNIVERSE_HOW_IT_WORKS_PATH, "/hoe-het-werkt");
    const pageSource = readFileSync("src/app/hoe-het-werkt/page.tsx", "utf8");
    const componentSource = readFileSync(
      "src/components/suite/universe/universe-how-it-works-page.tsx",
      "utf8"
    );
    assert.match(pageSource, /UniverseHowItWorksPage/);
    assert.match(componentSource, /universe\.howItWorks\.q1\.title/);
    assert.match(componentSource, /UNIVERSE_PLANETS/);
  });

  it("protected CTAs route to login with next when signed out", () => {
    assert.equal(resolveUniverseStartProjectHref(false), loginHref("/editor"));
    assert.equal(resolveUniverseStartProjectHref(true), "/editor");
    assert.equal(resolveUniversePrimaryCtaHref(false), loginHref("/editor"));
    assert.equal(resolveUniversePlanetHref("/studio", false), loginHref("/studio"));
  });

  it("signed-in CTAs route directly", () => {
    assert.equal(resolveUniversePrimaryCtaHref(true), "/editor");
    assert.equal(resolveUniversePlanetHref("/library", true), "/library");
  });

  it("hero highlights cover version adaptation story", () => {
    assert.equal(UNIVERSE_HERO_HIGHLIGHT_KEYS.length, 6);
    assert.match(UNIVERSE_HERO_HIGHLIGHT_KEYS.join(" "), /languages/);
    assert.match(UNIVERSE_HERO_HIGHLIGHT_KEYS.join(" "), /voiceovers/);
  });

  it("NL and EN locales define production line keys", () => {
    const nl = readFileSync("src/i18n/locales/nl.ts", "utf8");
    const en = readFileSync("src/i18n/locales/en.ts", "utf8");
    for (const key of [
      "universe.hero.tagline",
      "universe.productionLine.title",
      "universe.howItWorks.title",
      "universe.capability.publish.languages",
      "universe.planet.editor.short",
    ]) {
      assert.match(nl, new RegExp(`"${key}"`));
      assert.match(en, new RegExp(`"${key}"`));
    }
  });

  it("planet name labels remain on planet not ring", () => {
    const planetSource = readFileSync("src/components/suite/universe/universe-planet.tsx", "utf8");
    const ringSource = readFileSync("src/components/suite/universe/universe-saturn-ring.tsx", "utf8");
    assert.match(planetSource, /planet\.titleKey/);
    assert.doesNotMatch(ringSource, /textPath/);
  });
});
