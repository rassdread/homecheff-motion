"use client";

import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator } from "@/i18n/client";

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
      <div className="mt-4">
        <BillingConversionCta source={source} layout="inline" size="sm" />
      </div>
    </div>
  );
}
