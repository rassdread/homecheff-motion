/**
 * Central video pricing service — gross user price from credits + tier rules.
 * Internal cost never exposed to end users via this module's public user APIs.
 */

import { CREDIT_USD } from "@/lib/animation-presets";
import { resolveEurToUsdRate } from "@/server/provider-cost/margin-simulation";
import {
  ALL_CREDIT_TIER_RULES,
  FLAT_PRICING_RULES,
  PRICING_PLAN_V1,
  resolveFullExportPriceEur,
  type FlatPricingRule,
  type VideoPricingRule,
  type VideoRenderType,
} from "@/server/billing/video-pricing-config";

export type BillingUserContext = {
  role: string;
  isTestMode?: boolean;
};

export type PriceQuoteInput = {
  renderType: VideoRenderType;
  actionType?: "vidu_render" | "text_rerender" | "language_export" | "full_export";
  creditsUsed: number;
  durationSeconds?: number;
  internalCostUsd?: number;
  user?: BillingUserContext;
  locale?: "nl" | "en";
  /** When true, full export is included (video already paid). */
  exportIncluded?: boolean;
  /** For full_rerender pricing — maps to story/transition tier. */
  underlyingInstantMode?: "story" | "transition";
};

export type PriceQuote = {
  internalCostUsd: number;
  internalCostEur: number;
  grossPriceEur: number;
  netPriceEur: number;
  discountEur: number;
  estimatedMarginEur: number;
  estimatedMarginPercent: number;
  pricingRuleLabel: string;
  pricingPlan: string;
  creditsUsed: number;
  isAdminFree: boolean;
  isTestMode: boolean;
  isEstimated: boolean;
  renderType: VideoRenderType;
  actionType: string;
};

export function isBillingFreeForUser(user?: BillingUserContext): boolean {
  if (!user) {
    return false;
  }
  if (user.role === "admin") {
    return true;
  }
  if (user.isTestMode) {
    return true;
  }
  const envTest = process.env.BILLING_TEST_MODE_FREE?.trim() === "true";
  return envTest && user.role === "power";
}

function usdToEur(usd: number, rate = resolveEurToUsdRate()): number {
  return Math.round((usd / rate) * 100) / 100;
}

function applyMinimumMargin(
  grossPriceEur: number,
  internalCostEur: number,
  minimumMarginPercent: number
): number {
  if (internalCostEur <= 0 || minimumMarginPercent <= 0) {
    return grossPriceEur;
  }
  const floor = internalCostEur * (1 + minimumMarginPercent / 100);
  return Math.max(grossPriceEur, Math.round(floor * 100) / 100);
}

function pickCreditTierRule(
  renderType: VideoRenderType,
  creditsUsed: number
): VideoPricingRule | null {
  const rules = ALL_CREDIT_TIER_RULES.filter(
    (r) => r.isActive && r.renderType === renderType
  );
  const credits = Math.max(0, Math.round(creditsUsed));
  for (const rule of rules) {
    const max = rule.maxCredits;
    if (credits >= rule.minCredits && (max == null || credits <= max)) {
      return rule;
    }
  }
  return rules.at(-1) ?? null;
}

function priceFromCreditTier(rule: VideoPricingRule, creditsUsed: number): number {
  let price = rule.basePriceEur;
  if (rule.maxCredits == null && rule.overflowPriceEur && rule.overflowStepCredits) {
    const priorMax =
      ALL_CREDIT_TIER_RULES.filter(
        (r) => r.renderType === rule.renderType && r.maxCredits != null
      ).reduce((m, r) => Math.max(m, r.maxCredits ?? 0), 0);
    const overflow = Math.max(0, creditsUsed - priorMax);
    const steps = Math.ceil(overflow / rule.overflowStepCredits);
    price += steps * rule.overflowPriceEur;
  }
  return Math.round(price * 100) / 100;
}

function pickFlatRule(
  actionType: PriceQuoteInput["actionType"],
  renderType: VideoRenderType
): FlatPricingRule | null {
  return (
    FLAT_PRICING_RULES.find(
      (r) => r.isActive && (r.actionType === actionType || r.renderType === renderType)
    ) ?? null
  );
}

function ruleLabel(
  rule: VideoPricingRule | FlatPricingRule,
  locale: "nl" | "en"
): string {
  return locale === "nl" ? rule.labelNl : rule.labelEn;
}

/** Quote customer gross price (pre- or post-render). */
export function quoteVideoPrice(input: PriceQuoteInput): PriceQuote {
  const locale = input.locale ?? "nl";
  const creditsUsed = Math.max(0, Math.round(input.creditsUsed));
  const internalCostUsd =
    input.internalCostUsd != null ?
      input.internalCostUsd
    : Math.round(creditsUsed * CREDIT_USD * 10000) / 10000;
  const internalCostEur = usdToEur(internalCostUsd);
  const isAdminFree = isBillingFreeForUser(input.user);
  const isTestMode = input.user?.isTestMode ?? false;

  const actionType =
    input.actionType ??
    (input.renderType === "text_rerender" ? "text_rerender"
    : input.renderType === "language_export" ? "language_export"
    : input.renderType === "full_export" ? "full_export"
    : "vidu_render");

  let grossPriceEur = 0;
  let pricingRuleLabel = "Free";
  let minimumMarginPercent = 0;

  if (actionType === "full_export" && input.exportIncluded) {
    grossPriceEur = 0;
    pricingRuleLabel = locale === "nl" ? "Inbegrepen bij betaalde video" : "Included with paid video";
  } else if (
    actionType === "vidu_render" ||
    input.renderType === "transition_mode" ||
    input.renderType === "story_mode" ||
    input.renderType === "full_rerender" ||
    input.renderType === "concept_render" ||
    input.renderType === "classic"
  ) {
    const renderType =
      input.renderType === "story_mode" || input.underlyingInstantMode === "story"
        ? "story_mode"
        : "transition_mode";
    const rule = pickCreditTierRule(renderType, creditsUsed);
    if (rule) {
      grossPriceEur = priceFromCreditTier(rule, creditsUsed);
      pricingRuleLabel = ruleLabel(rule, locale);
      minimumMarginPercent = rule.minimumMarginPercent;
    }
  } else {
    const flat = pickFlatRule(actionType, input.renderType);
    if (flat) {
      grossPriceEur =
        actionType === "full_export" ? resolveFullExportPriceEur() : flat.basePriceEur;
      pricingRuleLabel = ruleLabel(flat, locale);
      minimumMarginPercent = flat.minimumMarginPercent;
    }
  }

  grossPriceEur = applyMinimumMargin(grossPriceEur, internalCostEur, minimumMarginPercent);

  if (isAdminFree) {
    grossPriceEur = 0;
    pricingRuleLabel =
      locale === "nl" ? "Admin/test — gratis" : "Admin/test — free";
  }

  const netPriceEur = grossPriceEur;
  const discountEur = 0;
  const estimatedMarginEur = Math.round((netPriceEur - internalCostEur) * 100) / 100;
  const estimatedMarginPercent =
    netPriceEur > 0 ?
      Math.round((estimatedMarginEur / netPriceEur) * 10000) / 100
    : 0;

  return {
    internalCostUsd,
    internalCostEur,
    grossPriceEur: netPriceEur,
    netPriceEur,
    discountEur,
    estimatedMarginEur,
    estimatedMarginPercent,
    pricingRuleLabel,
    pricingPlan: PRICING_PLAN_V1,
    creditsUsed,
    isAdminFree,
    isTestMode,
    isEstimated: input.internalCostUsd == null,
    renderType: input.renderType,
    actionType,
  };
}

export { formatPriceEur } from "@/lib/format-price-eur";

/** List active pricing rules for admin display. */
export function listActivePricingRulesForAdmin(locale: "nl" | "en" = "nl") {
  return {
    plan: PRICING_PLAN_V1,
    creditTiers: ALL_CREDIT_TIER_RULES.filter((r) => r.isActive).map((r) => ({
      ...r,
      label: locale === "nl" ? r.labelNl : r.labelEn,
    })),
    flatRules: FLAT_PRICING_RULES.filter((r) => r.isActive).map((r) => ({
      ...r,
      label: locale === "nl" ? r.labelNl : r.labelEn,
      basePriceEur:
        r.actionType === "full_export" ? resolveFullExportPriceEur() : r.basePriceEur,
    })),
  };
}
