"use client";

import { useEffect, useState } from "react";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { SubscriptionPlanCards } from "@/components/billing/subscription-plan-cards";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  formatCampaignCodeReason,
  pickCampaignSummary,
} from "@/lib/billing-display-labels";
import { formatPriceEur } from "@/lib/format-price-eur";
import type { SubscriptionBillingInterval } from "@/lib/studio-subscription-billing";
import { STUDIO_CREDIT_PACK_DISPLAY } from "@/lib/studio-account-display-config";

type CatalogPack = {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceEur: number;
};

type PromoPreview = {
  valid: boolean;
  summaryNl?: string;
  summaryEn?: string;
  bonusCredits?: number;
  discountEur?: number;
  adjustedPriceEur?: number;
  reason?: string;
};

export function StudioBillingPanel() {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<CatalogPack[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState<PromoPreview | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    type: "subscription" | "credit_pack";
    id: string;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/billing/catalog")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { packs: CatalogPack[] };
        setPacks(data.packs);
      })
      .catch(() => {
        /* fallback display config used below if empty */
      });
  }, []);

  const applyPromo = async (checkoutType: "subscription" | "credit_pack", targetId: string) => {
    if (!promoCode.trim()) {
      setPromoPreview(null);
      return;
    }
    const res = await fetch("/api/me/billing/promo/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, checkoutType, planId: targetId, packId: targetId }),
    });
    const data = (await res.json()) as { preview: PromoPreview };
    setPromoPreview(data.preview);
  };

  const startCheckout = async (
    type: "subscription" | "credit_pack",
    id: string,
    billingInterval?: SubscriptionBillingInterval
  ) => {
    setLoading(id);
    setError(null);
    setPendingCheckout({ type, id });
    try {
      if (promoCode.trim()) {
        await applyPromo(type, id);
      }
      const res = await fetch("/api/me/studio-credits/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          planId: type === "subscription" ? id : undefined,
          packId: type === "credit_pack" ? id : undefined,
          billingInterval: type === "subscription" ? (billingInterval ?? "monthly") : undefined,
          returnPath: "/account/billing",
          promoCode: promoCode.trim() || undefined,
        }),
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

  const displayPacks =
    packs.length > 0
      ? packs
      : STUDIO_CREDIT_PACK_DISPLAY.map((pack) => ({
          id: pack.id,
          name: String(pack.credits),
          credits: pack.credits,
          bonusCredits: 0,
          totalCredits: pack.credits,
          priceEur: pack.priceEur,
        }));

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className={`${studioVisual.cardOnDark} p-5`}>
        <h3 className="text-sm font-semibold text-white">{t("account.billing.promoTitle" as never)}</h3>
        <p className="mt-1 text-xs text-white/60">{t("account.billing.promoIntro" as never)}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder={t("account.billing.promoPlaceholder" as never)}
            className="min-h-[44px] flex-1 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (pendingCheckout) {
                void applyPromo(pendingCheckout.type, pendingCheckout.id);
              }
            }}
            className="min-h-[44px] rounded-lg border border-white/20 px-4 py-2 text-sm text-white"
          >
            {t("account.billing.promoApply" as never)}
          </button>
        </div>
        {promoPreview?.valid ? (
          <p className="mt-2 text-sm text-emerald-300">
            {pickCampaignSummary(promoPreview, locale)}
          </p>
        ) : promoPreview && !promoPreview.valid ? (
          <p className="mt-2 text-sm text-red-300">
            {formatCampaignCodeReason(promoPreview.reason, t)}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">{t("account.billing.plansTitle")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("account.billing.plansIntro")}</p>
        <div className="mt-4">
          <SubscriptionPlanCards
            theme="dark"
            loadingPlanId={loading}
            onSubscribe={(planId, interval) => void startCheckout("subscription", planId, interval)}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">{t("account.billing.packsTitle")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("account.billing.packsIntro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayPacks.map((pack) => (
            <div key={pack.id} className={`${studioVisual.cardOnDark} flex flex-col p-5`}>
              <p className="font-semibold text-white">
                {(pack.totalCredits ?? pack.credits).toLocaleString()} {t("account.credits.unit")}
              </p>
              {pack.bonusCredits > 0 ? (
                <p className="text-xs text-emerald-300">
                  {t("account.billing.bonusCredits", { count: pack.bonusCredits })}
                </p>
              ) : null}
              <p className="mt-1 text-xl font-bold text-white">{formatPriceEur(pack.priceEur, locale)}</p>
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
