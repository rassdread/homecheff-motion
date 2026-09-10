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
  availableCredits = 0,
  actionLabel,
  source = "insufficient_credits_panel",
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      data-testid="insufficient-credits-panel"
      role="alert"
    >
      <p className="text-sm font-semibold text-amber-100">{t("billing.conversion.insufficientTitle")}</p>
      <p className="mt-1 text-sm text-amber-100/85">
        {t("billing.conversion.insufficientBody", {
          required: estimatedCredits,
          available: availableCredits,
          action: actionLabel ?? t("billing.conversion.thisAction"),
        })}
      </p>
      {wallet.centralHcWalletResolved && wallet.centralHcAvailable > 0 && (
        <p className="mt-2 text-xs text-amber-100/80">
          {locale === "nl"
            ? `Daarnaast heb je ${wallet.centralHcAvailable.toLocaleString(locale)} HC-tegoed in je HomeCheff-wallet. Deze Studio-acties gebruiken momenteel Studio-tegoed.`
            : `You also have ${wallet.centralHcAvailable.toLocaleString(locale)} HC balance. Studio actions currently use Studio credits.`}
        </p>
      )}
      <div className="mt-4">
        <BillingConversionCta source={source} layout="inline" size="sm" />
      </div>
    </div>
  );
}
