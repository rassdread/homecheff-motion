import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateInstantPremiumPriceCents,
  estimateInstantPremiumPriceEur,
  formatInstantPremiumPriceEur,
} from "@/lib/instant-premium-pricing";

describe("instant-premium-pricing", () => {
  it("maps image tiers to EUR prices", () => {
    assert.equal(estimateInstantPremiumPriceEur(2), 0.49);
    assert.equal(estimateInstantPremiumPriceEur(3), 0.99);
    assert.equal(estimateInstantPremiumPriceEur(4), 1.49);
    assert.equal(estimateInstantPremiumPriceEur(5), 1.99);
    assert.equal(estimateInstantPremiumPriceEur(6), 2.49);
  });

  it("converts to cents for Stripe", () => {
    assert.equal(estimateInstantPremiumPriceCents(2), 49);
    assert.equal(estimateInstantPremiumPriceCents(3), 99);
  });

  it("formats nl price labels", () => {
    assert.equal(formatInstantPremiumPriceEur(2, "nl"), "€0,49");
    assert.equal(formatInstantPremiumPriceEur(3, "en"), "€0.99");
  });
});
