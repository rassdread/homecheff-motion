import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPromotionPreviewSentence,
  buildPromotionPricePreviews,
} from "@/lib/studio-promotion-preview";
import {
  isStripeDiscountBenefitType,
  planTargetToFields,
  validatePromotionForm,
} from "@/lib/studio-promotion-validation";
import { buildStripeCouponCreateParams } from "@/server/studio-account/stripe-promotion-sync";
import {
  billingIntervalAllowedForCheckout,
  planAllowedForCheckout,
} from "@/server/studio-account/studio-promo-code-service";

describe("studio stripe promotion", () => {
  it("percentage once coupon params", () => {
    const params = buildStripeCouponCreateParams({
      id: "promo-1",
      slug: "early20",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      fixedDiscountEur: null,
      subscriptionDiscountPercent: null,
      discountDuration: "once",
      discountDurationMonths: null,
      maxRedemptions: 100,
      maximumUsers: 0,
      endDate: null,
      allowedPlanSlugs: ["pro"],
      appliesToMonthly: true,
      appliesToYearly: true,
      stripeCouponId: null,
    });
    assert.equal(params.percent_off, 20);
    assert.equal(params.duration, "once");
    assert.equal(params.metadata?.allowedPlans, "pro");
    assert.equal(params.duration_in_months, undefined);
  });

  it("percentage repeating 3 months coupon params", () => {
    const params = buildStripeCouponCreateParams({
      id: "promo-2",
      slug: "promo3m",
      benefitType: "percentage_discount",
      percentageDiscount: 15,
      fixedDiscountEur: null,
      subscriptionDiscountPercent: null,
      discountDuration: "repeating",
      discountDurationMonths: 3,
      maxRedemptions: null,
      maximumUsers: 0,
      endDate: null,
      allowedPlanSlugs: [],
      appliesToMonthly: true,
      appliesToYearly: false,
      stripeCouponId: null,
    });
    assert.equal(params.duration, "repeating");
    assert.equal(params.duration_in_months, 3);
    assert.equal(params.metadata?.appliesToYearly, "false");
  });

  it("forever coupon params", () => {
    const params = buildStripeCouponCreateParams({
      id: "promo-3",
      slug: "vip",
      benefitType: "percentage_discount",
      percentageDiscount: 10,
      fixedDiscountEur: null,
      subscriptionDiscountPercent: null,
      discountDuration: "forever",
      discountDurationMonths: null,
      maxRedemptions: null,
      maximumUsers: 0,
      endDate: null,
      allowedPlanSlugs: [],
      appliesToMonthly: true,
      appliesToYearly: true,
      stripeCouponId: null,
    });
    assert.equal(params.duration, "forever");
  });

  it("fixed amount coupon params", () => {
    const params = buildStripeCouponCreateParams({
      id: "promo-4",
      slug: "eur5",
      benefitType: "fixed_discount",
      percentageDiscount: null,
      fixedDiscountEur: 5,
      subscriptionDiscountPercent: null,
      discountDuration: "once",
      discountDurationMonths: null,
      maxRedemptions: 50,
      maximumUsers: 0,
      endDate: null,
      allowedPlanSlugs: ["creator"],
      appliesToMonthly: true,
      appliesToYearly: true,
      stripeCouponId: null,
    });
    assert.equal(params.amount_off, 500);
    assert.equal(params.currency, "eur");
  });

  it("bonus credits do not require stripe coupon", () => {
    assert.equal(isStripeDiscountBenefitType("bonus_credits"), false);
    assert.equal(isStripeDiscountBenefitType("percentage_discount"), true);
  });

  it("rejects percentage out of range", () => {
    const errors = validatePromotionForm({
      name: "Test",
      slug: "test",
      code: "TEST",
      benefitType: "percentage_discount",
      percentageDiscount: 0,
    });
    assert.ok(errors.includes("percentage_out_of_range"));
  });

  it("rejects repeating without months", () => {
    const errors = validatePromotionForm({
      name: "Test",
      slug: "test",
      code: "TEST",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      discountDuration: "repeating",
    });
    assert.ok(errors.includes("repeating_requires_months"));
  });

  it("rejects end date before start date", () => {
    const errors = validatePromotionForm({
      name: "Test",
      slug: "test",
      code: "TEST",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      startDate: "2026-12-01T00:00:00.000Z",
      endDate: "2026-01-01T00:00:00.000Z",
    });
    assert.ok(errors.includes("end_before_start"));
  });

  it("plan target maps creator only", () => {
    const fields = planTargetToFields("creator");
    assert.deepEqual(fields.allowedPlanSlugs, ["creator"]);
    assert.equal(fields.specificPlanSlug, "creator");
  });

  it("preview sentence for percentage pro 3 months", () => {
    const sentence = buildPromotionPreviewSentence({
      code: "PROMO20",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      discountDuration: "repeating",
      discountDurationMonths: 3,
      specificPlanSlug: "pro",
      appliesToMonthly: true,
      appliesToYearly: true,
    });
    assert.match(sentence, /PROMO20/);
    assert.match(sentence, /20%/);
    assert.match(sentence, /3 maanden/);
    assert.match(sentence, /Pro/);
  });

  it("price preview shows pro monthly discount", () => {
    const rows = buildPromotionPricePreviews({
      code: "PROMO20",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      specificPlanSlug: "pro",
      appliesToMonthly: true,
      appliesToYearly: false,
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.baseEur, 24.99);
    assert.equal(rows[0]?.discountedEur, 19.99);
  });

  it("price preview yearly pro discount", () => {
    const rows = buildPromotionPricePreviews({
      code: "PROMO20",
      benefitType: "percentage_discount",
      percentageDiscount: 20,
      specificPlanSlug: "pro",
      appliesToMonthly: false,
      appliesToYearly: true,
    });
    assert.equal(rows[0]?.interval, "yearly");
    assert.equal(rows[0]?.baseEur, 249.9);
    assert.equal(rows[0]?.discountedEur, 199.92);
  });

  it("checkout validation plan allowed", () => {
    assert.equal(
      planAllowedForCheckout({ specificPlanSlug: "pro", allowedPlanSlugs: [] }, "pro"),
      true
    );
    assert.equal(
      planAllowedForCheckout({ specificPlanSlug: "pro", allowedPlanSlugs: [] }, "creator"),
      false
    );
    assert.equal(
      planAllowedForCheckout({ specificPlanSlug: null, allowedPlanSlugs: ["studio"] }, "studio"),
      true
    );
  });

  it("checkout validation yearly/monthly", () => {
    assert.equal(
      billingIntervalAllowedForCheckout({ appliesToMonthly: false, appliesToYearly: true }, "yearly"),
      true
    );
    assert.equal(
      billingIntervalAllowedForCheckout({ appliesToMonthly: false, appliesToYearly: true }, "monthly"),
      false
    );
  });
});
