"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StudioSubscriptionPlanSnapshot } from "@/types/studio-billing";

function planYearlyWarning(plan: StudioSubscriptionPlanSnapshot): string | null {
  if (plan.yearlyPriceEur != null && plan.yearlyPriceEur > 0 && !plan.stripePriceIdYearly?.trim()) {
    return "Missing yearly Stripe Price ID — yearly checkout will fail.";
  }
  if (!plan.stripePriceIdMonthly?.trim() && plan.monthlyPriceEur != null && plan.monthlyPriceEur > 0) {
    return "Missing monthly Stripe Price ID — monthly checkout will fail.";
  }
  return null;
}

export default function AdminBillingSubscriptionsPage() {
  const [plans, setPlans] = useState<StudioSubscriptionPlanSnapshot[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    void fetch("/api/admin/billing/subscriptions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { plans: StudioSubscriptionPlanSnapshot[] };
        setPlans(data.plans);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const savePlan = async (plan: StudioSubscriptionPlanSnapshot) => {
    setSaving(plan.slug);
    await fetch("/api/admin/billing/subscriptions", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    setSaving(null);
    load();
  };

  return (
    <AdminBillingShell title="Subscription plans">
      <div className="space-y-4">
        {plans.map((plan) => {
          const warning = planYearlyWarning(plan);
          return (
          <div key={plan.slug} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-zinc-900">{plan.name}</h2>
              <span className="text-xs text-zinc-500">{plan.source}</span>
            </div>
            {warning ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {warning}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-zinc-600">
                Monthly EUR
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  value={plan.monthlyPriceEur ?? ""}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, monthlyPriceEur: e.target.value ? Number(e.target.value) : null }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Yearly EUR
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  value={plan.yearlyPriceEur ?? ""}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, yearlyPriceEur: e.target.value ? Number(e.target.value) : null }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Discount %
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  value={plan.discountPercent}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, discountPercent: Number(e.target.value) }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Storage GB
                <input
                  type="number"
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                  value={plan.storageLimitGb ?? ""}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? {
                              ...row,
                              storageLimitGb: e.target.value ? Number(e.target.value) : null,
                            }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Stripe monthly price ID
                <input
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm font-mono text-xs"
                  value={plan.stripePriceIdMonthly ?? ""}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, stripePriceIdMonthly: e.target.value || null }
                          : row
                      )
                    )
                  }
                />
              </label>
              <label className="text-xs text-zinc-600">
                Stripe yearly price ID
                <input
                  className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm font-mono text-xs"
                  value={plan.stripePriceIdYearly ?? ""}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, stripePriceIdYearly: e.target.value || null }
                          : row
                      )
                    )
                  }
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={plan.isActive}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug ? { ...row, isActive: e.target.checked } : row
                      )
                    )
                  }
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={plan.isVisible}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug ? { ...row, isVisible: e.target.checked } : row
                      )
                    )
                  }
                />
                Visible on pricing
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={plan.autoTopUpAvailable}
                  onChange={(e) =>
                    setPlans((rows) =>
                      rows.map((row) =>
                        row.slug === plan.slug
                          ? { ...row, autoTopUpAvailable: e.target.checked }
                          : row
                      )
                    )
                  }
                />
                Auto top-up
              </label>
            </div>
            <button
              type="button"
              disabled={saving === plan.slug}
              onClick={() => void savePlan(plan)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving === plan.slug ? "Saving…" : "Save plan"}
            </button>
          </div>
        );
        })}
      </div>
    </AdminBillingShell>
  );
}
