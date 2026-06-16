import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStripeConfigured, isStripeCheckoutAvailable } from "@/server/studio-account/stripe-billing";

describe("stripe billing readiness", () => {
  it("reports not configured when STRIPE_SECRET_KEY missing", async () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(isStripeConfigured(), false);
    assert.equal(await isStripeCheckoutAvailable(), false);
    if (original) {
      process.env.STRIPE_SECRET_KEY = original;
    }
  });
});
