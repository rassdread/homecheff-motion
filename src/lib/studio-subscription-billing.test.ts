import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SUBSCRIPTION_YEARLY_SAVINGS_PERCENT,
  computeSubscriptionYearlySavingsPercent,
  officialYearlySavingsPercent,
  resolvePlanYearlyPriceEur,
} from "@/lib/studio-subscription-billing";

describe("studio-subscription-billing", () => {
  it("official plans round to 17% yearly savings", () => {
    assert.equal(officialYearlySavingsPercent("creator"), 17);
    assert.equal(officialYearlySavingsPercent("pro"), 17);
    assert.equal(officialYearlySavingsPercent("studio"), 17);
    assert.equal(SUBSCRIPTION_YEARLY_SAVINGS_PERCENT, 17);
  });

  it("resolvePlanYearlyPriceEur prefers explicit yearly price", () => {
    assert.equal(resolvePlanYearlyPriceEur(7.99, 79.9), 79.9);
    assert.equal(resolvePlanYearlyPriceEur(7.99, null), 79.9);
  });

  it("computeSubscriptionYearlySavingsPercent", () => {
    assert.equal(computeSubscriptionYearlySavingsPercent(7.99, 79.9), 17);
  });
});
