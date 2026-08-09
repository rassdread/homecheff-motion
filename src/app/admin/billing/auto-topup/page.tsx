"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell, AdminStatGrid } from "@/components/admin/billing/admin-billing-shell";
import type { AutoTopUpAdminSummary } from "@/server/admin/studio-auto-topup-admin";

export default function AdminBillingAutoTopUpPage() {
  const [summary, setSummary] = useState<AutoTopUpAdminSummary | null>(null);

  useEffect(() => {
    void fetch("/api/admin/billing/auto-topup", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { summary: AutoTopUpAdminSummary };
      setSummary(data.summary);
    });
  }, []);

  if (!summary) {
    return (
      <AdminBillingShell title="Auto Top-Up monitoring">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Auto Top-Up monitoring">
      <p className="text-sm text-zinc-600">
        Read-only view of StudioAutoTopUpAttempt rows — payment execution unchanged.
      </p>
      <AdminStatGrid
        items={[
          { label: "Succeeded", value: summary.succeeded },
          { label: "Failed", value: summary.failed },
          { label: "Pending", value: summary.pending },
          { label: "Duplicate / already pending", value: summary.duplicatePrevented },
          { label: "Enabled accounts", value: summary.enabledAccounts },
          { label: "Consented accounts", value: summary.consentedAccounts },
        ]}
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Pack</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Checkout</th>
              <th className="px-3 py-2">Failure</th>
              <th className="px-3 py-2">Consent</th>
              <th className="px-3 py-2">Correlation</th>
            </tr>
          </thead>
          <tbody>
            {summary.attempts.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100">
                <td className="px-3 py-2 whitespace-nowrap">{row.createdAt.slice(0, 19)}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.packSlug}</td>
                <td className="px-3 py-2">{row.creditsGranted}</td>
                <td className="px-3 py-2 font-mono">
                  {row.stripeCheckoutSessionId?.slice(0, 18) ?? "—"}
                </td>
                <td className="px-3 py-2">{row.failureCode ?? "—"}</td>
                <td className="px-3 py-2">
                  {row.consentAt ? "yes" : "no"}
                  {row.autoTopUpEnabled ? " · on" : " · off"}
                </td>
                <td className="px-3 py-2 font-mono">
                  {row.financialCorrelationId?.slice(0, 24) ?? "—"}
                </td>
              </tr>
            ))}
            {summary.attempts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-zinc-500">
                  No Auto Top-Up attempts recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminBillingShell>
  );
}
