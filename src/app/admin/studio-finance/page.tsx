"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioFinanceSummary } from "@/server/admin/studio-finance-analytics";

export default function AdminStudioFinancePage() {
  const t = useActiveTranslator();
  const [summary, setSummary] = useState<StudioFinanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/studio-finance", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { summary: StudioFinanceSummary };
        setSummary(data.summary);
      })
      .catch(() => setError(t("admin.studioFinance.loadError")));
  }, [t]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!summary) {
    return <p className="text-sm text-zinc-600">{t("admin.studioFinance.loading")}</p>;
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("admin.studioFinance.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.studioFinance.intro")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.studioFinance.outstanding")} value={summary.totalCreditsOutstanding} />
        <StatCard label={t("admin.studioFinance.reserved")} value={summary.totalCreditsReserved} />
        <StatCard label={t("admin.studioFinance.sold")} value={summary.creditsSold} />
        <StatCard label={t("admin.studioFinance.spent")} value={summary.creditsSpent} />
        <StatCard label={t("admin.studioFinance.granted")} value={summary.creditsGranted} />
        <StatCard label={t("admin.studioFinance.refunded")} value={summary.creditsRefunded} />
        <StatCard
          label={t("admin.studioFinance.providerCost")}
          value={summary.providerCostsUsd}
          format="usd"
        />
        <StatCard
          label={t("admin.studioFinance.margin")}
          value={summary.marginEstimateUsd}
          format="usd"
        />
      </div>

      {summary.negativeMarginAlerts > 0 && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("admin.studioFinance.negativeMargin", { count: summary.negativeMarginAlerts })}
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t("admin.studioFinance.topUsers")}</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b text-zinc-500">
              <th className="py-2">{t("admin.studioFinance.email")}</th>
              <th className="py-2">{t("admin.studioFinance.creditsSpent")}</th>
              <th className="py-2">{t("admin.studioFinance.providerCost")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.topCostlyUsers.map((row) => (
              <tr key={row.userId} className="border-b border-zinc-100">
                <td className="py-2">{row.email}</td>
                <td className="py-2">{row.creditsSpent.toLocaleString()}</td>
                <td className="py-2">${row.providerCostUsd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t("admin.studioFinance.topProjects")}</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b text-zinc-500">
              <th className="py-2">{t("admin.studioFinance.projectId")}</th>
              <th className="py-2">{t("admin.studioFinance.creditsSpent")}</th>
              <th className="py-2">{t("admin.studioFinance.providerCost")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.topCostlyProjects.map((row) => (
              <tr key={row.projectId} className="border-b border-zinc-100">
                <td className="py-2 font-mono text-xs">{row.projectId}</td>
                <td className="py-2">{row.creditsSpent.toLocaleString()}</td>
                <td className="py-2">${row.providerCostUsd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 text-sm text-zinc-500">
        {t("admin.studioFinance.failedRefunds", { count: summary.failedGenerationRefunds })}
      </p>
    </main>
  );
}

function StatCard({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format?: "usd";
}) {
  const display =
    format === "usd" ? `$${value.toFixed(2)}` : value.toLocaleString();
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{display}</p>
    </div>
  );
}
