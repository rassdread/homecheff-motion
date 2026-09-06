"use client";

import { useCallback, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  fetchStudioAccountJson,
  invalidateStudioAccountCache,
} from "@/lib/studio-account-client";
import type { TranslationKey } from "@/i18n";
import {
  formatCreditSourceLabel,
  formatLedgerActionLabel,
} from "@/lib/billing-display-labels";
import type { StudioAccountOverview, StudioBillingStatus } from "@/types/studio-account";

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
  showSettings?: boolean;
  showLedger?: boolean;
};

export function StudioAccountDashboard({
  initial,
  showSettings = false,
  showLedger = true,
}: Props) {
  const t = useActiveTranslator();
  const [overview, setOverview] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    invalidateStudioAccountCache();
    const data = await fetchStudioAccountJson({ force: true, view: "full" });
    if (!data) return;
    setOverview({
      account: data.account,
      wallet: data.wallet,
      recentLedger: data.recentLedger,
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/studio-account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoChargeSmallActions: overview.account.autoChargeSmallActions,
          confirmAboveCredits: overview.account.confirmAboveCredits,
        }),
      });
      if (!res.ok) {
        setError(t("account.settings.saveError"));
        return;
      }
      invalidateStudioAccountCache();
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const { account, wallet } = overview;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={`${studioVisual.cardOnDark} p-5`}>
          <p className="text-xs uppercase tracking-wide text-white/50">{t("account.plan.label")}</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {t(PLAN_KEYS[account.studioPlan] ?? "account.plan.free")}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {t(BILLING_STATUS_KEYS[account.billingStatus])}
          </p>
        </div>
        <div className={`${studioVisual.cardOnDark} p-5`}>
          <p className="text-xs uppercase tracking-wide text-white/50">{t("account.credits.label")}</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {wallet.availableBalance.toLocaleString()} {t("account.credits.unit")}
          </p>
          {wallet.reservedBalance > 0 && (
            <p className="mt-1 text-sm text-white/60">
              {t("account.credits.reserved", { count: wallet.reservedBalance })}
            </p>
          )}
        </div>
        <div className={`${studioVisual.cardOnDark} p-5`}>
          <p className="text-xs uppercase tracking-wide text-white/50">{t("account.policy.label")}</p>
          <p className="mt-1 text-sm text-white/80">
            {t("account.policy.version", { version: account.creditPolicyVersion })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/50">{t("account.policy.v1Copy")}</p>
        </div>
      </div>

      {account.billingStatus === "prepaid" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {t("account.prepaidNotice")}
        </div>
      )}

      <div className={`${studioVisual.cardOnDark} p-5`}>
        <h2 className="text-lg font-semibold text-white">Deel Studio</h2>
        <p className="mt-1 text-sm text-white/60">
          Nodig iemand uit voor HomeCheff Studio (niet het delen van je content).
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          onClick={async () => {
            const url = "https://studio.homecheff.eu/signup";
            try {
              if (navigator.share) {
                await navigator.share({
                  title: "HomeCheff Studio",
                  text: "Bekijk HomeCheff Studio voor het maken van content.",
                  url,
                });
              } else {
                await navigator.clipboard.writeText(url);
              }
            } catch {
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                /* ignore */
              }
            }
          }}
        >
          Deel Studio
        </button>
        <a
          href="https://homecheff.eu/werken-bij"
          className="mt-2 inline-block text-sm text-white/70 underline hover:text-white"
        >
          Verdien met HomeCheff
        </a>
      </div>

      {showSettings && (
        <div className={`${studioVisual.cardOnDark} p-5`}>
          <h2 className="text-lg font-semibold text-white">{t("account.settings.chargesTitle")}</h2>
          <p className="mt-1 text-sm text-white/60">{t("account.settings.chargesIntro")}</p>
          <label className="mt-4 flex items-center gap-3 text-sm text-white/80">
            <input
              type="checkbox"
              checked={account.autoChargeSmallActions}
              onChange={(e) =>
                setOverview((prev) => ({
                  ...prev,
                  account: { ...prev.account, autoChargeSmallActions: e.target.checked },
                }))
              }
              className="h-4 w-4 rounded border-white/30"
            />
            {t("account.settings.autoCharge")}
          </label>
          <label className="mt-4 block text-sm text-white/80">
            {t("account.settings.confirmThreshold")}
            <input
              type="number"
              min={1}
              max={10000}
              value={account.confirmAboveCredits}
              onChange={(e) =>
                setOverview((prev) => ({
                  ...prev,
                  account: {
                    ...prev.account,
                    confirmAboveCredits: Number(e.target.value) || 100,
                  },
                }))
              }
              className="mt-1 w-full max-w-xs rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? t("account.settings.saving") : t("account.settings.save")}
          </button>
        </div>
      )}

      {showLedger && overview.recentLedger.length > 0 && (
        <div className={`${studioVisual.cardOnDark} overflow-hidden`}>
          <div className="border-b border-white/10 px-5 py-3">
            <h2 className="text-lg font-semibold text-white">{t("account.ledger.title")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="px-5 py-2 font-medium">{t("account.ledger.date")}</th>
                  <th className="px-5 py-2 font-medium">{t("account.ledger.action")}</th>
                  <th className="px-5 py-2 font-medium">{t("account.ledger.source")}</th>
                  <th className="px-5 py-2 font-medium">{t("account.ledger.delta")}</th>
                  <th className="px-5 py-2 font-medium">{t("account.ledger.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentLedger.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 text-white/80">
                    <td className="px-5 py-2 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-2">{formatLedgerActionLabel(row.actionType, t)}</td>
                    <td className="px-5 py-2 text-white/60">
                      {formatCreditSourceLabel(row.creditOrigin, t) ?? "—"}
                    </td>
                    <td className="px-5 py-2">
                      {row.creditsDelta > 0 ? "+" : ""}
                      {row.creditsDelta}
                    </td>
                    <td className="px-5 py-2">{row.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
