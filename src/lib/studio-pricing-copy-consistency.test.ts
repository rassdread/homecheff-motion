import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CUSTOMER_FACING_STUDIO_PLANS,
  LOWEST_PAID_SUBSCRIPTION_MONTHLY_EUR,
} from "@/lib/studio-customer-facing-pricing";

const ROOT = join(import.meta.dirname, "..", "..");

const CUSTOMER_FACING_PATHS = [
  "src/lib/studio-account-display-config.ts",
  "src/components/billing/conversion-surface.tsx",
  "src/i18n/locales/nl.ts",
  "src/i18n/locales/en.ts",
  "src/lib/studio-public-faq.ts",
  "src/app/terms/page.tsx",
];

const LEGACY_SUBSCRIPTION_PRICE_PATTERNS = [
  /€7[,.]99/,
  /€24[,.]99/,
  /€79[,.]99/,
  /7\.99\/mo/,
  /24\.99\/mo/,
  /79\.99\/mo/,
];

const MISLEADING_LOW_PRICE_PATTERNS = [/€4[,.]95/, /vanaf €4[,.]9/, /Credits vanaf €/, /Credits from €/];

describe("studio pricing copy consistency", () => {
  it("customer-facing catalog matches certified €15/€29/€79 + HC grants", () => {
    assert.equal(LOWEST_PAID_SUBSCRIPTION_MONTHLY_EUR, 15);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.creator.grossConsumerPriceEur, 15);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.creator.monthlyHcGrant, 750);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.pro.grossConsumerPriceEur, 29);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.pro.monthlyHcGrant, 1500);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.studio.grossConsumerPriceEur, 79);
    assert.equal(CUSTOMER_FACING_STUDIO_PLANS.studio.monthlyHcGrant, 4000);
  });

  it("customer-facing sources do not advertise legacy subscription prices", () => {
    for (const rel of CUSTOMER_FACING_PATHS) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      for (const pattern of LEGACY_SUBSCRIPTION_PRICE_PATTERNS) {
        assert.doesNotMatch(
          source,
          pattern,
          `${rel} must not contain legacy subscription price ${pattern}`
        );
      }
    }
  });

  it("guest conversion surfaces do not imply credit-pack entry prices", () => {
    for (const rel of [
      "src/components/billing/conversion-surface.tsx",
      "src/i18n/locales/nl.ts",
      "src/i18n/locales/en.ts",
    ]) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      for (const pattern of MISLEADING_LOW_PRICE_PATTERNS) {
        assert.doesNotMatch(source, pattern, `${rel} must not contain ${pattern}`);
      }
    }
  });
});
