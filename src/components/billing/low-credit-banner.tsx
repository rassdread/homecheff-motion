"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { BillingConversionCta } from "@/components/billing/billing-conversion-cta";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { resolveLowCreditTier } from "@/lib/billing-conversion-utils";
import { canonicalAmountForLowBalanceWarning } from "@/lib/studio-canonical-balance";

const DISMISS_KEY = "hc-low-credit-banner-dismissed";

export function LowCreditBanner() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));
  const [dismissed, setDismissed] = useState(true);

  const spendable = wallet.resolved
    ? canonicalAmountForLowBalanceWarning(wallet.canonical)
    : null;
  const tier = spendable != null ? resolveLowCreditTier(spendable) : null;
  const isHc = wallet.canonicalUnit === "HC";

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
    if (tier && spendable != null && spendable <= 20) {
      trackBillingConversionEvent("insufficient_credits_seen", {
        source: "low_credit_banner",
        availableCredits: spendable,
      });
    }
  }, [tier, spendable]);

  if (!session.user || !wallet.resolved || spendable == null || !tier || dismissed) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(`${DISMISS_KEY}-${tier}`, "1");
    setDismissed(true);
  };

  const title = isHc
    ? locale === "nl"
      ? "Je HC-saldo raakt op."
      : "You're running low on HC."
    : t("billing.conversion.lowCreditsTitle");
  const body = isHc
    ? locale === "nl"
      ? `Je hebt nog ${spendable.toLocaleString(locale)} HC beschikbaar (onder ${tier}).`
      : `You have ${spendable.toLocaleString(locale)} HC left (below ${tier}).`
    : t("billing.conversion.lowCreditsBody", {
        credits: spendable,
        threshold: tier,
      });

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3"
      role="status"
      data-testid="low-credit-banner"
      data-balance-source={wallet.canonicalSource}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-amber-100">{title}</p>
          <p className="mt-0.5 text-xs text-amber-100/80">{body}</p>
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
                availableCredits: spendable,
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
