"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioFinanceSummary } from "@/server/admin/studio-finance-analytics";

export function StudioFinanceCard() {
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

  return (
    <AppCard>
      <h2 className="text-lg font-semibold">{t("admin.studioFinance.title")}</h2>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.studioFinance.intro")}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {summary && (
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">{t("admin.studioFinance.outstanding")}</dt>
            <dd className="font-medium">{summary.totalCreditsOutstanding.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">{t("admin.studioFinance.spent")}</dt>
            <dd className="font-medium">{summary.creditsSpent.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">{t("admin.studioFinance.providerCost")}</dt>
            <dd className="font-medium">${summary.providerCostsUsd.toFixed(2)}</dd>
          </div>
          {summary.negativeMarginAlerts > 0 && (
            <p className="text-amber-700">
              {t("admin.studioFinance.negativeMargin", { count: summary.negativeMarginAlerts })}
            </p>
          )}
        </dl>
      )}
      <Link
        href="/admin/studio-finance"
        className="mt-4 inline-block text-sm font-medium text-emerald-700 underline"
      >
        {t("admin.studioFinance.viewAll")} →
      </Link>
    </AppCard>
  );
}
