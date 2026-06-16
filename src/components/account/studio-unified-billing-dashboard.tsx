"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudioBillingPanel } from "@/components/account/studio-billing-panel";
import { BillingEducationPanel } from "@/components/account/billing-education-panel";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  formatCreditSourceLabel,
  formatLedgerActionLabel,
} from "@/lib/billing-display-labels";
import type { StudioAccountOverview, StudioBillingStatus } from "@/types/studio-account";

type Tab = "wallet" | "usage" | "credits" | "subscription" | "transactions";

const TAB_KEYS: Record<Tab, TranslationKey> = {
  wallet: "account.billing.tab.wallet",
  usage: "account.billing.tab.usage",
  credits: "account.billing.tab.credits",
  subscription: "account.billing.tab.subscription",
  transactions: "account.billing.tab.transactions",
};

const BILLING_STATUS_KEYS: Record<StudioBillingStatus, TranslationKey> = {
  none: "account.billingStatus.none",
  active: "account.billingStatus.active",
  past_due: "account.billingStatus.past_due",
  canceled: "account.billingStatus.canceled",
  prepaid: "account.billingStatus.prepaid",
};

const PLAN_KEYS: Record<string, TranslationKey> = {
  free: "account.plan.free",
  creator: "account.plan.creator",
  pro: "account.plan.pro",
  studio: "account.plan.studio",
  enterprise: "account.plan.enterprise",
};

type Props = {
  initial: StudioAccountOverview;
  planDiscountPercent: number;
};

function parseTab(value: string | null): Tab {
  if (value === "usage" || value === "credits" || value === "subscription" || value === "transactions") {
    return value;
  }
  return "wallet";
}

export function StudioUnifiedBillingDashboard({ initial, planDiscountPercent }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState(initial);
  const urlTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [tabOverride, setTabOverride] = useState<Tab | null>(null);
  const tab = tabOverride ?? urlTab;
  const checkoutNotice = useMemo((): "success" | "cancel" | null => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") return "success";
    if (checkout === "cancel") return "cancel";
    return null;
  }, [searchParams]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const checkoutRefreshDone = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/me/studio-account", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as StudioAccountOverview & { ok: boolean };
    setOverview({
      account: data.account,
      wallet: data.wallet,
      recentLedger: data.recentLedger,
    });
  }, []);

  useEffect(() => {
    if (checkoutNotice === "success" && !checkoutRefreshDone.current) {
      checkoutRefreshDone.current = true;
      void refresh();
    }
  }, [checkoutNotice, refresh]);

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/me/billing/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/account/billing" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? t("account.billing.checkoutError"));
        return;
      }
      window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const tabs = useMemo(
    () =>
      (Object.keys(TAB_KEYS) as Tab[]).map((id) => ({
        id,
        label: t(TAB_KEYS[id]),
      })),
    [t]
  );

  const planLabel = t(PLAN_KEYS[overview.account.studioPlan] ?? "account.plan.free");
  const statusLabel = t(BILLING_STATUS_KEYS[overview.account.billingStatus]);

  return (
    <div className="space-y-6">
      {checkoutNotice === "success" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {t("account.billing.checkoutSuccess")}
        </div>
      ) : null}
      {checkoutNotice === "cancel" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("account.billing.checkoutCancel")}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setTabOverride(row.id)}
            className={`min-h-[44px] rounded-full px-3 py-2 text-xs font-medium sm:py-1.5 ${
              tab === row.id
                ? "bg-emerald-600 text-white"
                : "border border-white/20 text-white/80 hover:bg-white/10"
            }`}
          >
            {row.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void refresh()}
          className="ml-auto min-h-[44px] rounded-full border border-white/20 px-3 py-2 text-xs text-white/70 sm:py-1.5"
        >
          {t("account.billing.refresh")}
        </button>
      </div>

      {(tab === "wallet" || tab === "credits") && (
        <div className="space-y-4">
          <div className={`${studioVisual.cardOnDark} p-5 sm:p-6`}>
            <p className="text-xs uppercase tracking-wide text-white/50">
              {t("account.wallet.availableCredits")}
            </p>
            <p className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {overview.wallet.availableBalance.toLocaleString(locale)}
              <span className="ml-2 text-base font-normal text-white/50">
                {t("account.credits.unit")}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/15 px-3 py-1 text-white/80">
                {planLabel}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                {statusLabel}
              </span>
              {planDiscountPercent > 0 ? (
                <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                  {t("account.billing.planSavingsNote", { percent: planDiscountPercent })}
                </span>
              ) : null}
            </div>
          </div>

          <div className={`${studioVisual.cardOnDark} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4`}>
            <Stat label={t("account.wallet.purchasedCredits")} value={overview.wallet.purchasedBalance} locale={locale} />
            <Stat label={t("account.wallet.bonusCredits")} value={overview.wallet.promotionalBalance} locale={locale} />
            <Stat label={t("account.wallet.reservedCredits")} value={overview.wallet.reservedBalance} locale={locale} />
            <Stat label={t("account.credits.lifetimeSpent")} value={overview.wallet.lifetimeSpent} locale={locale} />
            <Stat label={t("account.credits.lifetimePurchased")} value={overview.wallet.lifetimePurchased} locale={locale} />
            <Stat label={t("account.credits.lifetimeGranted")} value={overview.wallet.lifetimeGranted} locale={locale} />
          </div>

          {tab === "wallet" ? (
            <BillingEducationPanel variant="wallet" planDiscountPercent={planDiscountPercent} />
          ) : null}
        </div>
      )}

      {tab === "usage" && (
        <div className={`${studioVisual.cardOnDark} p-5`}>
          <p className="text-sm text-white/70">{t("account.billing.usageIntro")}</p>
          <Link
            href="/mijn-verbruik"
            className="mt-4 inline-block text-sm font-medium text-emerald-400 hover:underline"
          >
            {t("account.billing.usageLink")} →
          </Link>
        </div>
      )}

      {tab === "subscription" && (
        <div className="space-y-4">
          <div className={`${studioVisual.cardOnDark} p-5`}>
            <p className="text-sm text-white/70">{t("account.billing.subscriptionIntro")}</p>
            <p className="mt-3 text-sm text-white">
              <span className="text-white/60">{t("account.billing.statusLabel")}: </span>
              {statusLabel}
              <span className="mx-2 text-white/30">·</span>
              <span className="text-white/60">{t("account.wallet.planLabel")}: </span>
              {planLabel}
            </p>
            {portalError ? <p className="mt-2 text-sm text-red-300">{portalError}</p> : null}
            <button
              type="button"
              onClick={() => void openPortal()}
              disabled={portalLoading}
              className="mt-4 min-h-[44px] rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
            >
              {portalLoading ? t("account.billing.loading") : t("account.billing.manageSubscription")}
            </button>
          </div>
          <BillingEducationPanel planDiscountPercent={planDiscountPercent} />
          <StudioBillingPanel />
        </div>
      )}

      {(tab === "transactions" || tab === "wallet") && (
        <div className={`${studioVisual.cardOnDark} overflow-hidden p-5`}>
          <h3 className="text-sm font-semibold text-white">{t("account.ledger.title")}</h3>
          {overview.recentLedger.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">{t("account.billing.walletHelpBody")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-2 pr-4 font-medium">{t("account.ledger.action")}</th>
                    <th className="py-2 pr-4 font-medium">{t("account.ledger.source")}</th>
                    <th className="py-2 pr-4 font-medium">{t("account.ledger.delta")}</th>
                    <th className="py-2 font-medium">{t("account.ledger.balance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentLedger.map((row) => {
                    const source = formatCreditSourceLabel(row.creditOrigin, t);
                    return (
                      <tr key={row.id} className="border-b border-white/5">
                        <td className="py-2 pr-4">{formatLedgerActionLabel(row.actionType, t)}</td>
                        <td className="py-2 pr-4 text-white/60">{source ?? "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {row.creditsDelta > 0 ? "+" : ""}
                          {row.creditsDelta.toLocaleString(locale)}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          {row.balanceAfter.toLocaleString(locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "credits" && (
        <>
          <BillingEducationPanel planDiscountPercent={planDiscountPercent} />
          <StudioBillingPanel />
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  locale,
}: {
  label: string;
  value: number;
  locale: string;
}) {
  return (
    <div>
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value.toLocaleString(locale)}</p>
    </div>
  );
}
