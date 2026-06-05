"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { CustomerUsageReport } from "@/types/customer-usage";
import { formatPriceEur } from "@/lib/format-price-eur";

type Filter = CustomerUsageReport["filter"];

const FILTERS: Filter[] = ["today", "last7Days", "last30Days", "allTime"];

type CustomerUsageDashboardProps = {
  initialReport: CustomerUsageReport | null;
  initialError: string | null;
};

export function CustomerUsageDashboard({
  initialReport,
  initialError,
}: CustomerUsageDashboardProps) {
  const t = useActiveTranslator();
  const [report, setReport] = useState(initialReport);
  const [filter, setFilter] = useState<Filter>(initialReport?.filter ?? "allTime");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const load = useCallback(async (nextFilter: Filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/me/usage?filter=${nextFilter}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        report?: CustomerUsageReport;
      } | null;
      if (!res.ok || !body?.report) {
        throw new Error(`HTTP ${res.status}`);
      }
      setReport(body.report);
      setFilter(nextFilter);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("usage.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  if (!report && error) {
    return (
      <AppCard>
        <p className="text-sm text-red-700">{error}</p>
      </AppCard>
    );
  }

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => void load(f)}
            disabled={loading}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filter === f ?
                "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            {t(`usage.filter.${f}`)}
          </button>
        ))}
      </div>

      {summary ?
        <AppCard>
          <h2 className="text-lg font-semibold text-zinc-900">{t("usage.thisMonth")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-zinc-500">{t("usage.videosMade")}</dt>
              <dd className="text-lg font-semibold">{summary.videoCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("usage.creditsUsed")}</dt>
              <dd className="text-lg font-semibold">{summary.creditsUsed}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("usage.amountSpent")}</dt>
              <dd className="text-lg font-semibold">
                {formatPriceEur(summary.amountSpentEur, "nl")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("usage.avgPerVideo")}</dt>
              <dd className="text-lg font-semibold">
                {formatPriceEur(summary.avgPricePerVideoEur, "nl")}
              </dd>
            </div>
          </dl>
        </AppCard>
      : null}

      <AppCard>
        <h2 className="text-lg font-semibold">{t("usage.history")}</h2>
        {report?.rows.length ?
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-2 pr-3">{t("usage.date")}</th>
                  <th className="py-2 pr-3">{t("usage.project")}</th>
                  <th className="py-2 pr-3">{t("usage.type")}</th>
                  <th className="py-2 pr-3">{t("usage.status")}</th>
                  <th className="py-2 pr-3">{t("usage.credits")}</th>
                  <th className="py-2 pr-3">{t("usage.price")}</th>
                  <th className="py-2">{t("usage.action")}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("nl-NL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="max-w-[12rem] py-2 pr-3">
                      {row.projectId ? (
                        <Link
                          href={`/videos/${row.projectId}`}
                          prefetch={false}
                          className="font-medium text-[#0067B1] hover:underline"
                        >
                          {row.projectTitle ?? row.projectId.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">{row.renderType}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          row.status === "completed"
                            ? "bg-emerald-50 text-emerald-800"
                            : row.status === "failed"
                              ? "bg-red-50 text-red-800"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {row.creditsUsed}
                      {row.isEstimated ? (
                        <span className="ml-1 text-amber-700" title={t("usage.estimatedNote")}>
                          *
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {formatPriceEur(row.netPriceEur, "nl")}
                    </td>
                    <td className="py-2">
                      {row.projectId ? (
                        <Link
                          href={`/videos/${row.projectId}/versions`}
                          prefetch={false}
                          className="text-[#006D52] hover:underline"
                        >
                          {t("usage.viewVersions")}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-zinc-500">{t("usage.estimatedNote")}</p>
          </div>
        : <p className="mt-4 text-sm text-zinc-600">{t("usage.empty")}</p>}
      </AppCard>
    </div>
  );
}
