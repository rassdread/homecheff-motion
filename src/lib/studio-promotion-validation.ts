import type { PromotionBenefitType } from "@/types/studio-billing";

export const DISCOUNT_DURATIONS = ["once", "repeating", "forever"] as const;
export type DiscountDuration = (typeof DISCOUNT_DURATIONS)[number];

export const BONUS_CREDITS_APPLY_WHEN = ["registration", "first_payment", "manual"] as const;
export type BonusCreditsApplyWhen = (typeof BONUS_CREDITS_APPLY_WHEN)[number];

export const PLAN_TARGET_OPTIONS = [
  "all",
  "creator",
  "pro",
  "studio",
  "monthly_only",
  "yearly_only",
] as const;
export type PlanTargetOption = (typeof PLAN_TARGET_OPTIONS)[number];

export type PromotionFormInput = {
  name: string;
  slug: string;
  code: string;
  descriptionInternal?: string;
  active?: boolean;
  benefitType: PromotionBenefitType;
  creditAmount?: number;
  percentageDiscount?: number | null;
  fixedDiscountEur?: number | null;
  subscriptionDiscountPercent?: number | null;
  freeTrialCredits?: number | null;
  discountDuration?: DiscountDuration;
  discountDurationMonths?: number | null;
  planTarget?: PlanTargetOption;
  appliesToMonthly?: boolean;
  appliesToYearly?: boolean;
  bonusCreditsApplyWhen?: BonusCreditsApplyWhen;
  bonusCreditsExpireDays?: number | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number;
  maxUses?: number | null;
  newUserOnly?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  grantType?: string;
};

export function isStripeDiscountBenefitType(benefitType: PromotionBenefitType): boolean {
  return (
    benefitType === "percentage_discount" ||
    benefitType === "fixed_discount" ||
    benefitType === "subscription_discount"
  );
}

export function planTargetToFields(target: PlanTargetOption): {
  allowedPlanSlugs: string[];
  appliesToMonthly: boolean;
  appliesToYearly: boolean;
  specificPlanSlug: string | null;
} {
  switch (target) {
    case "creator":
      return { allowedPlanSlugs: ["creator"], appliesToMonthly: true, appliesToYearly: true, specificPlanSlug: "creator" };
    case "pro":
      return { allowedPlanSlugs: ["pro"], appliesToMonthly: true, appliesToYearly: true, specificPlanSlug: "pro" };
    case "studio":
      return { allowedPlanSlugs: ["studio"], appliesToMonthly: true, appliesToYearly: true, specificPlanSlug: "studio" };
    case "monthly_only":
      return { allowedPlanSlugs: [], appliesToMonthly: true, appliesToYearly: false, specificPlanSlug: null };
    case "yearly_only":
      return { allowedPlanSlugs: [], appliesToMonthly: false, appliesToYearly: true, specificPlanSlug: null };
    default:
      return { allowedPlanSlugs: [], appliesToMonthly: true, appliesToYearly: true, specificPlanSlug: null };
  }
}

export function fieldsToPlanTarget(input: {
  allowedPlanSlugs: string[];
  appliesToMonthly: boolean;
  appliesToYearly: boolean;
  specificPlanSlug: string | null;
}): PlanTargetOption {
  if (!input.appliesToMonthly && input.appliesToYearly) return "yearly_only";
  if (input.appliesToMonthly && !input.appliesToYearly) return "monthly_only";
  const slugs = input.allowedPlanSlugs.length
    ? input.allowedPlanSlugs
    : input.specificPlanSlug
      ? [input.specificPlanSlug]
      : [];
  if (slugs.length === 1 && slugs[0] === "creator") return "creator";
  if (slugs.length === 1 && slugs[0] === "pro") return "pro";
  if (slugs.length === 1 && slugs[0] === "studio") return "studio";
  return "all";
}

export function parseAllowedPlanSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function validatePromotionForm(input: PromotionFormInput): string[] {
  const errors: string[] = [];
  const name = input.name?.trim();
  const slug = input.slug?.trim();
  const code = input.code?.trim();

  if (!name) errors.push("name_required");
  if (!slug) errors.push("slug_required");
  if (!code) errors.push("code_required");

  if (input.benefitType === "percentage_discount" || input.benefitType === "subscription_discount") {
    const pct = input.percentageDiscount ?? input.subscriptionDiscountPercent ?? 0;
    if (pct < 1 || pct > 100) errors.push("percentage_out_of_range");
  }

  if (input.benefitType === "fixed_discount") {
    if (!input.fixedDiscountEur || input.fixedDiscountEur <= 0) errors.push("fixed_amount_required");
  }

  if (input.benefitType === "bonus_credits" || input.benefitType === "free_trial_credits") {
    const credits = input.benefitType === "bonus_credits" ? input.creditAmount : input.freeTrialCredits;
    if (!credits || credits <= 0) errors.push("credits_required");
  }

  const duration = input.discountDuration ?? "once";
  if (isStripeDiscountBenefitType(input.benefitType)) {
    if (duration === "repeating" && (!input.discountDurationMonths || input.discountDurationMonths < 1)) {
      errors.push("repeating_requires_months");
    }
  }

  if (input.startDate && input.endDate) {
    if (new Date(input.endDate) < new Date(input.startDate)) {
      errors.push("end_before_start");
    }
  }

  return errors;
}

export function promotionRequiresStripeCoupon(benefitType: PromotionBenefitType): boolean {
  return isStripeDiscountBenefitType(benefitType);
}
