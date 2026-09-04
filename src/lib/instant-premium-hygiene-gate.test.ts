import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";

describe("Instant Premium production hygiene gate", () => {
  it("defaults to test unless INSTANT_PREMIUM_MODE=paid", () => {
    const prev = process.env.INSTANT_PREMIUM_MODE;
    try {
      delete process.env.INSTANT_PREMIUM_MODE;
      assert.equal(getInstantPremiumMode(), "test");
      process.env.INSTANT_PREMIUM_MODE = "test";
      assert.equal(getInstantPremiumMode(), "test");
      process.env.INSTANT_PREMIUM_MODE = "paid";
      assert.equal(getInstantPremiumMode(), "paid");
      process.env.INSTANT_PREMIUM_MODE = "something-else";
      assert.equal(getInstantPremiumMode(), "test");
    } finally {
      if (prev === undefined) delete process.env.INSTANT_PREMIUM_MODE;
      else process.env.INSTANT_PREMIUM_MODE = prev;
    }
  });

  it("create-and-generate blocks non-admin in test mode before jobs start", () => {
    const route = readFileSync(
      new URL("../app/api/instant-premium/create-and-generate/route.ts", import.meta.url),
      "utf8"
    );
    const postBody = route.slice(route.indexOf("export async function POST"));
    assert.match(postBody, /mode === "test" && user\.role !== "admin"/);
    assert.match(postBody, /FEATURE_NOT_AVAILABLE/);
    assert.match(postBody, /status: 403/);
    // Gate must run before credit capture / job start inside the handler.
    const gateIdx = postBody.indexOf("FEATURE_NOT_AVAILABLE");
    const jobsIdx = postBody.indexOf("await startProjectJobs");
    const captureIdx = postBody.indexOf("await captureStudioActionReservation");
    assert.ok(gateIdx > 0);
    assert.ok(jobsIdx > gateIdx, "provider jobs must not start before hygiene gate");
    assert.ok(captureIdx > gateIdx, "credit capture must not run before hygiene gate");
  });

  it("customer Instant UI uses coming-soon CTA while paid mode is not certified", () => {
    const page = readFileSync(
      new URL("../app/animate/instant/page.tsx", import.meta.url),
      "utf8"
    );
    assert.match(page, /instantCustomerCheckoutReady = premiumMode === "paid"/);
    assert.match(page, /instant\.step7\.ctaComingSoon/);
    assert.match(page, /\(!isAdmin && !instantCustomerCheckoutReady\)/);
    assert.match(page, /usesFreeGeneration = isAdmin/);
  });

  it("NL customer copy is professional coming-soon, not public testmodus CTA", () => {
    const nl = readFileSync(new URL("../i18n/locales/nl.ts", import.meta.url), "utf8");
    assert.match(nl, /"instant\.step7\.ctaComingSoon": "Binnenkort beschikbaar"/);
    // Admin-only test CTA may remain in catalog, but customer path must not use it.
    assert.match(nl, /"instant\.step7\.ctaTest":/);
    const page = readFileSync(
      new URL("../app/animate/instant/page.tsx", import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(page, /t\("instant\.step7\.ctaTest"\)/);
  });
});
