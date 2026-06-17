"use client";

import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { useActiveTranslator } from "@/i18n/client";
import { resolveLowCreditTier } from "@/lib/billing-conversion-utils";

type Props = {
  creditsRemaining: number;
  creditsUsed?: number;
  source?: string;
};

export function PostGenerationCreditNotice({
  creditsRemaining,
  creditsUsed,
  source = "post_generation",
}: Props) {
  const t = useActiveTranslator();
  const lowTier = resolveLowCreditTier(creditsRemaining);

  return (
    <div
      className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50"
      data-testid="post-generation-credit-notice"
    >
      <p>
        {creditsUsed != null && creditsUsed > 0
          ? t("billing.conversion.postGenerationUsed", {
              used: creditsUsed,
              remaining: creditsRemaining,
            })
          : t("billing.conversion.postGenerationRemaining", { remaining: creditsRemaining })}
      </p>
      {lowTier ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-emerald-100/90">{t("billing.conversion.lowCreditsTitle")}</p>
          <BillingConversionCta source={source} size="sm" buyHref="/account/billing?tab=credits" />
        </div>
      ) : null}
    </div>
  );
}
