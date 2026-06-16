import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPlanCreditDiscount,
  resolveRegistryActionCreditCost,
} from "@/lib/studio-billing-sync";
import { computePromoBenefits } from "@/server/studio-account/studio-promo-code-service";
import { mapPromotionGrantToOrigin } from "@/server/studio-account/studio-promotion-service";
import { creditsNeverExpire } from "@/server/studio-account/studio-billing-policy-service";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";
import { STUDIO_CREDIT_PACKS } from "@/server/studio-account/studio-credit-packs";

describe("studio billing phase 9-16", () => {
  it("fallback plan config still available when DB empty", () => {
    assert.equal(STUDIO_PLANS.creator.monthlyCredits, 0);
    assert.ok(STUDIO_PLANS.creator.creditDiscountPercent > 0);
  });

  it("fallback credit packs define four tiers", () => {
    assert.equal(STUDIO_CREDIT_PACKS.length, 4);
  });

  it("percentage discount reduces checkout price", () => {
    const benefits = computePromoBenefits({
      benefitType: "percentage_discount",
      basePriceEur: 19.99,
      promotion: {
        creditAmount: 0,
        percentageDiscount: 10,
        fixedDiscountEur: null,
        subscriptionDiscountPercent: null,
        creditPackBonusPercent: null,
        freeTrialCredits: null,
      },
    });
    assert.equal(benefits.discountPercent, 10);
    assert.ok(benefits.adjustedPriceEur != null && benefits.adjustedPriceEur < 19.99);
  });

  it("fixed discount cannot go below zero", () => {
    const benefits = computePromoBenefits({
      benefitType: "fixed_discount",
      basePriceEur: 5,
      promotion: {
        creditAmount: 0,
        percentageDiscount: null,
        fixedDiscountEur: 10,
        subscriptionDiscountPercent: null,
        creditPackBonusPercent: null,
        freeTrialCredits: null,
      },
    });
    assert.equal(benefits.adjustedPriceEur, 0);
  });

  it("credit pack bonus calculates extra credits", () => {
    const benefits = computePromoBenefits({
      benefitType: "credit_pack_bonus",
      basePriceEur: 9.99,
      pack: {
        id: "p1",
        slug: "pack_1250",
        name: "Medium",
        credits: 1250,
        priceEur: 9.99,
        bonusCredits: 0,
        active: true,
        displayOrder: 2,
        stripePriceId: null,
        source: "fallback",
      },
      promotion: {
        creditAmount: 0,
        percentageDiscount: null,
        fixedDiscountEur: null,
        subscriptionDiscountPercent: null,
        creditPackBonusPercent: 20,
        freeTrialCredits: null,
      },
    });
    assert.equal(benefits.bonusCredits, 250);
  });

  it("subscription discount returns percent not price mutation", () => {
    const benefits = computePromoBenefits({
      benefitType: "subscription_discount",
      basePriceEur: 49,
      promotion: {
        creditAmount: 0,
        percentageDiscount: null,
        fixedDiscountEur: null,
        subscriptionDiscountPercent: 15,
        creditPackBonusPercent: null,
        freeTrialCredits: null,
      },
    });
    assert.equal(benefits.subscriptionDiscountPercent, 15);
  });

  it("registry pricing fallback applies plan discount", () => {
    const resolved = resolveRegistryActionCreditCost({
      actionType: "motion_render",
      planId: "studio",
    });
    assert.ok(resolved);
    const undiscounted = resolveRegistryActionCreditCost({
      actionType: "motion_render",
      planId: "free",
    });
    assert.ok(undiscounted);
    assert.ok(resolved!.creditCost <= undiscounted!.creditCost);
  });

  it("plan discount helper matches subscription benefits", () => {
    const base = 100;
    const discounted = applyPlanCreditDiscount(base, STUDIO_PLANS.pro.creditDiscountPercent);
    assert.equal(discounted, 85);
  });

  it("carry policy unlimited still default for campaigns", () => {
    assert.equal(creditsNeverExpire("UNLIMITED"), true);
  });

  it("promotion grant origins map for admin grants", () => {
    assert.equal(mapPromotionGrantToOrigin("BETA"), "BETA");
    assert.equal(mapPromotionGrantToOrigin("REFERRAL"), "REFERRAL");
  });
});
