"use client";

import Link from "next/link";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  source?: string;
};

export function ZeroCreditsState({ source = "zero_credits" }: Props) {
  const t = useActiveTranslator();

  return (
    <div
      className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
      data-testid="zero-credits-state"
    >
      <p className="text-lg font-semibold text-white">{t("billing.conversion.zeroCreditsTitle")}</p>
      <p className="mt-2 text-sm text-white/70">{t("billing.conversion.zeroCreditsBody")}</p>
      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <BillingConversionCta source={source} layout="inline" showViewPricing />
        <Link
          href="/pricing"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          {t("billing.conversion.viewPlans")}
        </Link>
      </div>
    </div>
  );
}
