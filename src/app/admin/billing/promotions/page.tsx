"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import { AdminPromotionForm } from "@/components/admin/billing/admin-promotion-form";
import { formatPromotionOverviewLine } from "@/lib/studio-promotion-preview";
import type { StudioPromotionSnapshot } from "@/types/studio-billing";

function promotionOverviewLine(promo: StudioPromotionSnapshot): string {
  if (!promo.primaryCode) {
    return `${promo.slug} — ${promo.benefitType} · ${promo.redemptionCount} redeemed · ${promo.promoCodeCount} codes`;
  }
  return formatPromotionOverviewLine({
    code: promo.primaryCode,
    benefitType: promo.benefitType,
    percentageDiscount: promo.percentageDiscount,
    fixedDiscountEur: promo.fixedDiscountEur,
    subscriptionDiscountPercent: promo.subscriptionDiscountPercent,
    discountDuration: promo.discountDuration as "once" | "repeating" | "forever",
    discountDurationMonths: promo.discountDurationMonths,
    allowedPlanSlugs: promo.allowedPlanSlugs,
    specificPlanSlug: promo.specificPlanSlug,
    appliesToMonthly: promo.appliesToMonthly,
    appliesToYearly: promo.appliesToYearly,
    usedCount: promo.primaryCodeUsedCount,
    maxUses: promo.primaryCodeMaxUses,
    active: promo.active,
    stripePromotionCodeId: promo.stripeLinked ? "linked" : null,
    stripeCouponId: promo.stripeCouponId,
  });
}

export default function AdminBillingPromotionsPage() {
  const [promotions, setPromotions] = useState<StudioPromotionSnapshot[]>([]);

  const load = () => {
    void fetch("/api/admin/billing/promotions", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { promotions: StudioPromotionSnapshot[] };
      setPromotions(data.promotions);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string, active: boolean) => {
    await fetch("/api/admin/billing/promotions", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    load();
  };

  return (
    <AdminBillingShell title="Promotions">
      <AdminPromotionForm onCreated={load} />

      <section className="mt-6">
        <h2 className="font-semibold">Overzicht</h2>
        <ul className="mt-3 space-y-3">
          {promotions.map((promo) => (
            <li key={promo.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{promo.name}</p>
                  <p className="mt-1 text-zinc-600">{promotionOverviewLine(promo)}</p>
                  {promo.descriptionInternal ? (
                    <p className="mt-1 text-xs text-zinc-400">{promo.descriptionInternal}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>Type: {promo.benefitType}</span>
                    {promo.stripeCouponId ? (
                      <span>Stripe coupon: {promo.stripeCouponId}</span>
                    ) : (
                      <span>Geen Stripe coupon</span>
                    )}
                    {promo.endDate ? (
                      <span>Geldig t/m {new Date(promo.endDate).toLocaleDateString("nl-NL")}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void toggle(promo.id, !promo.active)}
                  className="shrink-0 text-emerald-700 underline"
                >
                  {promo.active ? "Disable" : "Enable"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminBillingShell>
  );
}
