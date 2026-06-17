"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { resolveLowCreditTier } from "@/lib/billing-conversion-utils";

const DISMISS_KEY = "hc-low-credit-banner-dismissed";

export function LowCreditBanner() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));
  const [dismissed, setDismissed] = useState(true);

  const tier = wallet.resolved ? resolveLowCreditTier(wallet.availableCredits) : null;

  useEffect(() => {
    if (!tier) {
      return;
    }
    const key = `${DISMISS_KEY}-${tier}`;
    queueMicrotask(() => {
      setDismissed(sessionStorage.getItem(key) === "1");
    });
  }, [tier]);

  useEffect(() => {
    if (tier && wallet.availableCredits <= 20) {
      trackBillingConversionEvent("insufficient_credits_seen", {
        source: "low_credit_banner",
        availableCredits: wallet.availableCredits,
      });
    }
  }, [tier, wallet.availableCredits]);

  if (!session.user || !wallet.resolved || !tier || dismissed) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(`${DISMISS_KEY}-${tier}`, "1");
    setDismissed(true);
  };

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="status"
      data-testid="low-credit-banner"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-amber-100">{t("billing.conversion.lowCreditsTitle")}</p>
          <p className="mt-0.5 text-xs text-amber-100/80">
            {t("billing.conversion.lowCreditsBody", {
              credits: wallet.availableCredits,
              threshold: tier,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BillingConversionCta
            source="low_credit_banner"
            size="sm"
            buyHref="/account/billing?tab=credits"
          />
          <button
            type="button"
            onClick={() => {
              trackBillingConversionEvent("low_credit_banner_clicked", {
                source: "dismiss",
                availableCredits: wallet.availableCredits,
              });
              dismiss();
            }}
            className="min-h-[44px] px-2 text-xs text-amber-100/70 hover:text-amber-50"
          >
            {t("billing.conversion.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
