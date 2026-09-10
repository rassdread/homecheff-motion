"use client";

import Link from "next/link";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";

type Props = {
  source?: string;
};

export function ZeroCreditsState({ source = "zero_credits" }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));

  const hcLabel = locale === "nl" ? "HC-tegoed" : "HC balance";

  const showCentralCopy =
    wallet.resolved &&
    wallet.centralHcWalletResolved &&
    wallet.centralHcAvailable > 0 &&
    wallet.centralHcIdentityResolved;

  if (!session.user || !wallet.resolved) {
    // Avoid flashing "0 credits" when central HC is still loading.
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
      >
        <p className="text-lg font-semibold text-white">—</p>
      </div>
    );
  }

  if (showCentralCopy) {
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
      >
        <p className="text-lg font-semibold text-white">
          {locale === "nl"
            ? `${wallet.centralHcAvailable.toLocaleString(locale)} ${hcLabel} beschikbaar`
            : `${wallet.centralHcAvailable.toLocaleString(locale)} ${hcLabel} available`}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {locale === "nl"
            ? `Je HomeCheff-wallet heeft ${wallet.centralHcAvailable.toLocaleString(locale)} HC. AI-acties in Studio gebruiken dit tegoed (niet het legacy Studio-tegoed van 0).`
            : `Your HomeCheff wallet has ${wallet.centralHcAvailable.toLocaleString(locale)} HC. Studio AI actions use this balance (not the legacy Studio credit meter at 0).`}
        </p>
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

  if (wallet.centralHcIdentityResolved && !wallet.centralHcWalletResolved) {
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
      >
        <p className="text-lg font-semibold text-white">
          {locale === "nl" ? "HC-tegoed tijdelijk niet beschikbaar" : "HC balance temporarily unavailable"}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {locale === "nl"
            ? "We konden je HomeCheff-wallet nu niet laden. Dit is geen 0-saldo — probeer het zo opnieuw."
            : "We could not load your HomeCheff wallet right now. This is not a zero balance — try again shortly."}
        </p>
      </div>
    );
  }

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
