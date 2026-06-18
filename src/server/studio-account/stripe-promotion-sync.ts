import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe-server";
import {
  isStripeDiscountBenefitType,
  parseAllowedPlanSlugs,
  type DiscountDuration,
} from "@/lib/studio-promotion-validation";
import type { PromotionBenefitType } from "@/types/studio-billing";

export function isStripePromotionSyncAvailable(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

type PromotionStripeSource = {
  id: string;
  slug: string;
  benefitType: string;
  percentageDiscount: number | null;
  fixedDiscountEur: number | null;
  subscriptionDiscountPercent: number | null;
  discountDuration: string;
  discountDurationMonths: number | null;
  maxRedemptions: number | null;
  maximumUsers: number;
  endDate: Date | null;
  allowedPlanSlugs: unknown;
  appliesToMonthly: boolean;
  appliesToYearly: boolean;
  stripeCouponId: string | null;
};

function maxRedemptions(promotion: PromotionStripeSource): number | undefined {
  const slots = promotion.maxRedemptions ?? promotion.maximumUsers;
  return slots > 0 ? slots : undefined;
}

export function buildStripeCouponCreateParams(
  promotion: PromotionStripeSource
): Stripe.CouponCreateParams {
  return buildCouponParams(promotion);
}

function buildCouponParams(promotion: PromotionStripeSource): Stripe.CouponCreateParams {
  const benefitType = promotion.benefitType as PromotionBenefitType;
  const duration = promotion.discountDuration as DiscountDuration;
  const allowedPlans = parseAllowedPlanSlugs(promotion.allowedPlanSlugs);

  const params: Stripe.CouponCreateParams = {
    duration,
    metadata: {
      homecheffPromotionId: promotion.id,
      promotionSlug: promotion.slug,
      allowedPlans: allowedPlans.join(",") || "all",
      appliesToMonthly: String(promotion.appliesToMonthly),
      appliesToYearly: String(promotion.appliesToYearly),
    },
  };

  if (benefitType === "percentage_discount") {
    params.percent_off = promotion.percentageDiscount ?? 0;
  } else if (benefitType === "subscription_discount") {
    params.percent_off = promotion.subscriptionDiscountPercent ?? 0;
  } else if (benefitType === "fixed_discount") {
    params.amount_off = Math.round((promotion.fixedDiscountEur ?? 0) * 100);
    params.currency = "eur";
  }

  if (duration === "repeating" && promotion.discountDurationMonths) {
    params.duration_in_months = promotion.discountDurationMonths;
  }

  const max = maxRedemptions(promotion);
  if (max) params.max_redemptions = max;
  if (promotion.endDate) params.redeem_by = Math.floor(promotion.endDate.getTime() / 1000);

  return params;
}

export async function ensureStripeCouponForPromotion(
  promotion: PromotionStripeSource
): Promise<string | null> {
  if (!isStripePromotionSyncAvailable()) return null;
  if (!isStripeDiscountBenefitType(promotion.benefitType as PromotionBenefitType)) return null;

  const stripe = getStripeClient();

  if (promotion.stripeCouponId) {
    try {
      await stripe.coupons.retrieve(promotion.stripeCouponId);
      return promotion.stripeCouponId;
    } catch {
      // recreate below
    }
  }

  const coupon = await stripe.coupons.create(buildCouponParams(promotion));
  return coupon.id;
}

export async function createStripePromotionCode(input: {
  code: string;
  couponId: string;
  promotionId: string;
  promotionSlug: string;
  maxUses: number | null;
  endDate: Date | null;
  active: boolean;
}): Promise<string | null> {
  if (!isStripePromotionSyncAvailable()) return null;

  const stripe = getStripeClient();
  const promo = await stripe.promotionCodes.create({
    coupon: input.couponId,
    code: input.code.trim().toUpperCase(),
    active: input.active,
    max_redemptions: input.maxUses ?? undefined,
    expires_at: input.endDate ? Math.floor(input.endDate.getTime() / 1000) : undefined,
    metadata: {
      homecheffPromotionId: input.promotionId,
      promotionSlug: input.promotionSlug,
    },
  });
  return promo.id;
}

export async function setStripePromotionCodeActive(
  stripePromotionCodeId: string,
  active: boolean
): Promise<void> {
  if (!isStripePromotionSyncAvailable()) return;
  const stripe = getStripeClient();
  await stripe.promotionCodes.update(stripePromotionCodeId, { active });
}

export async function syncPromotionDisableToStripe(input: {
  stripeCouponId: string | null;
  promoCodes: Array<{ stripePromotionCodeId: string | null }>;
}): Promise<void> {
  if (!isStripePromotionSyncAvailable()) return;
  for (const row of input.promoCodes) {
    if (row.stripePromotionCodeId) {
      await setStripePromotionCodeActive(row.stripePromotionCodeId, false);
    }
  }
}
