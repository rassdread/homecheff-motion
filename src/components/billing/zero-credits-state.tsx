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

  if (!session.user || !wallet.resolved) {
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
      >
        <p className="text-lg font-semibold text-white">—</p>
      </div>
    );
  }

  if (wallet.canonicalSource === "unavailable") {
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
      >
        <p className="text-lg font-semibold text-white">
          {locale === "nl" ? "HC-saldo tijdelijk niet beschikbaar" : "HC balance temporarily unavailable"}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {locale === "nl"
            ? "We konden je HomeCheff-wallet nu niet laden. Dit is geen 0-saldo — probeer het zo opnieuw."
            : "We could not load your HomeCheff wallet right now. This is not a zero balance — try again shortly."}
        </p>
      </div>
    );
  }

  const spendable = wallet.canonicalSpendable ?? 0;
  if (spendable > 0) {
    const unit = wallet.canonicalUnit === "HC" ? "HC" : t("account.credits.unit");
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
        data-testid="zero-credits-state"
        data-balance-source={wallet.canonicalSource}
      >
        <p className="text-lg font-semibold text-white">
          {locale === "nl"
            ? `${spendable.toLocaleString(locale)} ${unit} beschikbaar`
            : `${spendable.toLocaleString(locale)} ${unit} available`}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {locale === "nl"
            ? "Dit is je beschikbare HomeCheff Credits-saldo voor Studio-acties."
            : "This is your available HomeCheff Credits balance for Studio actions."}
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

  return (
    <div
      className="rounded-xl border border-white/15 bg-white/5 p-6 text-center"
      data-testid="zero-credits-state"
      data-balance-source={wallet.canonicalSource}
    >
      <p className="text-lg font-semibold text-white">
        {wallet.canonicalUnit === "HC"
          ? locale === "nl"
            ? "Je hebt momenteel geen HC beschikbaar"
            : "You currently have no HC available"
          : t("billing.conversion.zeroCreditsTitle")}
      </p>
      <p className="mt-2 text-sm text-white/70">
        {wallet.canonicalUnit === "HC"
          ? locale === "nl"
            ? "Koop HC of upgrade je plan om door te gaan met AI-acties in Studio."
            : "Buy HC or upgrade your plan to continue AI actions in Studio."
          : t("billing.conversion.zeroCreditsBody")}
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
