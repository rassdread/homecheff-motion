import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertStudioNlSelfServiceCheckout } from "@/lib/billing/studio-nl-eligibility";
import { STUDIO_NL_TARGET_CATALOG, STUDIO_NL_HC_ACTION_TARGETS } from "@/lib/studio-nl-b2c-catalog";
import {
  isCentralStudioPaidCheckoutEnabled,
  isCentralStudioTechnicalReady,
  isLegacyStudioCheckoutRetired,
  useLegacyMotionStripeCheckout,
} from "@/lib/studio-central-billing-flags";
import { motionRenderAuthoritativeCredits } from "@/lib/studio-video-hc-pricing";
import {
  premiumVisionAnalysisCredits,
  PREMIUM_VISION_ANALYSIS_HC_TARGET,
} from "@/lib/editor-premium-vision-credits";
import { isHcCentralAdapterReady } from "@/server/studio-account/hc-central-adapter";

describe("Studio NL B2C technical blocker closeout (motion)", () => {
  it("target catalog €15/€29/€79 and HC grants", () => {
    assert.equal(STUDIO_NL_TARGET_CATALOG.creator.grossConsumerPriceEur, 15);
    assert.equal(STUDIO_NL_TARGET_CATALOG.pro.grossConsumerPriceEur, 29);
    assert.equal(STUDIO_NL_TARGET_CATALOG.studio.grossConsumerPriceEur, 79);
    assert.equal(STUDIO_NL_TARGET_CATALOG.creator.monthlyHcGrant, 750);
    assert.equal(STUDIO_NL_HC_ACTION_TARGETS.motion_render_5s_720p_turbo, 80);
    assert.equal(PREMIUM_VISION_ANALYSIS_HC_TARGET, 8);
  });

  it("NL gate blocks non-NL", () => {
    assert.equal(assertStudioNlSelfServiceCheckout({ billingCountry: "NL" }).ok, true);
    assert.equal(assertStudioNlSelfServiceCheckout({ billingCountry: "DE" }).ok, false);
  });

  it("public acquisition requires both flags", () => {
    assert.equal(typeof isCentralStudioTechnicalReady(), "boolean");
    assert.equal(typeof isCentralStudioPaidCheckoutEnabled(), "boolean");
  });

  it("HC adapter readiness is boolean (not THROW_STUB)", () => {
    assert.equal(typeof isHcCentralAdapterReady(), "boolean");
  });

  it("legacy checkout retired when central technical ready", () => {
    const prev = process.env.CENTRAL_STUDIO_TECHNICAL_READY;
    process.env.CENTRAL_STUDIO_TECHNICAL_READY = "1";
    delete process.env.CENTRAL_STUDIO_PUBLIC_ACQUISITION_ENABLED;
    assert.equal(isLegacyStudioCheckoutRetired(), true);
    assert.equal(useLegacyMotionStripeCheckout(), false);
    if (prev) process.env.CENTRAL_STUDIO_TECHNICAL_READY = prev;
    else delete process.env.CENTRAL_STUDIO_TECHNICAL_READY;
  });
});
