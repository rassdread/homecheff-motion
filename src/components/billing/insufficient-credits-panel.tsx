"use client";

import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";

type Props = {
  estimatedCredits: number;
  availableCredits?: number;
  actionLabel?: string;
  source?: string;
};

export function InsufficientCreditsPanel({
  estimatedCredits,
  availableCredits,
  actionLabel,
  source = "insufficient_credits_panel",
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));

  const resolvedAvailable =
    availableCredits ??
    (wallet.canonicalSpendable != null ? wallet.canonicalSpendable : 0);
  const unit = wallet.canonicalUnit === "HC" ? "HC" : t("account.credits.unit");

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      data-testid="insufficient-credits-panel"
      data-balance-source={wallet.canonicalSource}
      role="alert"
    >
      <p className="text-sm font-semibold text-amber-100">
        {wallet.canonicalUnit === "HC"
          ? locale === "nl"
            ? "Onvoldoende HC"
            : "Not enough HC"
          : t("billing.conversion.insufficientTitle")}
      </p>
      <p className="mt-1 text-sm text-amber-100/85">
        {locale === "nl"
          ? `Je hebt ${resolvedAvailable.toLocaleString(locale)} ${unit} beschikbaar, maar ${estimatedCredits.toLocaleString(locale)} ${unit} is nodig voor ${actionLabel ?? t("billing.conversion.thisAction")}.`
          : `You have ${resolvedAvailable.toLocaleString(locale)} ${unit} available, but ${estimatedCredits.toLocaleString(locale)} ${unit} is needed for ${actionLabel ?? t("billing.conversion.thisAction")}.`}
      </p>
      <div className="mt-4">
        <BillingConversionCta source={source} layout="inline" size="sm" />
      </div>
    </div>
  );
}
