"use client";

import Link from "next/link";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStudioWalletSummary } from "@/hooks/use-studio-wallet-summary";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";
import { studioVisual } from "@/lib/studio-visual-tokens";

const PLAN_KEYS: Record<string, string> = {
  free: "account.plan.free",
  creator: "account.plan.creator",
  pro: "account.plan.pro",
  studio: "account.plan.studio",
  enterprise: "account.plan.enterprise",
};

export function GlobalCreditIndicator({ variant = "header" }: { variant?: "header" | "compact" }) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const wallet = useStudioWalletSummary(Boolean(session.user));

  if (!session.resolved || !session.user) {
    return null;
  }

  if (!wallet.resolved) {
    return (
      <span
        className="hidden h-9 w-28 animate-pulse rounded-full bg-white/10 lg:block"
        aria-hidden
      />
    );
  }

  const planKey = PLAN_KEYS[wallet.plan] ?? "account.plan.free";
  const planLabel = t(planKey as never);
  const creditsLabel = wallet.availableCredits.toLocaleString(locale);

  const onBuy = () => {
    trackBillingConversionEvent("buy_credits_clicked", {
      source: "global_credit_indicator",
      availableCredits: wallet.availableCredits,
    });
    trackBillingConversionEvent("buy_credits_click", {
      source: "global_credit_indicator",
      availableCredits: wallet.availableCredits,
    });
  };

  if (variant === "compact") {
    return (
      <Link
        href="/account/billing"
        prefetch={false}
        className="flex min-h-[44px] flex-col rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
      >
        <span className="text-[10px] uppercase tracking-wide text-white/50">
          {t("billing.conversion.availableCredits")}
        </span>
        <span className="text-sm font-semibold text-white">
          {creditsLabel} {t("account.credits.unit")}
        </span>
      </Link>
    );
  }

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-2 pr-1 py-1 lg:flex"
      data-testid="global-credit-indicator"
    >
      <Link href="/account/billing" prefetch={false} className="min-w-0 text-left hover:opacity-90">
        <p className="text-[10px] uppercase tracking-wide text-white/50 leading-none">
          {creditsLabel} {t("account.credits.unit")}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-white/90">{planLabel}</p>
      </Link>
      <Link
        href="/account/billing?tab=credits"
        prefetch={false}
        onClick={onBuy}
        className={`${studioVisual.btnPrimary} shrink-0 px-3 py-1.5 text-xs font-medium`}
      >
        {t("billing.conversion.buyCreditsShort")}
      </Link>
    </div>
  );
}
