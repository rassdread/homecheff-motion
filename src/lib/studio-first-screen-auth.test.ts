import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isStudioPrimaryHomePath } from "@/lib/studio-primary-home";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";

describe("studio first-screen + orbit removal contracts", () => {
  it("primary home path matches exact /studio only", () => {
    assert.equal(isStudioPrimaryHomePath("/studio"), true);
    assert.equal(isStudioPrimaryHomePath("/studio/"), true);
    assert.equal(isStudioPrimaryHomePath("/studio/characters"), false);
    assert.equal(isStudioPrimaryHomePath("/"), false);
  });

  it("unified home collapses shortcuts behind details", () => {
    const source = readFileSync(
      "src/components/studio/studio-unified-home-page.tsx",
      "utf8"
    );
    assert.match(source, /data-testid="studio-home-more"/);
    assert.match(source, /studio\.aiHome\.moreCapabilities/);
    assert.match(source, /data-testid="studio-home-intents"/);
  });

  it("login CTAs prefer interaction=login; select_account only for switch", () => {
    const source = readFileSync("src/components/auth/login-page-content.tsx", "utf8");
    assert.match(source, /intent=google&interaction=login/);
    assert.match(source, /intent=password&interaction=login/);
    assert.match(source, /function startSwitchAccount[\s\S]*interaction=select_account/);
    assert.doesNotMatch(source, /intent=google&interaction=select_account/);
  });

  it("SSO start defaults to login interaction, not forced select_account", () => {
    const source = readFileSync("src/app/auth/sso/start/route.ts", "utf8");
    assert.match(source, /return "login"/);
    assert.doesNotMatch(source, /if \(v === "login" \|\| v === "select_account"\) return "select_account"/);
  });

  it("primary experience no longer mounts orbit widgets", () => {
    const home = readFileSync(
      "src/components/suite/universe/universe-home-page.tsx",
      "utf8"
    );
    const landing = readFileSync(
      "src/components/suite/studio-product-landing-page.tsx",
      "utf8"
    );
    assert.doesNotMatch(home, /UniverseOrbitSystem/);
    assert.doesNotMatch(landing, /UniverseLandingOrbitWidget/);
  });

  it("former planet destinations remain reachable", () => {
    const hrefs = UNIVERSE_PLANETS.map((p) => p.href);
    assert.ok(hrefs.includes("/editor"));
    assert.ok(hrefs.includes("/studio"));
    assert.ok(hrefs.includes("/motion"));
    assert.ok(hrefs.includes("/publish"));
    assert.ok(hrefs.includes("/library"));
    const dest = readFileSync(
      "src/components/suite/universe/universe-destination-links.tsx",
      "utf8"
    );
    assert.match(dest, /UNIVERSE_PLANETS\.map/);
  });
});
