"use client";

import { useState } from "react";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";
import {
  STUDIO_CREDIT_PACK_DISPLAY,
  STUDIO_PLAN_DISPLAY,
} from "@/lib/studio-account-display-config";
import { studioVisual } from "@/lib/studio-visual-tokens";

export function StudioBillingPanel() {
  const t = useActiveTranslator();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (type: "subscription" | "credit_pack", id: string) => {
    setLoading(id);
    setError(null);
    try {
      const body =
        type === "subscription"
          ? { type, planId: id, returnPath: "/account/billing" }
          : { type, packId: id, returnPath: "/account/billing" };
      const res = await fetch("/api/me/studio-credits/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { url?: string; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "STRIPE_NOT_CONFIGURED") {
          setError(t("account.billing.stripeNotConfigured"));
        } else {
          setError(data.error ?? t("account.billing.checkoutError"));
        }
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white">{t("account.billing.plansTitle")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("account.billing.plansIntro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_PLAN_DISPLAY.map((plan) => (
            <div key={plan.id} className={`${studioVisual.cardOnDark} flex flex-col p-5`}>
              <h3 className="font-semibold text-white">{t(plan.labelKey as TranslationKey)}</h3>
              <p className="mt-1 text-2xl font-bold text-white">
                €{plan.monthlyPriceEur}
                <span className="text-sm font-normal text-white/50">/mo</span>
              </p>
              <p className="mt-2 text-sm text-white/70">
                {plan.monthlyCredits.toLocaleString()} {t("account.credits.unit")}/mo
              </p>
              <button
                type="button"
                onClick={() => startCheckout("subscription", plan.id)}
                disabled={loading === plan.id}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading === plan.id ? t("account.billing.loading") : t("account.billing.subscribe")}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">{t("account.billing.packsTitle")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("account.billing.packsIntro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_CREDIT_PACK_DISPLAY.map((pack) => (
            <div key={pack.id} className={`${studioVisual.cardOnDark} flex flex-col p-5`}>
              <p className="font-semibold text-white">
                {pack.credits.toLocaleString()} {t("account.credits.unit")}
              </p>
              <p className="mt-1 text-xl font-bold text-white">€{pack.priceEur.toFixed(2)}</p>
              <button
                type="button"
                onClick={() => startCheckout("credit_pack", pack.id)}
                disabled={loading === pack.id}
                className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
              >
                {loading === pack.id ? t("account.billing.loading") : t("account.billing.buyPack")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
