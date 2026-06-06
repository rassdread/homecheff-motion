"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { ProjectVideoCostSummary } from "@/types/project-video-cost";

type Props = {
  projectId: string;
  summary: ProjectVideoCostSummary;
  isAdmin: boolean;
  className?: string;
};

export function ProjectVideoCostCard({ projectId, summary, isAdmin, className = "" }: Props) {
  const t = useActiveTranslator();

  const accuracyLabel =
    summary.costAccuracy === "exact"
      ? t("videos.cost.accuracyExact")
      : summary.costAccuracy === "estimated"
        ? t("videos.cost.accuracyEstimated")
        : t("videos.cost.accuracyPending");

  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
      aria-labelledby="project-cost-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="project-cost-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("videos.cost.title")}
          </h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {summary.isAdminFree ?
              t("videos.cost.adminFree")
            : `€${summary.netPriceEur.toFixed(2)}`}
          </p>
          {!summary.isAdminFree && summary.grossPriceEur > summary.netPriceEur ?
            <p className="text-xs text-zinc-500">
              {t("videos.cost.gross", { amount: summary.grossPriceEur.toFixed(2) })}
            </p>
          : null}
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
          {accuracyLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">{t("videos.cost.credits")}</dt>
          <dd className="font-medium text-zinc-900">{summary.creditsUsed}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">{t("videos.cost.events")}</dt>
          <dd className="font-medium text-zinc-900">{summary.eventCount}</dd>
        </div>
        {isAdmin && summary.internalCostUsd != null ?
          <>
            <div>
              <dt className="text-zinc-500">{t("videos.cost.internalUsd")}</dt>
              <dd className="font-medium text-zinc-900">${summary.internalCostUsd.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("videos.cost.margin")}</dt>
              <dd className="font-medium text-zinc-900">
                €{summary.marginEur?.toFixed(2) ?? "0.00"} ({summary.marginPercent ?? 0}%)
              </dd>
            </div>
          </>
        : null}
      </dl>

      {isAdmin && summary.providerEvents && summary.providerEvents.length > 0 ?
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 pr-3 font-medium">{t("videos.cost.colProvider")}</th>
                <th className="py-2 pr-3 font-medium">{t("videos.cost.colAction")}</th>
                <th className="py-2 pr-3 font-medium">{t("videos.cost.colCredits")}</th>
                <th className="py-2 pr-3 font-medium">{t("videos.cost.colCost")}</th>
                <th className="py-2 font-medium">{t("videos.cost.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.providerEvents.map((e) => (
                <tr key={e.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-3">{e.provider}</td>
                  <td className="py-2 pr-3">{e.actionType}</td>
                  <td className="py-2 pr-3">{e.unitsUsed ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {e.totalCostUsd != null ? `$${e.totalCostUsd.toFixed(4)}` : "—"}
                    {e.isEstimated ? " ~" : ""}
                  </td>
                  <td className="py-2">{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/videos/${projectId}/versions`}
          className="font-medium text-[#0067B1] hover:underline"
        >
          {t("videos.cost.linkVersions")}
        </Link>
        <Link href="/mijn-verbruik" className="font-medium text-[#0067B1] hover:underline">
          {t("videos.cost.linkUsage")}
        </Link>
      </div>
    </section>
  );
}
