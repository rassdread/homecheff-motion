"use client";

import { useEffect, useState } from "react";
import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import type { GenerationJobFinancialBrowser } from "@/server/admin/studio-generation-job-financial-admin";

export default function AdminBillingGenerationJobsPage() {
  const [report, setReport] = useState<GenerationJobFinancialBrowser | null>(null);

  useEffect(() => {
    void fetch("/api/admin/billing/generation-jobs", { credentials: "include" }).then(
      async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { report: GenerationJobFinancialBrowser };
        setReport(data.report);
      }
    );
  }, []);

  if (!report) {
    return (
      <AdminBillingShell title="Generation job financial browser">
        <p className="text-sm text-zinc-600">Loading…</p>
      </AdminBillingShell>
    );
  }

  return (
    <AdminBillingShell title="Generation job financial browser">
      <p className="text-sm text-zinc-600">
        Financial correlation for StudioGenerationJob — wallet reservation/capture, ProviderCostEvent,
        idempotency. Showing {report.rows.length} of {report.total}.
      </p>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Finalized</th>
              <th className="px-3 py-2">Ledger</th>
              <th className="px-3 py-2">PCE</th>
              <th className="px-3 py-2">Cost $</th>
              <th className="px-3 py-2">Cache/Replay</th>
              <th className="px-3 py-2">Idempotency</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap">{row.createdAt.slice(0, 19)}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">
                  {row.actionType}
                  <div className="text-zinc-400">{row.capability}</div>
                </td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.providerAdapter || "—"}</td>
                <td className="px-3 py-2">
                  {row.creditsCharged}/{row.creditsReserved}
                  <div className="text-zinc-400">cost {row.creditCost}</div>
                </td>
                <td className="px-3 py-2">{row.chargeFinalized ? "yes" : "no"}</td>
                <td className="px-3 py-2 font-mono">
                  {row.ledgerCaptureId?.slice(0, 10) ?? "—"}
                  {row.ledgerRefundId ? (
                    <div className="text-amber-700">refund {row.ledgerRefundId.slice(0, 8)}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono">
                  {row.providerCostEventId?.slice(0, 10) ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {row.providerCostUsd != null ? row.providerCostUsd.toFixed(4) : "—"}
                </td>
                <td className="px-3 py-2">{row.cacheOrReplay}</td>
                <td className="px-3 py-2 font-mono max-w-[140px] truncate" title={row.idempotencyKey}>
                  {row.idempotencyKey.slice(0, 16)}
                </td>
              </tr>
            ))}
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-6 text-center text-zinc-500">
                  No generation jobs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminBillingShell>
  );
}
