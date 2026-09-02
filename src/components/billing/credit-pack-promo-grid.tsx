"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { PACK_BADGES, pricePerCredit } from "@/lib/billing-conversion-utils";
import { trackBillingConversionEvent } from "@/lib/billing-conversion-analytics";

type CatalogPack = {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceEur: number;
};

type Props = {
  onBuyPack?: (packId: string) => void;
  loadingPackId?: string | null;
  compact?: boolean;
};

const FALLBACK_PACKS: CatalogPack[] = [
  { id: "pack_500", name: "250", credits: 250, bonusCredits: 0, totalCredits: 250, priceEur: 4.99 },
  { id: "pack_1250", name: "500", credits: 500, bonusCredits: 0, totalCredits: 500, priceEur: 9.99 },
  { id: "pack_3000", name: "1000", credits: 1000, bonusCredits: 0, totalCredits: 1000, priceEur: 19.99 },
  { id: "pack_8000", name: "2500", credits: 2500, bonusCredits: 0, totalCredits: 2500, priceEur: 49.99 },
];

export function CreditPackPromoGrid({ onBuyPack, loadingPackId, compact = false }: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [packs, setPacks] = useState<CatalogPack[]>(FALLBACK_PACKS);

  useEffect(() => {
    void fetch("/api/billing/catalog")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { packs: CatalogPack[] };
        if (data.packs?.length) {
          setPacks(data.packs);
        }
      })
      .catch(() => {
        /* fallback */
      });
  }, []);

  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
      {packs.map((pack) => {
        const badge = PACK_BADGES[pack.id];
        const total = pack.totalCredits ?? pack.credits;
        const ppc = pricePerCredit(pack.priceEur, total);
        return (
          <div
            key={pack.id}
            className={`relative flex flex-col ${studioVisual.cardOnDark} p-4 ${badge ? "ring-1 ring-emerald-500/40" : ""}`}
          >
            {badge ? (
              <span className="absolute -top-2 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                {t(`billing.conversion.packBadge.${badge}` as never)}
              </span>
            ) : null}
            <p className="font-semibold text-white">
              {total.toLocaleString(locale)} HC
            </p>
            <p className="mt-1 text-xl font-bold text-white">€{pack.priceEur.toFixed(2)}</p>
            <p className="mt-1 text-xs text-white/60">
              {t("billing.conversion.pricePerCredit", { price: ppc.toFixed(4) })}
            </p>
            {pack.bonusCredits > 0 ? (
              <p className="text-xs text-emerald-300">
                {t("account.billing.bonusCredits", { count: pack.bonusCredits })}
              </p>
            ) : null}
            <button
              type="button"
              disabled={loadingPackId === pack.id}
              onClick={() => {
                trackBillingConversionEvent("credit_pack_selected", {
                  source: "credit_pack_promo_grid",
                  packId: pack.id,
                });
                onBuyPack?.(pack.id);
              }}
              className="mt-4 min-h-[44px] rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              {loadingPackId === pack.id
                ? t("account.billing.loading")
                : t("account.billing.buyPack")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
