import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginHref } from "@/lib/auth-login-href";
import {
  UNIVERSE_GLOBE_SPHERICAL_CLASS,
  resolveSuiteNavHref,
  resolveUniversePlanetHref,
  resolveUniversePlanetHrefs,
  resolveUniversePlanetLabel,
  resolveUniversePrimaryCtaHref,
  resolveUniversePublicHeadlineKey,
  resolveUniverseWelcomeMessagesPublic,
} from "@/lib/universe-public-landing";

describe("universe v3 public landing", () => {
  it("globe uses spherical class token", () => {
    assert.equal(UNIVERSE_GLOBE_SPHERICAL_CLASS, "universe-globe-spherical");
  });

  it("routes signed-out planet clicks to login with next", () => {
    assert.equal(resolveUniversePlanetHref("/editor", false), loginHref("/editor"));
    assert.equal(resolveUniversePlanetHref("/editor", true), "/editor");
  });

  it("builds all planet hrefs auth-aware", () => {
    const signedOut = resolveUniversePlanetHrefs(false);
    assert.match(signedOut.editor, /\/login\?next=/);
    assert.match(signedOut.motion, /\/login\?next=/);
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
    assert.equal(resolveUniversePlanetLabel("editor"), "EDITOR");
    assert.equal(resolveUniversePlanetLabel("motion"), "MOTION");
  });

  it("suite nav product links require auth when signed out", () => {
    assert.equal(resolveSuiteNavHref("/editor", false, "editor"), loginHref("/editor"));
    assert.equal(resolveSuiteNavHref("/maak", false, "editor"), "/");
    assert.equal(resolveSuiteNavHref("/editor", true, "editor"), "/editor");
  });

  it("primary CTA routes to login when signed out", () => {
    assert.equal(resolveUniversePrimaryCtaHref(false), loginHref("/editor"));
    assert.equal(resolveUniversePrimaryCtaHref(true), "/editor");
  });
});
