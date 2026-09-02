import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STUDIO_PLAN_DISPLAY } from "@/lib/studio-account-display-config";
import { STUDIO_NL_TARGET_CATALOG } from "@/lib/studio-nl-b2c-catalog";
import {
  OFFICIAL_SUBSCRIPTION_MONTHLY_EUR,
  OFFICIAL_SUBSCRIPTION_YEARLY_EUR,
  PAID_STUDIO_PLAN_IDS,
} from "@/lib/studio-subscription-prices";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

const LEGACY_SUBSCRIPTION_PRICES = [19, 49, 99];

describe("official subscription prices", () => {
  it("defines Creator, Pro and Studio monthly EUR prices", () => {
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.creator, 7.99);
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.pro, 24.99);
    assert.equal(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR.studio, 79.99);
  });

  it("yearly prices are 10× monthly", () => {
    for (const id of PAID_STUDIO_PLAN_IDS) {
      assert.equal(
        OFFICIAL_SUBSCRIPTION_YEARLY_EUR[id],
        Math.round(OFFICIAL_SUBSCRIPTION_MONTHLY_EUR[id] * 10 * 100) / 100
      );
    }
  });

  it("STUDIO_PLANS uses official monthly prices", () => {
    for (const id of PAID_STUDIO_PLAN_IDS) {
      assert.equal(STUDIO_PLANS[id].monthlyPriceEur, OFFICIAL_SUBSCRIPTION_MONTHLY_EUR[id]);
    }
  });

  it("client display config matches customer-facing NL B2C catalog", () => {
    for (const row of STUDIO_PLAN_DISPLAY) {
      const target = STUDIO_NL_TARGET_CATALOG[row.id as keyof typeof STUDIO_NL_TARGET_CATALOG];
      assert.equal(row.monthlyPriceEur, target.grossConsumerPriceEur);
      assert.equal(row.monthlyCredits, target.monthlyHcGrant);
    }
  });

  it("runtime sources do not reference legacy €19/€49/€99 subscription prices", () => {
    const paths = [
      "src/server/studio-account/studio-plan-config.ts",
      "src/lib/studio-account-display-config.ts",
      "src/components/account/studio-billing-panel.tsx",
      "src/server/admin/studio-profitability.ts",
    ];
    for (const path of paths) {
      const source = readFileSync(path, "utf8");
      for (const legacy of LEGACY_SUBSCRIPTION_PRICES) {
        assert.doesNotMatch(
          source,
          new RegExp(`monthlyPriceEur:\\s*${legacy}\\b`),
          `${path} must not hardcode monthlyPriceEur: ${legacy}`
        );
      }
    }
  });
});
