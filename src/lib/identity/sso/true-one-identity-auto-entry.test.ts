/**
 * Studio true one-identity auto-entry wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Studio true one-identity auto-entry", () => {
  it("homepage uses epoch-gated hydrate", () => {
    const page = readFileSync("src/app/page.tsx", "utf8");
    assert.match(page, /maybeSilentHydrateWhenEcosystemSessionLikely/);
    assert.doesNotMatch(page, /maybeSilentHydratePublicStudio\(/);
  });

  it("StudioAuthGate uses ecosystem silent mode and opening copy", () => {
    const gate = readFileSync("src/components/studio/studio-auth-gate.tsx", "utf8");
    assert.match(gate, /mode=ecosystem/);
    assert.match(gate, /HomeCheff-account wordt geopend/);
  });

  it("deep-link first visit does not force welcome over returnTo", () => {
    const cb = readFileSync("src/app/auth/sso/callback/route.ts", "utf8");
    assert.match(cb, /firstProductVisit/);
    assert.match(cb, /nextPath === "\/"/);
  });
});
