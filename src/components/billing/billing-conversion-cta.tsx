"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  source: string;
  layout?: "inline" | "stacked";
  showUpgrade?: boolean;
  showViewPricing?: boolean;
  buyHref?: string;
  upgradeHref?: string;
  pricingHref?: string;
  size?: "sm" | "md";
  buyLabel?: string;
};

export function BillingConversionCta({
  source,
  layout = "inline",
  showUpgrade = true,
  showViewPricing = false,
  buyHref = "/account/billing?tab=credits",
  upgradeHref = "/account/billing?tab=subscription",
  pricingHref = "/pricing",
  size = "md",
  buyLabel,
}: Props) {
  const t = useActiveTranslator();
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  const onBuy = () => {
    trackBillingConversionEvent("buy_credits_clicked", { source });
    trackBillingConversionEvent("buy_credits_click", { source });
    if (source === "low_credit_banner") {
      trackBillingConversionEvent("low_credit_cta_click", { source });
    }
  };

  const onUpgrade = () => {
    trackBillingConversionEvent("upgrade_plan_clicked", { source });
    trackBillingConversionEvent("upgrade_plan_click", { source, planId: "upgrade" });
  };

  const onPricing = () => {
    trackBillingConversionEvent("pricing_view", { source });
  };

  const containerClass =
    layout === "stacked" ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2";

  return (
    <div className={containerClass}>
      <Link
        href={buyHref}
        prefetch={false}
        onClick={onBuy}
        className={`${studioVisual.btnPrimary} ${pad} inline-flex min-h-[44px] items-center justify-center font-medium`}
      >
        {buyLabel ?? t("billing.conversion.buyCredits")}
      </Link>
      {showUpgrade ? (
        <Link
          href={upgradeHref}
          prefetch={false}
          onClick={onUpgrade}
          className={`${studioVisual.btnOutline} ${pad} inline-flex min-h-[44px] items-center justify-center font-medium`}
        >
          {t("billing.conversion.upgradePlan")}
        </Link>
      ) : null}
      {showViewPricing ? (
        <Link
          href={pricingHref}
          prefetch={false}
          onClick={onPricing}
          className={`${studioVisual.btnOutline} ${pad} inline-flex min-h-[44px] items-center justify-center font-medium`}
        >
          {t("billing.conversion.viewPlans")}
        </Link>
      ) : null}
    </div>
  );
}
