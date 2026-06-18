import { prisma } from "@/lib/prisma";
import { grantStudioCreditsWithOrigin } from "@/server/studio-account/studio-wallet-service";
import type {
  CreditOriginType,
  PromotionBenefitType,
  PromotionGrantType,
  StudioPromotionSnapshot,
} from "@/types/studio-billing";
import { USD_PER_CREDIT } from "@/server/studio-account/studio-action-cost-registry";
import {
  isStripeDiscountBenefitType,
  parseAllowedPlanSlugs,
  planTargetToFields,
  promotionRequiresStripeCoupon,
  validatePromotionForm,
  type PromotionFormInput,
} from "@/lib/studio-promotion-validation";
import {
  createStripePromotionCode,
  ensureStripeCouponForPromotion,
  syncPromotionDisableToStripe,
} from "@/server/studio-account/stripe-promotion-sync";

function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

function isPromotionActive(now: Date, start: Date | null, end: Date | null): boolean {
  if (start && now < start) {
    return false;
  }
  if (end && now > end) {
    return false;
  }
  return true;
}

function maxSlots(row: { maxRedemptions: number | null; maximumUsers: number }): number {
  return row.maxRedemptions ?? row.maximumUsers;
}

export function mapPromotionGrantToOrigin(grantType: string): CreditOriginType {
  switch (grantType) {
    case "BETA":
      return "BETA";
    case "COMPENSATION":
      return "COMPENSATION";
    case "REFERRAL":
      return "REFERRAL";
    default:
      return "PROMOTIONAL";
  }
}

function mapPromotionRow(
  row: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    descriptionInternal: string;
    creditAmount: number;
    maximumUsers: number;
    benefitType: string;
    maxRedemptions: number | null;
    maxRedemptionsPerUser: number;
    percentageDiscount: number | null;
    fixedDiscountEur: number | null;
    subscriptionDiscountPercent: number | null;
    creditPackBonusPercent: number | null;
    freeTrialCredits: number | null;
    discountDuration: string;
    discountDurationMonths: number | null;
    allowedPlanSlugs: unknown;
    appliesToMonthly: boolean;
    appliesToYearly: boolean;
    bonusCreditsApplyWhen: string;
    bonusCreditsExpireDays: number | null;
    newUserOnly: boolean;
    specificPlanSlug: string | null;
    grantType: string;
    startDate: Date | null;
    endDate: Date | null;
    stripeCouponId: string | null;
    promoCodes: Array<{
      code: string;
      usedCount: number;
      maxUses: number | null;
      stripePromotionCodeId: string | null;
    }>;
    _count: { redemptions: number; promoCodes: number };
  }
): StudioPromotionSnapshot {
  const slots = maxSlots(row);
  const creditsPerUser =
    row.benefitType === "free_trial_credits"
      ? row.freeTrialCredits ?? 0
      : row.creditAmount;
  const primary = row.promoCodes[0] ?? null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    descriptionInternal: row.descriptionInternal,
    benefitType: row.benefitType as PromotionBenefitType,
    creditAmount: row.creditAmount,
    maximumUsers: row.maximumUsers,
    maxRedemptions: row.maxRedemptions,
    maxRedemptionsPerUser: row.maxRedemptionsPerUser,
    percentageDiscount: row.percentageDiscount,
    fixedDiscountEur: row.fixedDiscountEur,
    subscriptionDiscountPercent: row.subscriptionDiscountPercent,
    creditPackBonusPercent: row.creditPackBonusPercent,
    freeTrialCredits: row.freeTrialCredits,
    discountDuration: row.discountDuration,
    discountDurationMonths: row.discountDurationMonths,
    allowedPlanSlugs: parseAllowedPlanSlugs(row.allowedPlanSlugs),
    appliesToMonthly: row.appliesToMonthly,
    appliesToYearly: row.appliesToYearly,
    bonusCreditsApplyWhen: row.bonusCreditsApplyWhen,
    bonusCreditsExpireDays: row.bonusCreditsExpireDays,
    newUserOnly: row.newUserOnly,
    specificPlanSlug: row.specificPlanSlug,
    grantType: row.grantType as PromotionGrantType,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    stripeCouponId: row.stripeCouponId,
    redemptionCount: row._count.redemptions,
    remainingSlots: slots > 0 ? Math.max(0, slots - row._count.redemptions) : 999999,
    estimatedCostUsd:
      Math.round(creditsPerUser * row._count.redemptions * USD_PER_CREDIT * 100) / 100,
    promoCodeCount: row._count.promoCodes,
    primaryCode: primary?.code ?? null,
    primaryCodeUsedCount: primary?.usedCount ?? 0,
    primaryCodeMaxUses: primary?.maxUses ?? null,
    stripeLinked: Boolean(
      row.stripeCouponId || primary?.stripePromotionCodeId
    ),
  };
}

export async function listStudioPromotions(): Promise<StudioPromotionSnapshot[]> {
  const rows = await prisma.studioPromotion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      promoCodes: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          code: true,
          usedCount: true,
          maxUses: true,
          stripePromotionCodeId: true,
        },
      },
      _count: { select: { redemptions: true, promoCodes: true } },
    },
  });
  return rows.map(mapPromotionRow);
}

export async function createStudioPromotion(input: {
  name: string;
  slug: string;
  descriptionInternal?: string;
  benefitType?: PromotionBenefitType;
  creditAmount?: number;
  maximumUsers?: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number;
  percentageDiscount?: number | null;
  fixedDiscountEur?: number | null;
  subscriptionDiscountPercent?: number | null;
  creditPackBonusPercent?: number | null;
  freeTrialCredits?: number | null;
  discountDuration?: string;
  discountDurationMonths?: number | null;
  allowedPlanSlugs?: string[];
  appliesToMonthly?: boolean;
  appliesToYearly?: boolean;
  bonusCreditsApplyWhen?: string;
  bonusCreditsExpireDays?: number | null;
  newUserOnly?: boolean;
  specificPlanSlug?: string | null;
  grantType?: PromotionGrantType;
  startDate?: string | null;
  endDate?: string | null;
  active?: boolean;
  stripeCouponId?: string | null;
}) {
  return prisma.studioPromotion.create({
    data: {
      name: input.name,
      slug: input.slug,
      descriptionInternal: input.descriptionInternal ?? "",
      benefitType: input.benefitType ?? "bonus_credits",
      creditAmount: input.creditAmount ?? 0,
      maximumUsers: input.maximumUsers ?? 0,
      maxRedemptions: input.maxRedemptions ?? input.maximumUsers ?? null,
      maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? 1,
      percentageDiscount: input.percentageDiscount ?? null,
      fixedDiscountEur: input.fixedDiscountEur ?? null,
      subscriptionDiscountPercent: input.subscriptionDiscountPercent ?? null,
      creditPackBonusPercent: input.creditPackBonusPercent ?? null,
      freeTrialCredits: input.freeTrialCredits ?? null,
      discountDuration: input.discountDuration ?? "once",
      discountDurationMonths: input.discountDurationMonths ?? null,
      allowedPlanSlugs: input.allowedPlanSlugs ?? [],
      appliesToMonthly: input.appliesToMonthly ?? true,
      appliesToYearly: input.appliesToYearly ?? true,
      bonusCreditsApplyWhen: input.bonusCreditsApplyWhen ?? "first_payment",
      bonusCreditsExpireDays: input.bonusCreditsExpireDays ?? null,
      newUserOnly: input.newUserOnly ?? false,
      specificPlanSlug: input.specificPlanSlug ?? null,
      grantType: input.grantType ?? "PROMOTIONAL",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      active: input.active ?? true,
      stripeCouponId: input.stripeCouponId ?? null,
    },
  });
}

export async function createPromotionWithCode(
  input: PromotionFormInput
): Promise<{ ok: true; promotionId: string; codeId: string } | { ok: false; errors: string[] }> {
  const errors = validatePromotionForm(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const normalizedCode = normalizePromoCode(input.code);
  const existingCode = await prisma.studioPromoCode.findUnique({ where: { code: normalizedCode } });
  if (existingCode) {
    return { ok: false, errors: ["duplicate_code"] };
  }

  const existingSlug = await prisma.studioPromotion.findUnique({ where: { slug: input.slug.trim() } });
  if (existingSlug) {
    return { ok: false, errors: ["duplicate_slug"] };
  }

  const planFields = input.planTarget
    ? planTargetToFields(input.planTarget)
    : {
        allowedPlanSlugs: [],
        appliesToMonthly: input.appliesToMonthly ?? true,
        appliesToYearly: input.appliesToYearly ?? true,
        specificPlanSlug: null as string | null,
      };

  const benefitType = input.benefitType;
  const promotion = await createStudioPromotion({
    name: input.name.trim(),
    slug: input.slug.trim(),
    descriptionInternal: input.descriptionInternal?.trim() ?? "",
    benefitType,
    creditAmount: input.creditAmount ?? 0,
    maximumUsers: input.maxRedemptions ?? 0,
    maxRedemptions: input.maxRedemptions ?? null,
    maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? 1,
    percentageDiscount: input.percentageDiscount ?? null,
    fixedDiscountEur: input.fixedDiscountEur ?? null,
    subscriptionDiscountPercent: input.subscriptionDiscountPercent ?? null,
    freeTrialCredits: input.freeTrialCredits ?? null,
    discountDuration: input.discountDuration ?? "once",
    discountDurationMonths: input.discountDurationMonths ?? null,
    allowedPlanSlugs: planFields.allowedPlanSlugs,
    appliesToMonthly: planFields.appliesToMonthly,
    appliesToYearly: planFields.appliesToYearly,
    bonusCreditsApplyWhen: input.bonusCreditsApplyWhen ?? "first_payment",
    bonusCreditsExpireDays: input.bonusCreditsExpireDays ?? null,
    newUserOnly: input.newUserOnly ?? false,
    specificPlanSlug: planFields.specificPlanSlug,
    grantType: (input.grantType as PromotionGrantType) ?? "PROMOTIONAL",
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    active: input.active ?? true,
  });

  let stripeCouponId: string | null = null;
  let stripePromotionCodeId: string | null = null;

  if (isStripeDiscountBenefitType(benefitType)) {
    stripeCouponId = await ensureStripeCouponForPromotion({
      ...promotion,
      allowedPlanSlugs: planFields.allowedPlanSlugs,
    });
    if (!stripeCouponId && promotionRequiresStripeCoupon(benefitType)) {
      await prisma.studioPromotion.delete({ where: { id: promotion.id } });
      return { ok: false, errors: ["stripe_coupon_failed"] };
    }
    if (stripeCouponId) {
      await prisma.studioPromotion.update({
        where: { id: promotion.id },
        data: { stripeCouponId },
      });
    }
    if (stripeCouponId) {
      stripePromotionCodeId = await createStripePromotionCode({
        code: normalizedCode,
        couponId: stripeCouponId,
        promotionId: promotion.id,
        promotionSlug: promotion.slug,
        maxUses: input.maxUses ?? input.maxRedemptions ?? null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        active: input.active ?? true,
      });
    }
  }

  const promoCode = await prisma.studioPromoCode.create({
    data: {
      code: normalizedCode,
      promotionId: promotion.id,
      maxUses: input.maxUses ?? input.maxRedemptions ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      active: input.active ?? true,
      stripePromotionCodeId,
    },
  });

  return { ok: true, promotionId: promotion.id, codeId: promoCode.id };
}

export async function updateStudioPromotion(
  id: string,
  input: Partial<{
    name: string;
    active: boolean;
    benefitType: PromotionBenefitType;
    creditAmount: number;
    maximumUsers: number;
    maxRedemptions: number | null;
    maxRedemptionsPerUser: number;
    percentageDiscount: number | null;
    fixedDiscountEur: number | null;
    subscriptionDiscountPercent: number | null;
    creditPackBonusPercent: number | null;
    freeTrialCredits: number | null;
    newUserOnly: boolean;
    specificPlanSlug: string | null;
    grantType: PromotionGrantType;
    startDate: string | null;
    endDate: string | null;
  }>
) {
  const updated = await prisma.studioPromotion.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.benefitType !== undefined ? { benefitType: input.benefitType } : {}),
      ...(input.creditAmount !== undefined ? { creditAmount: input.creditAmount } : {}),
      ...(input.maximumUsers !== undefined ? { maximumUsers: input.maximumUsers } : {}),
      ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
      ...(input.maxRedemptionsPerUser !== undefined
        ? { maxRedemptionsPerUser: input.maxRedemptionsPerUser }
        : {}),
      ...(input.percentageDiscount !== undefined
        ? { percentageDiscount: input.percentageDiscount }
        : {}),
      ...(input.fixedDiscountEur !== undefined ? { fixedDiscountEur: input.fixedDiscountEur } : {}),
      ...(input.subscriptionDiscountPercent !== undefined
        ? { subscriptionDiscountPercent: input.subscriptionDiscountPercent }
        : {}),
      ...(input.creditPackBonusPercent !== undefined
        ? { creditPackBonusPercent: input.creditPackBonusPercent }
        : {}),
      ...(input.freeTrialCredits !== undefined ? { freeTrialCredits: input.freeTrialCredits } : {}),
      ...(input.newUserOnly !== undefined ? { newUserOnly: input.newUserOnly } : {}),
      ...(input.specificPlanSlug !== undefined ? { specificPlanSlug: input.specificPlanSlug } : {}),
      ...(input.grantType !== undefined ? { grantType: input.grantType } : {}),
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(input.startDate) : null }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
    },
    include: {
      promoCodes: { select: { stripePromotionCodeId: true } },
    },
  });

  if (input.active === false) {
    await syncPromotionDisableToStripe({
      stripeCouponId: updated.stripeCouponId,
      promoCodes: updated.promoCodes,
    });
    await prisma.studioPromoCode.updateMany({
      where: { promotionId: id },
      data: { active: false },
    });
  }

  return updated;
}

export async function redeemStudioPromotion(input: {
  userId: string;
  promotionId: string;
  promoCodeId?: string;
}): Promise<{ ok: true; credits: number } | { ok: false; reason: string }> {
  const promotion = await prisma.studioPromotion.findUnique({
    where: { id: input.promotionId },
    include: { _count: { select: { redemptions: true } } },
  });

  if (!promotion || !promotion.active) {
    return { ok: false, reason: "promotion_inactive" };
  }

  const now = new Date();
  if (!isPromotionActive(now, promotion.startDate, promotion.endDate)) {
    return { ok: false, reason: "promotion_not_in_window" };
  }

  const slots = maxSlots(promotion);
  if (slots > 0 && promotion._count.redemptions >= slots) {
    return { ok: false, reason: "promotion_full" };
  }

  const existing = await prisma.studioPromotionRedemption.findUnique({
    where: { promotionId_userId: { promotionId: input.promotionId, userId: input.userId } },
  });
  if (existing) {
    return { ok: false, reason: "already_redeemed" };
  }

  const credits =
    promotion.benefitType === "free_trial_credits"
      ? promotion.freeTrialCredits ?? 0
      : promotion.creditAmount;
  if (credits <= 0 && promotion.benefitType === "bonus_credits") {
    return { ok: false, reason: "no_credits" };
  }

  const origin = mapPromotionGrantToOrigin(promotion.grantType);
  let ledgerId: string | undefined;
  if (credits > 0) {
    const grant = await grantStudioCreditsWithOrigin({
      userId: input.userId,
      credits,
      creditOrigin: origin,
      actionType: "promotional_grant",
      service: "billing",
      metadataJson: { promotionId: promotion.id, slug: promotion.slug },
    });
    ledgerId = grant.ledgerId;
  }

  await prisma.studioPromotionRedemption.create({
    data: {
      promotionId: promotion.id,
      userId: input.userId,
      creditsGranted: credits,
      ledgerEntryId: ledgerId,
      promoCodeId: input.promoCodeId,
    },
  });

  return { ok: true, credits };
}

export async function tryAutoRedeemPromotionBySlug(userId: string, slug: string) {
  const promotion = await prisma.studioPromotion.findUnique({ where: { slug } });
  if (!promotion) {
    return { ok: false as const, reason: "not_found" };
  }
  return redeemStudioPromotion({ userId, promotionId: promotion.id });
}
