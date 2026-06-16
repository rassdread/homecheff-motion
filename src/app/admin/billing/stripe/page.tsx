"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { StripeReadinessSnapshot } from "@/types/studio-billing";

export default function AdminBillingStripePage() {
  const [readiness, setReadiness] = useState<StripeReadinessSnapshot | null>(null);

  useEffect(() => {
    void fetch("/api/admin/billing/stripe", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { readiness: StripeReadinessSnapshot };
      setReadiness(data.readiness);
    });
  }, []);

  if (!readiness) {
    return (
      <AdminBillingShell title="Stripe readiness">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Stripe readiness">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 text-sm">
        <p>Connected: {readiness.connected ? "Yes" : "No"}</p>
        <p>Environment: {readiness.environment}</p>
        <p>Webhook configured: {readiness.webhookConfigured ? "Yes" : "No"}</p>
        <p>Recent billing failures (past due): {readiness.recentBillingFailures}</p>
      </section>

      {readiness.missingConfiguration.length > 0 ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">Missing configuration</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {readiness.missingConfiguration.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-emerald-700">No missing Stripe configuration detected.</p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Plans</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {readiness.plans.map((plan) => (
            <li key={plan.slug}>
              <strong>{plan.name}</strong> — monthly: {plan.monthlyPriceId ?? "missing"}
              {plan.warnings.map((w) => (
                <span key={w} className="ml-2 text-red-600">
                  {w}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold">Credit packs</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {readiness.creditPacks.map((pack) => (
            <li key={pack.slug}>
              <strong>{pack.name}</strong> — {pack.priceId ?? "missing"}
            </li>
          ))}
        </ul>
      </section>
    </AdminBillingShell>
  );
}
