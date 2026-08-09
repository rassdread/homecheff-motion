"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell, AdminStatGrid } from "@/components/admin/billing/admin-billing-shell";
import type { BillingAnalyticsSnapshot } from "@/types/studio-billing";

type Overview = {
  totals: {
    balance: number;
    lifetimeSpent: number;
    lifetimePurchased: number;
    lifetimeGranted: number;
  };
  policy: {
    carryMode: string;
    newUserGrantCredits: number;
    newUserCampaignMaxUsers: number;
    newUserCampaignRedeemed: number;
  };
};

export default function AdminBillingOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<BillingAnalyticsSnapshot | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/billing", { credentials: "include" }).then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { overview: Overview };
        return data.overview;
      }),
      fetch("/api/admin/billing/analytics", { credentials: "include" }).then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { analytics: BillingAnalyticsSnapshot };
        return data.analytics;
      }),
    ]).then(([ov, an]) => {
      setOverview(ov);
      setAnalytics(an);
    });
  }, []);

  return (
    <AdminBillingShell title="Billing control center">
      {overview ? (
        <AdminStatGrid
          items={[
            { label: "Total balance", value: overview.totals.balance },
            { label: "Lifetime spent", value: overview.totals.lifetimeSpent },
            { label: "Lifetime purchased", value: overview.totals.lifetimePurchased },
            { label: "Lifetime granted", value: overview.totals.lifetimeGranted },
          ]}
        />
      ) : (
        <p className="text-sm text-zinc-600">Loading…</p>
      )}

      {analytics ? (
        <AdminStatGrid
          items={[
            { label: "MRR (EUR)", value: analytics.mrrEur },
            { label: "ARR (EUR)", value: analytics.arrEur },
            { label: "Gross revenue (EUR)", value: analytics.grossRevenueEur },
            { label: "Gross margin %", value: analytics.grossMarginPercent },
            { label: "Pack revenue (EUR)", value: analytics.packRevenueEur },
            { label: "Subscription revenue (EUR)", value: analytics.subscriptionRevenueEur },
            { label: "Active subscriptions", value: analytics.activeSubscriptions },
            { label: "Provider cost (EUR)", value: analytics.providerCostEur },
          ]}
        />
      ) : null}

      {overview ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
          Carry mode: {overview.policy.carryMode} · New user grant: {overview.policy.newUserGrantCredits}{" "}
          credits · Campaign: {overview.policy.newUserCampaignRedeemed}/
          {overview.policy.newUserCampaignMaxUsers || "∞"} users
        </section>
      ) : null}
    </AdminBillingShell>
  );
}
