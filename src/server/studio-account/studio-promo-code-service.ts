import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { grantStudioCreditsWithOrigin } from "@/server/studio-account/studio-wallet-service";
import { mapPromotionGrantToOrigin } from "@/server/studio-account/studio-promotion-service";
import type {
  PromoValidationResult,
  PromotionBenefitType,
  StudioPromoCodeSnapshot,
} from "@/types/studio-billing";
import type { StudioCreditPackSnapshot } from "@/types/studio-billing";
import type { StudioSubscriptionPlanSnapshot } from "@/types/studio-billing";
import { totalPackCredits } from "@/server/studio-account/studio-credit-pack-service";
import { parseAllowedPlanSlugs } from "@/lib/studio-promotion-validation";
import { formatPromotionOverviewLine } from "@/lib/studio-promotion-preview";
import { setStripePromotionCodeActive } from "@/server/studio-account/stripe-promotion-sync";
import type { SubscriptionBillingInterval } from "@/lib/studio-subscription-billing";

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

function isWithinWindow(now: Date, start: Date | null, end: Date | null): boolean {
  if (start && now < start) {
    return false;
  }
  if (end && now > end) {
    return false;
  }
  return true;
}

function promotionMaxSlots(promotion: {
  maxRedemptions: number | null;
  maximumUsers: number;
}): number {
  return promotion.maxRedemptions ?? promotion.maximumUsers;
}

export async function listStudioPromoCodes(promotionId?: string): Promise<StudioPromoCodeSnapshot[]> {
  const rows = await prisma.studioPromoCode.findMany({
    where: promotionId ? { promotionId } : undefined,
    include: {
      promotion: {
        select: {
          name: true,
          benefitType: true,
          percentageDiscount: true,
          fixedDiscountEur: true,
          subscriptionDiscountPercent: true,
          discountDuration: true,
          discountDurationMonths: true,
          allowedPlanSlugs: true,
          specificPlanSlug: true,
          appliesToMonthly: true,
          appliesToYearly: true,
          stripeCouponId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    promotionId: row.promotionId,
    promotionName: row.promotion.name,
    active: row.active,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    remainingUses: row.maxUses != null ? Math.max(0, row.maxUses - row.usedCount) : null,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    notes: row.notes,
    stripePromotionCodeId: row.stripePromotionCodeId,
    stripeCouponId: row.promotion.stripeCouponId,
    benefitType: row.promotion.benefitType as PromotionBenefitType,
    overviewLine: formatPromotionOverviewLine({
      code: row.code,
      benefitType: row.promotion.benefitType as PromotionBenefitType,
      percentageDiscount: row.promotion.percentageDiscount,
      fixedDiscountEur: row.promotion.fixedDiscountEur,
      subscriptionDiscountPercent: row.promotion.subscriptionDiscountPercent,
      discountDuration: row.promotion.discountDuration as "once" | "repeating" | "forever",
      discountDurationMonths: row.promotion.discountDurationMonths,
      allowedPlanSlugs: row.promotion.allowedPlanSlugs,
      specificPlanSlug: row.promotion.specificPlanSlug,
      appliesToMonthly: row.promotion.appliesToMonthly,
      appliesToYearly: row.promotion.appliesToYearly,
      usedCount: row.usedCount,
      maxUses: row.maxUses,
      active: row.active,
      stripePromotionCodeId: row.stripePromotionCodeId,
      stripeCouponId: row.promotion.stripeCouponId,
    }),
  }));
}

export async function createStudioPromoCode(input: {
  code: string;
  promotionId: string;
  maxUses?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
  active?: boolean;
}) {
  return prisma.studioPromoCode.create({
    data: {
      code: normalizePromoCode(input.code),
      promotionId: input.promotionId,
      maxUses: input.maxUses ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      notes: input.notes ?? "",
      active: input.active ?? true,
    },
  });
}

export async function bulkCreatePromoCodes(input: {
  promotionId: string;
  prefix: string;
  count: number;
  maxUses?: number | null;
}) {
  const created: string[] = [];
  for (let i = 0; i < input.count; i++) {
    const code = normalizePromoCode(`${input.prefix}${String(i + 1).padStart(4, "0")}`);
    const row = await createStudioPromoCode({
      code,
      promotionId: input.promotionId,
      maxUses: input.maxUses ?? 1,
    });
    created.push(row.code);
  }
  return created;
}

export async function updateStudioPromoCode(
  id: string,
  patch: Partial<{ active: boolean; maxUses: number | null; notes: string }>
) {
  const updated = await prisma.studioPromoCode.update({
    where: { id },
    data: {
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.maxUses !== undefined ? { maxUses: patch.maxUses } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });

  if (patch.active !== undefined && updated.stripePromotionCodeId) {
    await setStripePromotionCodeActive(updated.stripePromotionCodeId, patch.active);
  }

  return updated;
}

export async function getPromoCodeStripeId(code: string): Promise<string | null> {
  const row = await prisma.studioPromoCode.findUnique({
    where: { code: normalizePromoCode(code) },
    select: { stripePromotionCodeId: true, active: true },
  });
  if (!row?.active || !row.stripePromotionCodeId) return null;
  return row.stripePromotionCodeId;
}

export function planAllowedForCheckout(
  promotion: {
    specificPlanSlug: string | null;
    allowedPlanSlugs: unknown;
  },
  planSlug?: string
): boolean {
  if (!planSlug) return true;
  const allowed = parseAllowedPlanSlugs(promotion.allowedPlanSlugs);
  if (allowed.length > 0) {
    return allowed.includes(planSlug);
  }
  if (promotion.specificPlanSlug) {
    return promotion.specificPlanSlug === planSlug;
  }
  return true;
}

export function billingIntervalAllowedForCheckout(
  promotion: { appliesToMonthly: boolean; appliesToYearly: boolean },
  billingInterval?: SubscriptionBillingInterval
): boolean {
  if (!billingInterval) return true;
  if (billingInterval === "monthly") return promotion.appliesToMonthly;
  if (billingInterval === "yearly") return promotion.appliesToYearly;
  return true;
}

function planAllowed(
  promotion: {
    specificPlanSlug: string | null;
    allowedPlanSlugs: unknown;
  },
  planSlug?: string
): boolean {
  return planAllowedForCheckout(promotion, planSlug);
}

function billingIntervalAllowed(
  promotion: { appliesToMonthly: boolean; appliesToYearly: boolean },
  billingInterval?: SubscriptionBillingInterval
): boolean {
  return billingIntervalAllowedForCheckout(promotion, billingInterval);
}

function discountDurationLabel(
  duration: string,
  months: number | null,
  locale: "nl" | "en"
): string {
  if (duration === "forever") {
    return locale === "nl" ? "voor altijd" : "forever";
  }
  if (duration === "repeating" && months) {
    return locale === "nl" ? `${months} maanden` : `${months} months`;
  }
  return locale === "nl" ? "eenmalig" : "once";
}

export function computePromoBenefits(input: {
  benefitType: PromotionBenefitType;
  basePriceEur: number;
  pack?: StudioCreditPackSnapshot | null;
  promotion: {
    creditAmount: number;
    percentageDiscount: number | null;
    fixedDiscountEur: number | null;
    subscriptionDiscountPercent: number | null;
    creditPackBonusPercent: number | null;
    freeTrialCredits: number | null;
  };
}): Pick<
  PromoValidationResult,
  | "bonusCredits"
  | "discountPercent"
  | "discountEur"
  | "subscriptionDiscountPercent"
  | "creditPackBonusPercent"
  | "freeTrialCredits"
  | "adjustedPriceEur"
> {
  const { benefitType, basePriceEur, pack, promotion } = input;
  let adjustedPriceEur = basePriceEur;
  let bonusCredits = 0;
  let discountPercent: number | undefined;
  let discountEur: number | undefined;

  switch (benefitType) {
    case "bonus_credits":
      bonusCredits = promotion.creditAmount;
      break;
    case "percentage_discount":
      discountPercent = promotion.percentageDiscount ?? 0;
      discountEur = Math.round(basePriceEur * (discountPercent / 100) * 100) / 100;
      adjustedPriceEur = Math.max(0, basePriceEur - discountEur);
      break;
    case "fixed_discount":
      discountEur = promotion.fixedDiscountEur ?? 0;
      adjustedPriceEur = Math.max(0, basePriceEur - discountEur);
      break;
    case "subscription_discount":
      return { subscriptionDiscountPercent: promotion.subscriptionDiscountPercent ?? 0 };
    case "credit_pack_bonus":
      if (pack) {
        const pct = promotion.creditPackBonusPercent ?? 0;
        bonusCredits = Math.round(pack.credits * (pct / 100));
      }
      return { creditPackBonusPercent: promotion.creditPackBonusPercent ?? 0, bonusCredits };
    case "free_trial_credits":
      return { freeTrialCredits: promotion.freeTrialCredits ?? 0, bonusCredits: promotion.freeTrialCredits ?? 0 };
    default:
      break;
  }

  return { bonusCredits, discountPercent, discountEur, adjustedPriceEur };
}

export async function validatePromoCode(input: {
  code: string;
  userId?: string;
  checkoutType?: "subscription" | "credit_pack";
  planSlug?: string;
  packSlug?: string;
  basePriceEur?: number;
  billingInterval?: SubscriptionBillingInterval;
  locale?: "nl" | "en";
  isNewUser?: boolean;
}): Promise<PromoValidationResult> {
  const code = normalizePromoCode(input.code);
  if (!code) {
    return { valid: false, code, reason: "empty_code" };
  }

  const promoCode = await prisma.studioPromoCode.findUnique({
    where: { code },
    include: {
      promotion: { include: { _count: { select: { redemptions: true } } } },
    },
  });

  if (!promoCode || !promoCode.active) {
    return { valid: false, code, reason: "invalid_code" };
  }

  const promotion = promoCode.promotion;
  if (!promotion.active) {
    return { valid: false, code, reason: "promotion_inactive" };
  }

  const now = new Date();
  if (!isWithinWindow(now, promoCode.startDate, promoCode.endDate)) {
    return { valid: false, code, reason: "code_expired" };
  }
  if (!isWithinWindow(now, promotion.startDate, promotion.endDate)) {
    return { valid: false, code, reason: "promotion_expired" };
  }

  if (promoCode.maxUses != null && promoCode.usedCount >= promoCode.maxUses) {
    return { valid: false, code, reason: "code_max_uses" };
  }

  const maxSlots = promotionMaxSlots(promotion);
  if (maxSlots > 0 && promotion._count.redemptions >= maxSlots) {
    return { valid: false, code, reason: "promotion_full" };
  }

  if (promotion.newUserOnly && !input.isNewUser) {
    return { valid: false, code, reason: "new_users_only" };
  }

  if (!planAllowed(promotion, input.planSlug)) {
    return { valid: false, code, reason: "wrong_plan" };
  }

  if (
    input.checkoutType === "subscription" &&
    !billingIntervalAllowed(promotion, input.billingInterval)
  ) {
    return { valid: false, code, reason: "wrong_billing_interval" };
  }

  if (promotion.specificPlanSlug && input.planSlug && promotion.specificPlanSlug !== input.planSlug) {
    return { valid: false, code, reason: "wrong_plan" };
  }

  const benefitType = promotion.benefitType as PromotionBenefitType;
  if (input.checkoutType === "subscription" && benefitType === "credit_pack_bonus") {
    return { valid: false, code, reason: "wrong_checkout_type" };
  }
  if (input.checkoutType === "credit_pack" && benefitType === "subscription_discount") {
    return { valid: false, code, reason: "wrong_checkout_type" };
  }

  if (input.userId) {
    const userRedemptions = await prisma.studioPromoCodeRedemption.count({
      where: { promoCodeId: promoCode.id, userId: input.userId },
    });
    if (userRedemptions >= promotion.maxRedemptionsPerUser) {
      return { valid: false, code, reason: "already_used" };
    }
  }

  const basePrice = input.basePriceEur ?? 0;
  const benefits = computePromoBenefits({
    benefitType,
    basePriceEur: basePrice,
    promotion,
  });

  const summaryPartsNl: string[] = [];
  const summaryPartsEn: string[] = [];
  if (benefits.bonusCredits) {
    summaryPartsNl.push(`${benefits.bonusCredits} bonus credits`);
    summaryPartsEn.push(`${benefits.bonusCredits} bonus credits`);
  }
  if (benefits.discountEur) {
    summaryPartsNl.push(`€${benefits.discountEur.toFixed(2)} korting`);
    summaryPartsEn.push(`€${benefits.discountEur.toFixed(2)} discount`);
  }
  if (benefits.discountPercent) {
    summaryPartsNl.push(`${benefits.discountPercent}% korting`);
    summaryPartsEn.push(`${benefits.discountPercent}% discount`);
  }
  if (benefits.subscriptionDiscountPercent) {
    summaryPartsNl.push(`${benefits.subscriptionDiscountPercent}% abonnementskorting`);
    summaryPartsEn.push(`${benefits.subscriptionDiscountPercent}% subscription discount`);
  }
  if (benefits.freeTrialCredits) {
    summaryPartsNl.push(`${benefits.freeTrialCredits} proefcredits`);
    summaryPartsEn.push(`${benefits.freeTrialCredits} trial credits`);
  }

  const durationNl = discountDurationLabel(
    promotion.discountDuration,
    promotion.discountDurationMonths,
    "nl"
  );
  const durationEn = discountDurationLabel(
    promotion.discountDuration,
    promotion.discountDurationMonths,
    "en"
  );

  return {
    valid: true,
    code,
    promotionId: promotion.id,
    promotionName: promotion.name,
    benefitType,
    ...benefits,
    summaryNl: summaryPartsNl.join(" · ") || "Campagne toegepast.",
    summaryEn: summaryPartsEn.join(" · ") || "Campaign applied.",
    durationLabelNl: promotion.endDate
      ? `Geldig t/m ${promotion.endDate.toLocaleDateString("nl-NL")} · korting ${durationNl}`
      : `Korting ${durationNl}`,
    durationLabelEn: promotion.endDate
      ? `Valid until ${promotion.endDate.toLocaleDateString("en-GB")} · discount ${durationEn}`
      : `Discount ${durationEn}`,
    stripePromotionCodeId: promoCode.stripePromotionCodeId ?? undefined,
    stripeApplied: Boolean(promoCode.stripePromotionCodeId),
  };
}

export async function recordPromoRedemption(input: {
  promoCodeId: string;
  promotionId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.$transaction([
    prisma.studioPromoCodeRedemption.create({
      data: {
        promoCodeId: input.promoCodeId,
        promotionId: input.promotionId,
        userId: input.userId,
        metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    }),
    prisma.studioPromoCode.update({
      where: { id: input.promoCodeId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
}

export async function applyPostCheckoutPromoBenefits(input: {
  userId: string;
  promoCode: string;
  pack?: StudioCreditPackSnapshot | null;
  plan?: StudioSubscriptionPlanSnapshot | null;
  stripeSessionId?: string;
}) {
  const validation = await validatePromoCode({
    code: input.promoCode,
    userId: input.userId,
    checkoutType: input.pack ? "credit_pack" : "subscription",
    planSlug: input.plan?.slug,
    packSlug: input.pack?.slug,
    basePriceEur: input.pack?.priceEur ?? input.plan?.monthlyPriceEur ?? 0,
  });
  if (!validation.valid || !validation.promotionId) {
    return { ok: false as const, reason: validation.reason ?? "invalid" };
  }

  const promoRow = await prisma.studioPromoCode.findUnique({
    where: { code: normalizePromoCode(input.promoCode) },
    include: { promotion: true },
  });
  if (!promoRow) {
    return { ok: false as const, reason: "not_found" };
  }

  const promotion = promoRow.promotion;
  const origin = mapPromotionGrantToOrigin(promotion.grantType);
  let creditsToGrant = 0;

  if (promotion.benefitType === "bonus_credits" || promotion.benefitType === "free_trial_credits") {
    creditsToGrant = promotion.creditAmount || promotion.freeTrialCredits || 0;
  } else if (promotion.benefitType === "credit_pack_bonus" && input.pack) {
    const pct = promotion.creditPackBonusPercent ?? 0;
    creditsToGrant = Math.round(input.pack.credits * (pct / 100)) + (input.pack.bonusCredits ?? 0);
  } else if (input.pack) {
    creditsToGrant = totalPackCredits(input.pack) - input.pack.credits;
  }

  let ledgerId: string | undefined;
  if (creditsToGrant > 0) {
    const grant = await grantStudioCreditsWithOrigin({
      userId: input.userId,
      credits: creditsToGrant,
      creditOrigin: origin,
      actionType: "promotional_grant",
      service: "billing",
      metadataJson: {
        promoCode: promoRow.code,
        promotionId: promotion.id,
        stripeSessionId: input.stripeSessionId,
      },
    });
    ledgerId = grant.ledgerId;
  }

  await recordPromoRedemption({
    promoCodeId: promoRow.id,
    promotionId: promotion.id,
    userId: input.userId,
    metadata: {
      stripeSessionId: input.stripeSessionId,
      creditsGranted: creditsToGrant,
      benefitType: promotion.benefitType,
      auditEvent: "promo_redemption",
      promotionSlug: promotion.slug,
    },
  });

  await prisma.studioPromotionRedemption.upsert({
    where: {
      promotionId_userId: { promotionId: promotion.id, userId: input.userId },
    },
    create: {
      promotionId: promotion.id,
      userId: input.userId,
      creditsGranted: creditsToGrant,
      ledgerEntryId: ledgerId,
      promoCodeId: promoRow.id,
    },
    update: {
      creditsGranted: { increment: creditsToGrant },
      promoCodeId: promoRow.id,
    },
  });

  return { ok: true as const, creditsGranted: creditsToGrant };
}
