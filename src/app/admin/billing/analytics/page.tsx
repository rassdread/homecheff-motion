"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell, AdminStatGrid } from "@/components/admin/billing/admin-billing-shell";
import type { BillingAnalyticsSnapshot } from "@/types/studio-billing";

export default function AdminBillingAnalyticsPage() {
  const [analytics, setAnalytics] = useState<BillingAnalyticsSnapshot | null>(null);

  useEffect(() => {
    void fetch("/api/admin/billing/analytics", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { analytics: BillingAnalyticsSnapshot };
      setAnalytics(data.analytics);
    });
  }, []);

  if (!analytics) {
    return (
      <AdminBillingShell title="Billing analytics">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Billing analytics">
      <AdminStatGrid
        items={[
          { label: "MRR (EUR)", value: analytics.mrrEur },
          { label: "ARR (EUR)", value: analytics.arrEur },
          { label: "Credits sold", value: analytics.creditsSold },
          { label: "Credits consumed", value: analytics.creditsConsumed },
          { label: "Credits granted", value: analytics.creditsGranted },
          { label: "Gross revenue (EUR)", value: analytics.grossRevenueEur },
          { label: "Net revenue (EUR)", value: analytics.netRevenueEur },
          { label: "Gross margin %", value: analytics.grossMarginPercent },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Top promotions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analytics.topPromotions.map((row) => (
              <li key={row.name}>
                {row.name}: {row.redemptions} redemptions
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Top plans</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analytics.topPlans.map((row) => (
              <li key={row.slug}>
                {row.name}: {row.subscribers} subscribers
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold">Top credit packs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analytics.topCreditPacks.map((row) => (
              <li key={row.slug}>
                {row.name}: {row.creditsSold} credits sold
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AdminBillingShell>
  );
}
