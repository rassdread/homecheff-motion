import {
  OFFICIAL_SUBSCRIPTION_MONTHLY_EUR,
  OFFICIAL_SUBSCRIPTION_YEARLY_EUR,
  type PaidStudioPlanId,
} from "@/lib/studio-subscription-prices";
import type { DiscountDuration } from "@/lib/studio-promotion-validation";
import { fieldsToPlanTarget, parseAllowedPlanSlugs } from "@/lib/studio-promotion-validation";
import type { PromotionBenefitType } from "@/types/studio-billing";

export type PromotionPreviewInput = {
  code: string;
  benefitType: PromotionBenefitType;
  percentageDiscount?: number | null;
  fixedDiscountEur?: number | null;
  subscriptionDiscountPercent?: number | null;
  discountDuration?: DiscountDuration;
  discountDurationMonths?: number | null;
  allowedPlanSlugs?: unknown;
  specificPlanSlug?: string | null;
  appliesToMonthly?: boolean;
  appliesToYearly?: boolean;
};

export type PricePreviewRow = {
  planId: PaidStudioPlanId;
  label: string;
  interval: "monthly" | "yearly";
  baseEur: number;
  discountedEur: number;
};

function discountPercent(input: PromotionPreviewInput): number {
  if (input.benefitType === "subscription_discount") {
    return input.subscriptionDiscountPercent ?? 0;
  }
  if (input.benefitType === "percentage_discount") {
    return input.percentageDiscount ?? 0;
  }
  return 0;
}

function applyDiscount(baseEur: number, input: PromotionPreviewInput): number {
  if (input.benefitType === "fixed_discount") {
    return Math.max(0, baseEur - (input.fixedDiscountEur ?? 0));
  }
  const pct = discountPercent(input);
  if (pct > 0) {
    return Math.round(baseEur * (1 - pct / 100) * 100) / 100;
  }
  return baseEur;
}

function durationLabelNl(duration: DiscountDuration, months: number | null | undefined): string {
  if (duration === "forever") return "voor altijd";
  if (duration === "repeating" && months) return `${months} maanden`;
  return "eenmalig";
}

function durationLabelEn(duration: DiscountDuration, months: number | null | undefined): string {
  if (duration === "forever") return "forever";
  if (duration === "repeating" && months) return `${months} months`;
  return "once";
}

function planScopeLabel(input: PromotionPreviewInput, locale: "nl" | "en"): string {
  const slugs = parseAllowedPlanSlugs(input.allowedPlanSlugs);
  const target = fieldsToPlanTarget({
    allowedPlanSlugs: slugs,
    appliesToMonthly: input.appliesToMonthly ?? true,
    appliesToYearly: input.appliesToYearly ?? true,
    specificPlanSlug: input.specificPlanSlug ?? null,
  });

  const labelsNl: Record<string, string> = {
    all: "alle plannen",
    creator: "Creator",
    pro: "Pro",
    studio: "Studio",
    monthly_only: "alleen maandabonnementen",
    yearly_only: "alleen jaarabonnementen",
  };
  const labelsEn: Record<string, string> = {
    all: "all plans",
    creator: "Creator",
    pro: "Pro",
    studio: "Studio",
    monthly_only: "monthly subscriptions only",
    yearly_only: "yearly subscriptions only",
  };
  return locale === "nl" ? labelsNl[target] : labelsEn[target];
}

function benefitValueLabel(input: PromotionPreviewInput, locale: "nl" | "en"): string {
  if (input.benefitType === "percentage_discount") {
    return `${input.percentageDiscount ?? 0}% ${locale === "nl" ? "korting" : "off"}`;
  }
  if (input.benefitType === "subscription_discount") {
    return `${input.subscriptionDiscountPercent ?? 0}% ${locale === "nl" ? "abonnementskorting" : "subscription discount"}`;
  }
  if (input.benefitType === "fixed_discount") {
    return `€${(input.fixedDiscountEur ?? 0).toFixed(2)} ${locale === "nl" ? "korting" : "off"}`;
  }
  return "";
}

export function buildPromotionPreviewSentence(
  input: PromotionPreviewInput,
  locale: "nl" | "en" = "nl"
): string {
  const code = input.code.trim().toUpperCase() || "PROMO";
  const duration = input.discountDuration ?? "once";
  const scope = planScopeLabel(input, locale);
  const value = benefitValueLabel(input, locale);

  if (!value) return code;

  if (locale === "nl") {
    return `${code} geeft ${value} op ${scope} · ${durationLabelNl(duration, input.discountDurationMonths)}.`;
  }
  return `${code} gives ${value} on ${scope} · ${durationLabelEn(duration, input.discountDurationMonths)}.`;
}

export function buildPromotionPricePreviews(input: PromotionPreviewInput): PricePreviewRow[] {
  if (
    input.benefitType !== "percentage_discount" &&
    input.benefitType !== "fixed_discount" &&
    input.benefitType !== "subscription_discount"
  ) {
    return [];
  }

  const slugs = parseAllowedPlanSlugs(input.allowedPlanSlugs);
  const allowedPlans: PaidStudioPlanId[] =
    slugs.length > 0
      ? (slugs as PaidStudioPlanId[])
      : input.specificPlanSlug
        ? [input.specificPlanSlug as PaidStudioPlanId]
        : ["creator", "pro", "studio"];

  const rows: PricePreviewRow[] = [];
  const monthly = input.appliesToMonthly ?? true;
  const yearly = input.appliesToYearly ?? true;

  for (const planId of allowedPlans) {
    if (monthly) {
      const base = OFFICIAL_SUBSCRIPTION_MONTHLY_EUR[planId];
      rows.push({
        planId,
        label: planId.charAt(0).toUpperCase() + planId.slice(1),
        interval: "monthly",
        baseEur: base,
        discountedEur: applyDiscount(base, input),
      });
    }
    if (yearly) {
      const base = OFFICIAL_SUBSCRIPTION_YEARLY_EUR[planId];
      rows.push({
        planId,
        label: planId.charAt(0).toUpperCase() + planId.slice(1),
        interval: "yearly",
        baseEur: base,
        discountedEur: applyDiscount(base, input),
      });
    }
  }
  return rows;
}

export function formatPromotionOverviewLine(input: {
  code: string;
  benefitType: PromotionBenefitType;
  percentageDiscount?: number | null;
  fixedDiscountEur?: number | null;
  subscriptionDiscountPercent?: number | null;
  discountDuration?: DiscountDuration;
  discountDurationMonths?: number | null;
  allowedPlanSlugs?: unknown;
  specificPlanSlug?: string | null;
  appliesToMonthly?: boolean;
  appliesToYearly?: boolean;
  usedCount: number;
  maxUses: number | null;
  active: boolean;
  stripePromotionCodeId: string | null;
  stripeCouponId: string | null;
}): string {
  const code = input.code.toUpperCase();
  let value = "";
  if (input.benefitType === "percentage_discount") value = `${input.percentageDiscount ?? 0}% korting`;
  else if (input.benefitType === "subscription_discount") value = `${input.subscriptionDiscountPercent ?? 0}% korting`;
  else if (input.benefitType === "fixed_discount") value = `€${(input.fixedDiscountEur ?? 0).toFixed(2)} korting`;
  else if (input.benefitType === "bonus_credits") value = "bonus credits";
  else value = input.benefitType;

  const duration = durationLabelNl(input.discountDuration ?? "once", input.discountDurationMonths);
  const scope = planScopeLabel(input, "nl");
  const usage =
    input.maxUses != null ? `${input.usedCount}/${input.maxUses} gebruikt` : `${input.usedCount} gebruikt`;
  const stripe =
    input.stripePromotionCodeId || input.stripeCouponId
      ? input.active
        ? "Stripe actief"
        : "Stripe uitgeschakeld"
      : "lokaal (geen Stripe)";
  const status = input.active ? "actief" : "inactief";

  return `${code} — ${value} · ${duration} · ${scope} · ${usage} · ${stripe} · ${status}`;
}
