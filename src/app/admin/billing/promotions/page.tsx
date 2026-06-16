"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StudioPromotionSnapshot } from "@/types/studio-billing";

export default function AdminBillingPromotionsPage() {
  const [promotions, setPromotions] = useState<StudioPromotionSnapshot[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    benefitType: "bonus_credits",
    creditAmount: 50,
    maxRedemptions: 1000,
    grantType: "PROMOTIONAL",
  });

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

  const createPromotion = async () => {
    await fetch("/api/admin/billing/promotions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maximumUsers: form.maxRedemptions,
      }),
    });
    load();
  };

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
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Create promotion</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Name"
            className="rounded border px-2 py-1 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            placeholder="Slug"
            className="rounded border px-2 py-1 text-sm"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
          <select
            className="rounded border px-2 py-1 text-sm"
            value={form.benefitType}
            onChange={(e) => setForm((f) => ({ ...f, benefitType: e.target.value }))}
          >
            <option value="bonus_credits">Bonus credits</option>
            <option value="percentage_discount">Percentage discount</option>
            <option value="fixed_discount">Fixed discount</option>
            <option value="subscription_discount">Subscription discount</option>
            <option value="credit_pack_bonus">Credit pack bonus</option>
            <option value="free_trial_credits">Free trial credits</option>
          </select>
          <input
            type="number"
            placeholder="Credits / max redemptions"
            className="rounded border px-2 py-1 text-sm"
            value={form.creditAmount}
            onChange={(e) => setForm((f) => ({ ...f, creditAmount: Number(e.target.value) }))}
          />
        </div>
        <button
          type="button"
          onClick={() => void createPromotion()}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          Create
        </button>
      </section>

      <ul className="space-y-3">
        {promotions.map((promo) => (
          <li key={promo.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{promo.name}</p>
                <p className="text-zinc-500">
                  {promo.benefitType} · {promo.redemptionCount} redeemed · {promo.promoCodeCount}{" "}
                  codes
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggle(promo.id, !promo.active)}
                className="text-emerald-700 underline"
              >
                {promo.active ? "Disable" : "Enable"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminBillingShell>
  );
}
