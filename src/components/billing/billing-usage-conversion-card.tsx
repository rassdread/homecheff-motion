"use client";

import { AppCard } from "@/components/ui/app-card";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { estimateDaysRemaining } from "@/lib/billing-conversion-utils";
import { resolveConversionSurface, resolveUsageLevel } from "@/lib/conversion-surface-engine";

type Props = {
  creditsUsedLast30Days: number;
};

export function BillingUsageConversionCard({ creditsUsedLast30Days }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const wallet = useStudioWalletSummary(true);
  const daysRemaining = estimateDaysRemaining({
    availableCredits: wallet.availableCredits,
    creditsUsedLast30Days,
  });

  const surface = wallet.resolved
    ? resolveConversionSurface({
        currentPlan: wallet.plan,
        availableCredits: wallet.availableCredits,
        pageType: "usage",
        loggedIn: true,
        usageLevel: resolveUsageLevel(wallet.availableCredits),
        creditsUsedThisMonth: creditsUsedLast30Days,
      })
    : null;

  return (
    <div className="space-y-4">
      <AppCard>
        <h2 className="text-lg font-semibold text-zinc-900">{t("billing.conversion.usageSummaryTitle")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500">{t("billing.conversion.creditsRemaining")}</dt>
            <dd className="text-xl font-semibold text-zinc-900">
              {wallet.resolved
                ? wallet.availableCredits.toLocaleString(locale)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t("billing.conversion.creditsUsedPeriod")}</dt>
            <dd className="text-xl font-semibold text-zinc-900">
              {creditsUsedLast30Days.toLocaleString(locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{t("billing.conversion.estimatedDaysRemaining")}</dt>
            <dd className="text-xl font-semibold text-zinc-900">
              {daysRemaining == null
                ? t("billing.conversion.daysUnknown")
                : t("billing.conversion.daysValue", { days: daysRemaining })}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <BillingConversionCta source="usage_page" showViewPricing />
        </div>
      </AppCard>

      {surface?.showPromoCampaign && surface.promoPlanId ? (
        <AppCard className="border-emerald-100 bg-emerald-50/60">
          <p className="text-sm font-semibold text-emerald-950">
            {t("billing.conversion.surface.usageRecommendationTitle")}
          </p>
          <p className="mt-1 text-sm text-emerald-900/85">
            {t(`billing.conversion.surface.recommendUpgrade.${surface.promoPlanId}` as never)}
          </p>
          <div className="mt-4">
            <BillingConversionCta source="usage_page_promo" showUpgrade showViewPricing={false} />
          </div>
        </AppCard>
      ) : null}
    </div>
  );
}
