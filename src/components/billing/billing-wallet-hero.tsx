"use client";

import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { CreditPackPromoGrid } from "@/components/billing/credit-pack-promo-grid";
import { SubscriptionUpgradePromo } from "@/components/billing/subscription-upgrade-promo";
import { ZeroCreditsState } from "@/components/billing/zero-credits-state";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { isZeroCredits } from "@/lib/billing-conversion-utils";

type Props = {
  availableCredits: number;
  planLabel: string;
  planId: string;
  planDiscountPercent: number;
  onBuyPack?: (packId: string) => void;
  loadingPackId?: string | null;
};

export function BillingWalletHero({
  availableCredits,
  planLabel,
  planId,
  planDiscountPercent,
  onBuyPack,
  loadingPackId,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();

  if (isZeroCredits(availableCredits)) {
    return <ZeroCreditsState source="billing_wallet_hero" />;
  }

  return (
    <div className="space-y-4">
      <div className={`${studioVisual.cardOnDark} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">
              {t("billing.conversion.availableCredits")}
            </p>
            <p className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {availableCredits.toLocaleString(locale)}
              <span className="ml-2 text-base font-normal text-white/50">
                {t("account.credits.unit")}
              </span>
            </p>
            <p className="mt-2 text-sm text-white/70">
              {t("account.wallet.planLabel")}: <span className="font-medium text-white">{planLabel}</span>
            </p>
            {planDiscountPercent > 0 ? (
              <p className="mt-1 text-xs text-emerald-300">
                {t("account.billing.planSavingsNote", { percent: planDiscountPercent })}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-white/50">{t("billing.conversion.creditsCarryOver")}</p>
          </div>
          <BillingConversionCta source="billing_wallet_hero" layout="stacked" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">{t("account.billing.packsTitle")}</h3>
        <p className="mt-1 text-xs text-white/60">{t("account.billing.packsIntro")}</p>
        <div className="mt-3">
          <CreditPackPromoGrid onBuyPack={onBuyPack} loadingPackId={loadingPackId} />
        </div>
      </div>

      <SubscriptionUpgradePromo planId={planId} planDiscountPercent={planDiscountPercent} />
    </div>
  );
}
