"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell, AdminStatGrid } from "@/components/admin/billing/admin-billing-shell";
import type { WalletProviderReconciliationReport } from "@/server/admin/studio-wallet-provider-reconciliation";

export default function AdminBillingReconciliationPage() {
  const [report, setReport] = useState<WalletProviderReconciliationReport | null>(null);

  useEffect(() => {
    void fetch("/api/admin/billing/reconciliation", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { report: WalletProviderReconciliationReport };
      setReport(data.report);
    });
  }, []);

  if (!report) {
    return (
      <AdminBillingShell title="Wallet ↔ provider reconciliation">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Wallet ↔ provider reconciliation">
      <p className="text-sm text-zinc-600">
        Read-only mismatch highlights across StudioWallet, ledger, GenerationJobs, ProviderCostEvents,
        and CustomerBillingEvents. Never mutates data.
      </p>
      <AdminStatGrid
        items={[
          { label: "Mismatches", value: report.mismatchCount },
          { label: "Wallets scanned", value: report.scanned.wallets },
          { label: "Recent captures", value: report.scanned.recentCaptures },
          { label: "Recent jobs", value: report.scanned.recentJobs },
        ]}
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Summary</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {report.mismatches.map((row) => (
              <tr key={`${row.code}-${row.entityId}`} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-2">{row.severity}</td>
                <td className="px-3 py-2 font-mono">{row.code}</td>
                <td className="px-3 py-2">{row.summary}</td>
                <td className="px-3 py-2">
                  {row.entityType}
                  <div className="font-mono text-zinc-400">{row.entityId.slice(0, 18)}</div>
                </td>
                <td className="px-3 py-2 font-mono text-zinc-500 max-w-md break-all">
                  {JSON.stringify(row.details)}
                </td>
              </tr>
            ))}
            {report.mismatches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                  No mismatches in the scanned sample.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminBillingShell>
  );
}
