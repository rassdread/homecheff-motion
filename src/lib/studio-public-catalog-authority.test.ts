/**
 * Public /api/billing/catalog must expose CURRENT NL B2C plans only in plans[].
 * Legacy €7.99/€24.99/€79.99 may appear only under legacyPlans[].
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STUDIO_NL_TARGET_CATALOG } from "@/lib/studio-nl-b2c-catalog";
import { OFFICIAL_SUBSCRIPTION_MONTHLY_EUR } from "@/lib/studio-subscription-prices";

const LEGACY_PRICES = new Set(
  Object.values(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR).map((n) => Number(n)),
);

describe("studio public catalog authority", () => {
  it("CURRENT catalog is 15/900, 29/1800, 79/5000", () => {
    assert.equal(STUDIO_NL_TARGET_CATALOG.creator.grossConsumerPriceEur, 15);
    assert.equal(STUDIO_NL_TARGET_CATALOG.creator.monthlyHcGrant, 900);
    assert.equal(STUDIO_NL_TARGET_CATALOG.pro.grossConsumerPriceEur, 29);
    assert.equal(STUDIO_NL_TARGET_CATALOG.pro.monthlyHcGrant, 1800);
    assert.equal(STUDIO_NL_TARGET_CATALOG.studio.grossConsumerPriceEur, 79);
    assert.equal(STUDIO_NL_TARGET_CATALOG.studio.monthlyHcGrant, 5000);
  });

  it("legacy list prices remain distinct historical values", () => {
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.creator, 7.99);
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.pro, 24.99);
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.studio, 79.99);
    for (const plan of Object.values(STUDIO_NL_TARGET_CATALOG)) {
      assert.ok(!LEGACY_PRICES.has(plan.grossConsumerPriceEur));
    }
  });
});
