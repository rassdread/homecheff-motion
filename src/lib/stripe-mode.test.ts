import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPriceLivemodeMatchesKey,
  isStripeCheckoutSessionIdMatchingMode,
  resolveStripeSecretKeyMode,
} from "@/lib/stripe-mode";

describe("stripe mode isolation", () => {
  it("classifies live/test/restricted keys", () => {
    assert.equal(resolveStripeSecretKeyMode("sk_live_x"), "live");
    assert.equal(resolveStripeSecretKeyMode("sk_test_x"), "test");
    assert.equal(resolveStripeSecretKeyMode("rkcs_test_x"), "test");
    assert.equal(resolveStripeSecretKeyMode(""), "missing");
  });

  it("matches checkout session prefixes", () => {
    assert.equal(isStripeCheckoutSessionIdMatchingMode("cs_test_abc", "test"), true);
    assert.equal(isStripeCheckoutSessionIdMatchingMode("cs_live_abc", "test"), false);
    assert.equal(isStripeCheckoutSessionIdMatchingMode("cs_live_abc", "live"), true);
  });

  it("fail-closes mixed price/key modes", () => {
    assert.throws(() =>
      assertPriceLivemodeMatchesKey({ priceId: "price_x", priceLivemode: true, keyMode: "test" })
    );
    assert.doesNotThrow(() =>
      assertPriceLivemodeMatchesKey({ priceId: "price_x", priceLivemode: false, keyMode: "test" })
    );
  });
});
