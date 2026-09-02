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
import { subscriptionYearlyPriceEur } from "@/lib/studio-subscription-prices";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

export type SubscriptionPlanCardData = {
  id: string;
  name: string;
  monthlyPriceEur: number | null;
  yearlyPriceEur?: number | null;
  storageLimitGb?: number | null;
  discountPercent: number;
  yearlyCheckoutAvailable?: boolean;
  monthlyHcGrant?: number | null;
  vatInclusive?: boolean;
};

type NlB2cTargetPlan = {
  planKey: string;
  grossConsumerPriceEur: number;
  monthlyHcGrant: number;
  checkoutEnabled: boolean;
};

type CatalogAcquisition = {
  technicalReady: boolean;
  publicAcquisitionEnabled: boolean;
  paidCheckoutEnabled: boolean;
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

/** Always derive yearly from the customer-facing monthly (NL B2C), never legacy €7.99 list. */
function resolveFallbackYearlyPrice(plan: (typeof STUDIO_PLAN_DISPLAY)[number]): number | null {
  if (plan.monthlyPriceEur == null) return null;
  return subscriptionYearlyPriceEur(plan.monthlyPriceEur);
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
    monthlyHcGrant: plan.monthlyCredits > 0 ? plan.monthlyCredits : null,
    vatInclusive: plan.monthlyCredits > 0,
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
  const [acquisition, setAcquisition] = useState<CatalogAcquisition | null>(null);
  const [nlB2cTarget, setNlB2cTarget] = useState<NlB2cTargetPlan[] | null>(null);

  useEffect(() => {
    void fetch("/api/billing/catalog")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          plans: SubscriptionPlanCardData[];
          acquisition?: CatalogAcquisition;
          nlB2cTarget?: NlB2cTargetPlan[] | null;
        };
        if (data.plans?.length) {
          setPlans(data.plans);
        }
        if (data.acquisition) {
          setAcquisition(data.acquisition);
        }
        if (data.nlB2cTarget) {
          setNlB2cTarget(data.nlB2cTarget);
        }
      })
      .catch(() => {
        /* fallback below */
      });
  }, []);

  const showNlB2cTarget = Boolean(acquisition?.technicalReady && nlB2cTarget?.length);
  const paidCheckoutEnabled = acquisition?.paidCheckoutEnabled === true;

  const displayPlans = useMemo(() => {
    const base = plans.length > 0 ? plans : buildFallbackPlans(t);
    if (!showNlB2cTarget || !nlB2cTarget) return base;
    const targetById = new Map(nlB2cTarget.map((p) => [p.planKey, p]));
    return base.map((plan) => {
      const target = targetById.get(plan.id);
      if (!target) return plan;
      return {
        ...plan,
        monthlyPriceEur: target.grossConsumerPriceEur,
        yearlyPriceEur: null,
        yearlyCheckoutAvailable: false,
        monthlyHcGrant: target.monthlyHcGrant,
        vatInclusive: true,
      };
    });
  }, [plans, t, showNlB2cTarget, nlB2cTarget]);

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
      {showIntervalToggle && !showNlB2cTarget ? (
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
            !paidCheckoutEnabled ||
            (interval === "yearly" ? !yearlyAvailable : plan.monthlyPriceEur == null);

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

              {plan.vatInclusive ? (
                <p className={`mt-2 text-sm font-medium ${theme === "dark" ? "text-emerald-300" : "text-emerald-800"}`}>
                  {t("pricing.inclusiveVat" as never)}
                </p>
              ) : null}
              {plan.monthlyHcGrant != null ? (
                <div className="mt-1 space-y-0.5">
                  <p className={`text-sm ${theme === "dark" ? "text-white/70" : "text-zinc-600"}`}>
                    {t("pricing.monthlyHcGrant" as never, { hc: plan.monthlyHcGrant.toLocaleString(locale) })}
                  </p>
                  <p className={`text-xs ${theme === "dark" ? "text-white/50" : "text-zinc-500"}`}>
                    {plan.monthlyHcGrant >= 5000
                      ? locale.startsWith("nl")
                        ? "Richtlijn: ≈11 Motion-renders of ≈160 scènebeelden / maand"
                        : "Approx. ≈11 Motion renders or ≈160 scene images / month"
                      : plan.monthlyHcGrant >= 1800
                        ? locale.startsWith("nl")
                          ? "Richtlijn: ≈4 Motion-renders of ≈60 scènebeelden / maand"
                          : "Approx. ≈4 Motion renders or ≈60 scene images / month"
                        : locale.startsWith("nl")
                          ? "Richtlijn: ≈2 Motion-renders of ≈30 scènebeelden / maand"
                          : "Approx. ≈2 Motion renders or ≈30 scene images / month"}
                  </p>
                </div>
              ) : (
                <p className={`mt-2 text-sm ${theme === "dark" ? "text-white/70" : "text-zinc-600"}`}>
                  {plan.discountPercent}% {t("account.billing.creditDiscount" as never)}
                </p>
              )}
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
                    : !paidCheckoutEnabled
                      ? t("billing.acquisition.notAvailable" as never)
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
