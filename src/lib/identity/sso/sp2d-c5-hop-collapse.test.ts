/**
 * SP.2D-C5 — Studio SSO hop-collapse + ecosystem deep-link regressions.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ecosystemProductById } from "@/lib/ecosystem-navigation/contract";
import {
  canAttemptSilentSso,
  STUDIO_SILENT_SSO_ATTEMPT_COOKIE,
  STUDIO_SKIP_SILENT_SSO_COOKIE,
} from "@/lib/identity/sso/silent-guard";

describe("SP.2D-C5 Studio SSO hop collapse", () => {
  it("silent route collapses to beginHomeCheffSso — no local start hop", () => {
    const src = readFileSync("src/app/auth/sso/silent/route.ts", "utf8");
    assert.match(src, /beginHomeCheffSsoRedirect/);
    assert.match(src, /mode=ecosystem|ecosystemMode/);
    assert.doesNotMatch(src, /new URL\("\/auth\/sso\/start"/);
  });

  it("start route reuses shared begin helper", () => {
    const src = readFileSync("src/app/auth/sso/start/route.ts", "utf8");
    assert.match(src, /beginHomeCheffSsoRedirect|mintStudioHomeCheffSsoBegin/);
    assert.doesNotMatch(src, /generateCodeVerifier/);
  });

  it("Ontdek Studio deep-links ecosystem silent", () => {
    const studio = ecosystemProductById("studio");
    assert.equal(
      studio.href,
      "https://studio.homecheff.eu/auth/sso/silent?mode=ecosystem&returnTo=%2F",
    );
    assert.doesNotMatch(studio.href, /email=|token=|userId=/i);
  });

  it("loop protection: attempt or skip cookies block silent", () => {
    assert.equal(canAttemptSilentSso(""), true);
    assert.equal(canAttemptSilentSso(`${STUDIO_SILENT_SSO_ATTEMPT_COOKIE}=1`), false);
    assert.equal(canAttemptSilentSso(`${STUDIO_SKIP_SILENT_SSO_COOKIE}=1`), false);
  });
});
