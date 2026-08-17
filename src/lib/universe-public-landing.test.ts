import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginHref } from "@/lib/auth-login-href";
import {
  UNIVERSE_GLOBE_SPHERICAL_CLASS,
  UNIVERSE_GUIDED_CREATION_PATH,
  UNIVERSE_WHY_STUDIO_PATH,
  resolveSuiteNavHref,
  resolveUniversePlanetHref,
  resolveUniversePlanetHrefs,
  resolveUniversePlanetLabel,
  resolveUniversePrimaryCtaHref,
  resolveUniversePrimaryCtaKey,
  resolveUniversePublicHeadlineKey,
  resolveUniverseSecondaryCtaHref,
  resolveUniverseSecondaryCtaKey,
  resolveUniverseWelcomeMessagesPublic,
} from "@/lib/universe-public-landing";

describe("universe v3 public landing", () => {
  it("globe uses spherical class token", () => {
    assert.equal(UNIVERSE_GLOBE_SPHERICAL_CLASS, "universe-globe-spherical");
  });

  it("SP.3: signed-out planet clicks open public product pages", () => {
    assert.equal(resolveUniversePlanetHref("/editor", false), "/editor");
    assert.equal(resolveUniversePlanetHref("/editor", true), "/editor");
    assert.equal(resolveUniversePlanetHref("/motion", false), "/motion");
  });

  it("builds all planet hrefs without login walls for discovery", () => {
    const signedOut = resolveUniversePlanetHrefs(false);
    assert.equal(signedOut.editor, "/editor");
    assert.equal(signedOut.motion, "/motion");
    assert.equal(signedOut.studio, "/studio");
    assert.equal(signedOut.library, "/library");
    const signedIn = resolveUniversePlanetHrefs(true);
    assert.equal(signedIn.studio, "/studio");
    assert.equal(signedIn.library, "/library");
  });

  it("public headline key differs from signed-in", () => {
    assert.equal(resolveUniversePublicHeadlineKey(false), "universe.hero.welcomeSignedOut");
    assert.equal(resolveUniversePublicHeadlineKey(true), "universe.welcome.signedInHeadline");
  });

  it("signed-out welcome messages exclude personal greeting", () => {
    const msgs = resolveUniverseWelcomeMessagesPublic("sergio@homecheff.eu", false);
    assert.deepEqual(msgs, ["universe.hero.welcomeSignedOut"]);
  });

  it("signed-in welcome messages include personal greeting", () => {
    const msgs = resolveUniverseWelcomeMessagesPublic("sergio@homecheff.eu", true);
    assert.equal(msgs[0], "universe.welcome.back");
  });

  it("planet labels are uppercase without hover", () => {
    assert.equal(resolveUniversePlanetLabel("editor"), "BEELDEN");
    assert.equal(resolveUniversePlanetLabel("motion"), "ANIMATIE");
  });

  it("SP.3: suite nav product links stay on public landings when signed out", () => {
    assert.equal(resolveSuiteNavHref("/editor", false, "editor"), "/editor");
    assert.equal(resolveSuiteNavHref("/maak", false, "editor"), "/");
    assert.equal(resolveSuiteNavHref("/editor", true, "editor"), "/editor");
    assert.equal(resolveSuiteNavHref("/animate/instant", false, "motion"), "/motion");
  });

  it("SP.3: primary CTA is guided creation, not Editor", () => {
    assert.equal(resolveUniversePrimaryCtaHref(false), UNIVERSE_GUIDED_CREATION_PATH);
    assert.equal(resolveUniversePrimaryCtaHref(true), UNIVERSE_GUIDED_CREATION_PATH);
    assert.equal(resolveUniversePrimaryCtaKey(false), "universe.hero.cta.startWithIdea");
    assert.equal(resolveUniversePrimaryCtaKey(true), "universe.hero.cta.startWithIdea");
    assert.equal(resolveUniverseSecondaryCtaHref(false), UNIVERSE_WHY_STUDIO_PATH);
    assert.equal(resolveUniverseSecondaryCtaKey(false), "universe.hero.cta.howItWorks");
  });

  it("private non-discovery hrefs still login-gate when needed", () => {
    assert.equal(
      resolveSuiteNavHref("/studio/start", false, "studio"),
      "/studio",
    );
    assert.match(loginHref("/projects"), /\/login/);
  });
});
