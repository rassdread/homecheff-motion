"use client";

import Link from "next/link";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

type Props = {
  planId: string;
  planDiscountPercent?: number;
  variant?: "card" | "inline";
};

export function SubscriptionUpgradePromo({
  planId,
  planDiscountPercent = 0,
  variant = "card",
}: Props) {
  const t = useActiveTranslator();

  if (planId !== "free") {
    return null;
  }

  const body = (
    <>
      <p className="text-sm font-semibold text-white">{t("billing.conversion.upgradeWhyTitle")}</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/75">
        <li>{t("billing.conversion.upgradeBenefit.pricing")}</li>
        <li>{t("billing.conversion.upgradeBenefit.carryOver")}</li>
        <li>{t("billing.conversion.upgradeBenefit.storage")}</li>
        <li>{t("billing.conversion.upgradeBenefit.features")}</li>
      </ul>
      {planDiscountPercent > 0 ? (
        <p className="mt-2 text-xs text-emerald-300">
          {t("account.billing.planSavingsNote", { percent: planDiscountPercent })}
        </p>
      ) : null}
      <div className="mt-4">
        <Link
          href="/account/billing?tab=subscription"
          prefetch={false}
          onClick={() =>
            trackBillingConversionEvent("subscription_upgrade_selected", {
              source: "subscription_upgrade_promo",
            })
          }
          className={`${studioVisual.btnPrimary} inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-medium`}
        >
          {t("billing.conversion.upgradeSubscription")}
        </Link>
      </div>
    </>
  );

  if (variant === "inline") {
    return <div className="text-left">{body}</div>;
  }

  return <div className={`${studioVisual.cardOnDark} p-5`}>{body}</div>;
}
