"use client";

import { useCallback, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { formatStorageBytes } from "@/lib/format-storage-bytes";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type {
  RenderAnalyticsCsvSection,
  RenderAnalyticsReport,
} from "@/types/render-analytics";
import { DataTable } from "@/components/admin/render-analytics/data-table";
import { Metric } from "@/components/admin/render-analytics/metric";
import {
  creditRenderTableRow,
  ProjectLinkedTable,
  projectUsageTableRow,
} from "@/components/admin/render-analytics/project-linked-table";
import { usd } from "@/components/admin/render-analytics/format";
import { StudioProfitabilitySection } from "@/components/admin/render-analytics/studio-profitability-section";

type RenderAnalyticsDashboardProps = {
  initialReport: RenderAnalyticsReport | null;
  initialError: string | null;
};

export function RenderAnalyticsDashboard({
  initialReport,
  initialError,
}: RenderAnalyticsDashboardProps) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [report, setReport] = useState<RenderAnalyticsReport | null>(initialReport);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [exporting, setExporting] = useState<RenderAnalyticsCsvSection | null>(null);

  const estLabel = t("admin.renderAnalytics.estimatedBadge");
  const estHint = t("admin.renderAnalytics.estimatedHint");
  const emptyLabel = t("admin.renderAnalytics.empty");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/render-analytics", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      report?: RenderAnalyticsReport;
      error?: string;
    } | null;
    if (!res.ok || !body?.report) {
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    setReport(body.report);
    setError(null);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.renderAnalytics.loadError"));
    } finally {
      setRefreshing(false);
    }
  }

  async function onExport(section: RenderAnalyticsCsvSection) {
    setExporting(section);
    try {
      const res = await fetch(`/admin/render-analytics/export?section=${section}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${section}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.renderAnalytics.exportError"));
    } finally {
      setExporting(null);
    }
  }

  const exportButtons: { section: RenderAnalyticsCsvSection; label: string }[] = [
    { section: "render-costs", label: t("admin.renderAnalytics.exportRenderCosts") },
    { section: "render-jobs", label: t("admin.renderAnalytics.exportRenderJobs") },
    { section: "cost-events", label: t("admin.renderAnalytics.exportCostEvents") },
    { section: "video-costs", label: t("admin.renderAnalytics.exportVideoCosts") },
    { section: "customer-billing", label: t("admin.renderAnalytics.exportCustomerBilling") },
    { section: "provider-costs", label: t("admin.renderAnalytics.exportProviderCosts") },
    { section: "project-usage", label: t("admin.renderAnalytics.exportProjectUsage") },
    { section: "user-usage", label: t("admin.renderAnalytics.exportUserUsage") },
    { section: "instant-mode-usage", label: t("admin.renderAnalytics.exportInstantModeUsage") },
  ];

  if (!report && error) {
    return (
      <AppCard>
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium"
        >
          {t("admin.renderAnalytics.retry")}
        </button>
      </AppCard>
    );
  }

  if (!report) {
    return (
      <AppCard>
        <p className="text-sm text-zinc-600">{emptyLabel}</p>
      </AppCard>
    );
  }

  const fin = report.financial;
  const credits = report.credits;
  const videoCosts = report.videoCosts;
  const billing = report.billing;
  const profitability = report.profitability;
  const assetDerivationRoi = report.assetDerivationRoi;

  function accuracyLabel(accuracy: string): string {
    if (accuracy === "exact") {
      return t("admin.renderAnalytics.creditExact");
    }
    if (accuracy === "estimated") {
      return t("admin.renderAnalytics.creditEstimated");
    }
    return t("admin.renderAnalytics.creditPending");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">
            {t("admin.renderAnalytics.generatedAt")}:{" "}
            {new Date(report.generatedAt).toLocaleString(locale === "nl" ? "nl-NL" : "en-US")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            {refreshing ? t("admin.renderAnalytics.refreshing") : t("admin.renderAnalytics.refresh")}
          </button>
          {exportButtons.map(({ section, label }) => (
            <button
              key={section}
              type="button"
              onClick={() => void onExport(section)}
              disabled={exporting != null}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 disabled:opacity-60"
            >
              {exporting === section ? t("admin.renderAnalytics.exporting") : label}
            </button>
          ))}
        </div>
      </div>

      {error ?
        <p className="text-sm text-red-700">{error}</p>
      : null}

      <AppCard>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("admin.renderAnalytics.costOverview")}
        </h2>
        <p className="mt-1 text-xs text-amber-900/80">{estHint}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label={t("admin.renderAnalytics.creditsToday")} value={String(credits.today.credits)} hint={`${usd(fin.today.renderCostUsd)} · exact ${credits.today.exactCredits} / est. ${credits.today.estimatedCredits}`} estimated={credits.today.estimatedCredits > 0} estimatedLabel={estLabel} />
          <Metric label={t("admin.renderAnalytics.credits7d")} value={String(credits.last7Days.credits)} hint={usd(fin.last7Days.renderCostUsd)} estimated={credits.last7Days.estimatedCredits > 0} estimatedLabel={estLabel} />
          <Metric label={t("admin.renderAnalytics.credits30d")} value={String(credits.last30Days.credits)} hint={usd(fin.last30Days.renderCostUsd)} estimated={credits.last30Days.estimatedCredits > 0} estimatedLabel={estLabel} />
          <Metric label={t("admin.renderAnalytics.creditsAllTime")} value={String(credits.allTime.credits)} hint={usd(fin.allTime.renderCostUsd)} estimated={credits.allTime.estimatedCredits > 0} estimatedLabel={estLabel} />
          <Metric label={t("admin.renderAnalytics.monthlyForecast")} value={`${fin.monthlyForecastCredits} cr · ${usd(fin.monthlyForecastUsd)}`} hint={fin.monthlyForecastBasis} estimated estimatedLabel={estLabel} />
          <Metric
            label={t("admin.renderAnalytics.viduBalance")}
            value={
              report.viduLiveBalance.ok && report.viduLiveBalance.credits != null ?
                String(report.viduLiveBalance.credits)
              : "—"
            }
            hint={report.viduLiveBalance.ok ? undefined : report.viduLiveBalance.error}
          />
        </dl>
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.renderStats")}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("admin.renderAnalytics.totalRenders")} value={String(report.renders.allTime.total)} />
          <Metric label={t("admin.renderAnalytics.successful")} value={String(report.renders.allTime.successful)} />
          <Metric label={t("admin.renderAnalytics.failed")} value={String(report.renders.allTime.failed)} />
          <Metric label={t("admin.renderAnalytics.cancelled")} value={String(report.renders.allTime.cancelled)} />
          <Metric label={t("admin.renderAnalytics.avgCreditsPerRender")} value={String(credits.avgCreditsPerRender)} hint={`${usd(report.renders.avgCostPerRenderUsd)} @ $0.005/cr`} />
          <Metric label={t("admin.renderAnalytics.maxCreditsPerRender")} value={String(credits.maxCreditsPerRender)} />
          <Metric label={t("admin.renderAnalytics.minCreditsPerRender")} value={String(credits.minCreditsPerRender)} />
          <Metric label={t("admin.renderAnalytics.failedCredits")} value={String(credits.failedCredits)} />
          <Metric label={t("admin.renderAnalytics.cancelledCredits")} value={String(credits.cancelledCredits)} />
          <Metric label={t("admin.renderAnalytics.exactRenders")} value={String(credits.exactRenderCount)} />
          <Metric label={t("admin.renderAnalytics.estimatedRenders")} value={String(credits.estimatedRenderCount)} estimated estimatedLabel={estLabel} />
          <Metric label={t("admin.renderAnalytics.avgVideoLength")} value={`${report.renders.avgVideoLengthSeconds}s`} />
          <Metric label={t("admin.renderAnalytics.totalVideoSeconds")} value={String(report.renders.totalGeneratedVideoSeconds)} />
          <Metric
            label={t("admin.renderAnalytics.avgRenderDuration")}
            value={
              report.renders.avgRenderDurationMs != null ?
                `${Math.round(report.renders.avgRenderDurationMs / 1000)}s`
              : "—"
            }
          />
        </dl>
        <DataTable
          headers={[t("admin.renderAnalytics.renderType"), t("admin.renderAnalytics.count")]}
          rows={Object.entries(report.renders.byType).map(([type, count]) => [type, count])}
          emptyLabel={emptyLabel}
        />
        <h3 className="mt-6 text-sm font-semibold text-zinc-800">
          {t("admin.renderAnalytics.instantModeUsage")}
        </h3>
        <DataTable
          headers={[
            t("admin.renderAnalytics.renderType"),
            t("admin.renderAnalytics.modeRenderCount"),
            t("admin.renderAnalytics.credits"),
            t("admin.renderAnalytics.costUsd"),
            t("admin.renderAnalytics.modeFailures"),
            t("admin.renderAnalytics.modeAvgDuration"),
          ]}
          rows={(
            [
              ["story", report.renders.instantModeUsage.story],
              ["transition", report.renders.instantModeUsage.transition],
              ["full_rerender", report.renders.instantModeUsage.fullRerender],
            ] as const
          ).map(([mode, stats]) => [
            t(
              mode === "story"
                ? "admin.renderAnalytics.modeStory"
                : mode === "transition"
                  ? "admin.renderAnalytics.modeTransition"
                  : "admin.renderAnalytics.modeFullRerender"
            ),
            stats.renderCount,
            stats.credits,
            usd(stats.costUsd),
            stats.failedCount,
            stats.avgDurationSeconds ?? "—",
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.providerCosts")}</h2>
        <DataTable
          headers={[
            t("admin.renderAnalytics.provider"),
            t("admin.renderAnalytics.calls"),
            t("admin.renderAnalytics.credits"),
            t("admin.renderAnalytics.exactCredits"),
            t("admin.renderAnalytics.estimatedCredits"),
            t("admin.renderAnalytics.costUsd"),
          ]}
          rows={report.providers.map((p) => [
            p.provider,
            p.totalCalls,
            p.totalCredits,
            p.exactCredits,
            p.estimatedCredits,
            usd(p.totalCostUsd),
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.projectAnalysis")}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("admin.renderAnalytics.totalProjects")} value={String(report.projects.totalProjects)} />
          <Metric label={t("admin.renderAnalytics.completed")} value={String(report.projects.completedProjects)} />
          <Metric label={t("admin.renderAnalytics.concepts")} value={String(report.projects.conceptProjects)} />
          <Metric label={t("admin.renderAnalytics.drafts")} value={String(report.projects.draftProjects)} />
        </dl>

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topProjectsByCredits")}</h3>
        <ProjectLinkedTable
          headers={[t("admin.renderAnalytics.credits"), t("admin.renderAnalytics.costUsd")]}
          rows={report.projects.topByCredits.map((p) =>
            projectUsageTableRow(p, [
              `${p.totalCredits} (${p.exactCredits} exact / ${p.estimatedCredits} est.)`,
              usd(p.totalCostUsd),
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topProjectsByCost")}</h3>
        <ProjectLinkedTable
          headers={[t("admin.renderAnalytics.credits"), t("admin.renderAnalytics.costUsd")]}
          rows={report.projects.topByCost.map((p) =>
            projectUsageTableRow(p, [
              `${p.totalCredits} (${p.exactCredits} exact / ${p.estimatedCredits} est.)`,
              usd(p.totalCostUsd),
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topExpensiveRenders")}</h3>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.credits"),
            t("admin.renderAnalytics.accuracy"),
            t("admin.renderAnalytics.costUsd"),
          ]}
          rows={report.vidu.topExpensiveRenders.slice(0, 20).map((r) =>
            creditRenderTableRow(r, [
              r.creditsUsed,
              accuracyLabel(r.creditAccuracy),
              usd(r.totalCostUsd),
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topProjectsByRenders")}</h3>
        <ProjectLinkedTable
          headers={[t("admin.renderAnalytics.renders"), t("admin.renderAnalytics.versions")]}
          rows={report.projects.topByRenders.map((p) =>
            projectUsageTableRow(p, [p.renderCount, p.versionCount])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topLongestVideos")}</h3>
        <ProjectLinkedTable
          headers={[t("admin.renderAnalytics.videoSeconds"), t("admin.renderAnalytics.email")]}
          rows={report.projects.topByLongestVideos.map((p) =>
            projectUsageTableRow(p, [p.totalVideoSeconds, p.ownerEmail])
          )}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.userAnalysis")}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("admin.renderAnalytics.totalUsers")} value={String(report.users.totalUsers)} />
          <Metric label={t("admin.renderAnalytics.usersRendered")} value={String(report.users.usersWhoRendered)} />
          <Metric label={t("admin.renderAnalytics.activeUsers30d")} value={String(report.users.activeRenderUsersLast30Days)} />
          <Metric label={t("admin.renderAnalytics.avgRendersPerUser")} value={String(report.users.avgRendersPerUser)} />
        </dl>

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topUsersCredits")}</h3>
        <DataTable
          headers={[t("admin.renderAnalytics.email"), t("admin.renderAnalytics.credits"), t("admin.renderAnalytics.costUsd")]}
          rows={report.users.topByCredits.map((u) => [
            u.email,
            `${u.totalCredits} (${u.exactCredits} exact / ${u.estimatedCredits} est.)`,
            usd(u.totalCostUsd),
          ])}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topUsersStorage")}</h3>
        <DataTable
          headers={[t("admin.renderAnalytics.email"), t("admin.renderAnalytics.storage"), `${t("admin.renderAnalytics.costUsd")} (${estLabel})`]}
          rows={report.users.topByStorage.map((u) => [
            u.email,
            formatStorageBytes(u.storageBytes, locale),
            usd(u.estimatedStorageCostUsd),
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.storageAnalysis")}</h2>
        <p className="mt-1 text-xs text-zinc-600">{report.storage.auditCoverageNote}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("admin.renderAnalytics.totalStorage")} value={formatStorageBytes(report.storage.totalBytes, locale)} />
          <Metric label={t("admin.renderAnalytics.storageCost")} value={usd(report.storage.estimatedMonthlyCostUsd)} estimated estimatedLabel={estLabel} hint={estHint} />
          <Metric label={t("admin.renderAnalytics.projectsAudited")} value={`${report.storage.projectsAudited} / ${report.storage.projectsTotal}`} />
        </dl>

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topProjectsByStorage")}</h3>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.storage"),
            `${t("admin.renderAnalytics.costUsd")} (${estLabel})`,
          ]}
          rows={report.storage.topProjectsByStorage.map((p) =>
            projectUsageTableRow(p, [
              formatStorageBytes(p.storageBytes, locale),
              usd(p.estimatedStorageCostUsd),
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.largestFiles")}</h3>
        <DataTable
          headers={[t("admin.renderAnalytics.project"), t("admin.renderAnalytics.storage")]}
          rows={report.storage.largestFiles.map((f) => [
            f.label.slice(0, 16),
            formatStorageBytes(f.bytes, locale),
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.customerBillingEvents")}</h2>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.email"),
            t("admin.renderAnalytics.renderType"),
            t("admin.renderAnalytics.salePriceEur"),
            t("admin.renderAnalytics.status"),
            t("admin.renderAnalytics.date"),
          ]}
          rows={report.customerBillingRows.slice(0, 30).map((e, i) => ({
            key: `${e.createdAt}-${e.userId}-${i}`,
            project: e.projectDisplay,
            cells: [
              e.ownerEmail,
              e.renderType,
              `€${e.netPriceEur.toFixed(2)}`,
              e.status,
              new Date(e.createdAt).toLocaleString(locale === "nl" ? "nl-NL" : "en-US"),
            ],
          }))}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <StudioProfitabilitySection
        profitability={profitability}
        assetDerivationRoi={assetDerivationRoi}
        emptyLabel={emptyLabel}
      />

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.revenueOverview")}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("admin.renderAnalytics.grossRevenueToday")} value={`€${billing.today.grossRevenueEur}`} hint={`${t("admin.renderAnalytics.internalCost")}: $${billing.today.internalCostUsd.toFixed(2)}`} />
          <Metric label={t("admin.renderAnalytics.grossRevenue30d")} value={`€${billing.last30Days.grossRevenueEur}`} />
          <Metric label={t("admin.renderAnalytics.grossMargin30d")} value={`€${billing.last30Days.grossMarginEur}`} hint={`${billing.last30Days.grossMarginPercent}%`} />
          <Metric label={t("admin.renderAnalytics.adminFreeEvents")} value={String(billing.allTime.adminFreeCount)} />
        </dl>
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.pricingTableV1")}</h2>
        <DataTable
          headers={[t("admin.renderAnalytics.pricingRule"), t("admin.renderAnalytics.credits"), t("admin.renderAnalytics.salePriceEur")]}
          rows={[
            ...billing.pricingRules.creditTiers.map((r) => [
              r.label,
              r.maxCredits != null ? `${r.minCredits}–${r.maxCredits}` : `${r.minCredits}+`,
              `€${r.basePriceEur}`,
            ]),
            ...billing.pricingRules.flatRules.map((r) => [r.label, "—", `€${r.basePriceEur}`]),
          ]}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.videoEconomics")}</h2>
        <p className="mt-1 text-xs text-zinc-600">{t("admin.renderAnalytics.videoEconomicsHint")}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={t("admin.renderAnalytics.avgNetCostPerVideo")}
            value={usd(videoCosts.avgNetCostPerVideoUsd)}
          />
          <Metric
            label={t("admin.renderAnalytics.breakEvenPrice")}
            value={`€${videoCosts.portfolio.breakEvenPriceEur}`}
          />
          <Metric
            label={t("admin.renderAnalytics.profitableVideos")}
            value={String(videoCosts.portfolio.profitableVideoCount)}
            hint={`@ €${videoCosts.referenceSalePriceEur}`}
          />
          <Metric
            label={t("admin.renderAnalytics.lossMakingVideos")}
            value={String(videoCosts.portfolio.lossMakingVideoCount)}
            hint={`@ €${videoCosts.referenceSalePriceEur}`}
          />
        </dl>

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.marginSimulation")}</h3>
        <DataTable
          headers={[
            t("admin.renderAnalytics.salePriceEur"),
            t("admin.renderAnalytics.avgMarginUsd"),
            t("admin.renderAnalytics.avgMarginPct"),
          ]}
          rows={videoCosts.salePricesEur.map((priceEur) => {
            const sim = videoCosts.portfolio.avgNetCostPerVideoUsd > 0 ?
              {
                marginUsd:
                  Math.round(
                    (priceEur * 1.08 - videoCosts.avgNetCostPerVideoUsd) * 100
                  ) / 100,
                marginPct:
                  Math.round(
                    ((priceEur * 1.08 - videoCosts.avgNetCostPerVideoUsd) /
                      (priceEur * 1.08)) *
                      10000
                  ) / 100,
              }
            : { marginUsd: priceEur * 1.08, marginPct: 100 };
            return [`€${priceEur}`, usd(sim.marginUsd), `${sim.marginPct}%`];
          })}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topExpensiveVideos")}</h3>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.netCostUsd"),
            t("admin.renderAnalytics.exactCostUsd"),
            t("admin.renderAnalytics.estimatedCostUsd"),
            t("admin.renderAnalytics.breakEvenPrice"),
          ]}
          rows={videoCosts.topExpensiveVideos.map((v) =>
            projectUsageTableRow(v, [
              usd(v.netCostUsd),
              usd(v.exactCostUsd),
              usd(v.estimatedCostUsd),
              `€${v.breakEvenPriceEur}`,
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.topLossMakingVideos")}</h3>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.netCostUsd"),
            t("admin.renderAnalytics.marginAtReference"),
          ]}
          rows={videoCosts.topLossMakingVideos.map((v) =>
            projectUsageTableRow(v, [
              usd(v.netCostUsd),
              usd(v.marginAtReference.marginUsd),
            ])
          )}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.recentCostEvents")}</h3>
        <ProjectLinkedTable
          headers={[
            t("admin.renderAnalytics.provider"),
            t("admin.renderAnalytics.renderType"),
            t("admin.renderAnalytics.netCostUsd"),
            t("admin.renderAnalytics.date"),
          ]}
          rows={videoCosts.costEvents.slice(0, 30).map((e) => ({
            key: e.id,
            project: e.projectDisplay,
            cells: [
              e.provider,
              e.actionType,
              usd(e.totalCostUsd),
              new Date(e.createdAt).toLocaleString(locale === "nl" ? "nl-NL" : "en-US"),
            ],
          }))}
          emptyLabel={emptyLabel}
        />

        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.costByProvider")}</h3>
        <DataTable
          headers={[
            t("admin.renderAnalytics.provider"),
            t("admin.renderAnalytics.events"),
            t("admin.renderAnalytics.exactCostUsd"),
            t("admin.renderAnalytics.estimatedCostUsd"),
            t("admin.renderAnalytics.netCostUsd"),
          ]}
          rows={videoCosts.byProvider.map((p) => [
            p.provider,
            p.eventCount,
            usd(p.exactCostUsd),
            usd(p.estimatedCostUsd),
            usd(p.netCostUsd),
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.scaleForecast")}</h2>
        <p className="mt-1 text-xs text-amber-900/80">{estHint}</p>
        <DataTable
          headers={[
            t("admin.renderAnalytics.users"),
            `${t("admin.renderAnalytics.renderCostMo")} (${estLabel})`,
            `${t("admin.renderAnalytics.storageCostMo")} (${estLabel})`,
            `${t("admin.renderAnalytics.totalCostMo")} (${estLabel})`,
          ]}
          rows={report.scaleProjections.map((s) => [
            s.targetUsers,
            usd(s.estimatedMonthlyRenderCostUsd),
            usd(s.estimatedMonthlyStorageCostUsd),
            usd(s.estimatedMonthlyTotalUsd),
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      {report.balanceSnapshots.length > 0 ?
        <AppCard>
          <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.balanceSnapshots")}</h2>
          <DataTable
            headers={[
              t("admin.renderAnalytics.provider"),
              t("admin.renderAnalytics.credits"),
              t("admin.renderAnalytics.capturedAt"),
            ]}
            rows={report.balanceSnapshots.slice(0, 30).map((s) => [
              s.provider,
              s.balance,
              new Date(s.capturedAt).toLocaleString(locale),
            ])}
            emptyLabel={emptyLabel}
          />
        </AppCard>
      : null}

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.renderAnalytics.dataGaps")}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-zinc-700">
          {report.dataGaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
        <h3 className="mt-5 text-sm font-semibold">{t("admin.renderAnalytics.recommendedLogging")}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-700">
          {report.recommendedLoggingFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        {report.payments.totalOrders > 0 ?
          <p className="mt-4 text-xs text-zinc-600">
            {t("admin.renderAnalytics.paymentsNote")}: {report.payments.totalOrders} —{" "}
            {Object.entries(report.payments.byStatus)
              .map(([status, count]) => `${status}: ${count}`)
              .join(", ")}
          </p>
        : null}
      </AppCard>
    </div>
  );
}
