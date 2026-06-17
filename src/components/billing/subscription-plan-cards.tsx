"use client";

import { useEffect, useMemo, useState } from "react";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { BillingIntervalToggle } from "@/components/billing/billing-interval-toggle";
import { formatPriceEur } from "@/lib/format-price-eur";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  computeSubscriptionYearlySavingsPercent,
  resolvePlanYearlyPriceEur,
  SUBSCRIPTION_YEARLY_SAVINGS_PERCENT,
  type SubscriptionBillingInterval,
} from "@/lib/studio-subscription-billing";
import { STUDIO_PLAN_DISPLAY } from "@/lib/studio-account-display-config";
import { OFFICIAL_SUBSCRIPTION_YEARLY_EUR, subscriptionYearlyPriceEur } from "@/lib/studio-subscription-prices";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

export type SubscriptionPlanCardData = {
  id: string;
  name: string;
  monthlyPriceEur: number | null;
  yearlyPriceEur?: number | null;
  storageLimitGb?: number | null;
  discountPercent: number;
  yearlyCheckoutAvailable?: boolean;
};

type Props = {
  theme?: "light" | "dark";
  showIntervalToggle?: boolean;
  defaultInterval?: SubscriptionBillingInterval;
  onSubscribe?: (planId: string, interval: SubscriptionBillingInterval) => void;
  loadingPlanId?: string | null;
  subscribeLabelKey?: TranslationKey;
  loadingLabelKey?: TranslationKey;
};

function resolveFallbackYearlyPrice(plan: (typeof STUDIO_PLAN_DISPLAY)[number]): number | null {
  if (plan.id in OFFICIAL_SUBSCRIPTION_YEARLY_EUR) {
    return OFFICIAL_SUBSCRIPTION_YEARLY_EUR[plan.id as keyof typeof OFFICIAL_SUBSCRIPTION_YEARLY_EUR];
  }
  return plan.monthlyPriceEur != null ? subscriptionYearlyPriceEur(plan.monthlyPriceEur) : null;
}

function buildFallbackPlans(t: (key: TranslationKey) => string): SubscriptionPlanCardData[] {
  return STUDIO_PLAN_DISPLAY.map((plan) => ({
    id: plan.id,
    name: t(plan.labelKey),
    monthlyPriceEur: plan.monthlyPriceEur,
    yearlyPriceEur: resolveFallbackYearlyPrice(plan),
    storageLimitGb: plan.storageLimitGb,
    discountPercent: plan.creditDiscountPercent,
    yearlyCheckoutAvailable: true,
  }));
}

export function SubscriptionPlanCards({
  theme = "light",
  showIntervalToggle = true,
  defaultInterval = "monthly",
  onSubscribe,
  loadingPlanId = null,
  subscribeLabelKey = "account.billing.subscribe",
  loadingLabelKey = "account.billing.loading",
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [interval, setInterval] = useState<SubscriptionBillingInterval>(defaultInterval);
  const [plans, setPlans] = useState<SubscriptionPlanCardData[]>([]);

  useEffect(() => {
    void fetch("/api/billing/catalog")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { plans: SubscriptionPlanCardData[] };
        if (data.plans?.length) {
          setPlans(data.plans);
        }
      })
      .catch(() => {
        /* fallback below */
      });
  }, []);

  const displayPlans = useMemo(
    () => (plans.length > 0 ? plans : buildFallbackPlans(t)),
    [plans, t]
  );

  const cardClass =
    theme === "dark"
      ? `${studioVisual.cardOnDark} flex flex-col p-5`
      : "flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm";

  const handleSubscribe = (planId: string) => {
    trackBillingConversionEvent("subscription_upgrade_selected", {
      planId,
      source: "subscription_plan_cards",
    });
    if (interval === "yearly") {
      trackBillingConversionEvent("yearly_selected", { planId, source: "subscription_plan_cards" });
    } else {
      trackBillingConversionEvent("monthly_selected", { planId, source: "subscription_plan_cards" });
    }
    onSubscribe?.(planId, interval);
  };

  return (
    <div className="space-y-4">
      {showIntervalToggle ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <BillingIntervalToggle value={interval} onChange={setInterval} theme={theme} />
          <p
            className={`text-sm ${theme === "dark" ? "text-white/60" : "text-zinc-600"}`}
          >
            {t("billing.interval.yearlyHint" as never, { percent: SUBSCRIPTION_YEARLY_SAVINGS_PERCENT })}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayPlans.map((plan) => {
          const yearly = resolvePlanYearlyPriceEur(plan.monthlyPriceEur, plan.yearlyPriceEur);
          const savings =
            plan.monthlyPriceEur != null && yearly != null
              ? computeSubscriptionYearlySavingsPercent(plan.monthlyPriceEur, yearly)
              : SUBSCRIPTION_YEARLY_SAVINGS_PERCENT;
          const yearlyAvailable = plan.yearlyCheckoutAvailable !== false && yearly != null;
          const checkoutDisabled =
            interval === "yearly" ? !yearlyAvailable : plan.monthlyPriceEur == null;

          return (
            <div key={plan.id} className={cardClass} data-testid={`subscription-plan-card-${plan.id}`}>
              <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                {plan.name}
              </h3>

              <div className="mt-3 space-y-1">
                <p className={`text-sm ${theme === "dark" ? "text-white/70" : "text-zinc-600"}`}>
                  {t("billing.interval.monthlyPrice" as never)}:{" "}
                  <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                    {plan.monthlyPriceEur != null
                      ? `${formatPriceEur(plan.monthlyPriceEur, locale)} ${t("billing.interval.perMonth" as never)}`
                      : "—"}
                  </span>
                </p>
                <p className={`text-sm ${theme === "dark" ? "text-white/70" : "text-zinc-600"}`}>
                  {t("billing.interval.yearlyPrice" as never)}:{" "}
                  <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                    {yearly != null
                      ? `${formatPriceEur(yearly, locale)} ${t("billing.interval.perYear" as never)}`
                      : "—"}
                  </span>
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
                  {t("billing.interval.savingsLabel" as never, { percent: savings })}
                </p>
              </div>

              {interval === "yearly" && yearly != null ? (
                <p className={`mt-2 text-2xl font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                  {formatPriceEur(yearly, locale)}
                  <span className={`text-sm font-normal ${theme === "dark" ? "text-white/50" : "text-zinc-500"}`}>
                    {t("billing.interval.perYear" as never)}
                  </span>
                </p>
              ) : (
                <p className={`mt-2 text-2xl font-bold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                  {plan.monthlyPriceEur != null ? formatPriceEur(plan.monthlyPriceEur, locale) : "—"}
                  <span className={`text-sm font-normal ${theme === "dark" ? "text-white/50" : "text-zinc-500"}`}>
                    {t("billing.interval.perMonth" as never)}
                  </span>
                </p>
              )}

              <p className={`mt-2 text-sm ${theme === "dark" ? "text-white/70" : "text-zinc-600"}`}>
                {plan.discountPercent}% {t("account.billing.creditDiscount" as never)}
              </p>
              {plan.storageLimitGb != null ? (
                <p className={`mt-1 text-sm ${theme === "dark" ? "text-white/60" : "text-zinc-500"}`}>
                  {t("account.billing.storageLimit" as never, { gb: plan.storageLimitGb })}
                </p>
              ) : null}

              {onSubscribe ? (
                <button
                  type="button"
                  disabled={loadingPlanId === plan.id || checkoutDisabled}
                  onClick={() => handleSubscribe(plan.id)}
                  className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                    theme === "dark"
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-[#006D52] text-white hover:bg-[#005a44]"
                  }`}
                >
                  {loadingPlanId === plan.id
                    ? t(loadingLabelKey)
                    : t(subscribeLabelKey)}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
