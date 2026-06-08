"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioProfitabilityReport } from "@/types/studio-profitability";
import { DataTable } from "@/components/admin/render-analytics/data-table";
import { Metric } from "@/components/admin/render-analytics/metric";
import { usd } from "@/components/admin/render-analytics/format";

type StudioProfitabilitySectionProps = {
  profitability: StudioProfitabilityReport;
  emptyLabel: string;
};

export function StudioProfitabilitySection({
  profitability,
  emptyLabel,
}: StudioProfitabilitySectionProps) {
  const t = useActiveTranslator();
  const ex30 = profitability.executiveSummary.last30Days;
  const exAll = profitability.executiveSummary.allTime;

  return (
    <>
      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.title")}</h2>
        <p className="mt-1 text-xs text-zinc-600">{t("admin.profitability.intro")}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={t("admin.profitability.revenue30d")}
            value={`€${ex30.revenueEur.toFixed(2)}`}
          />
          <Metric
            label={t("admin.profitability.cost30d")}
            value={usd(ex30.costUsd)}
            hint={`€${ex30.costEur.toFixed(2)}`}
          />
          <Metric
            label={t("admin.profitability.profit30d")}
            value={`€${ex30.profitEur.toFixed(2)}`}
            hint={`${ex30.marginPercent}%`}
          />
          <Metric
            label={t("admin.profitability.allTimeProfit")}
            value={`€${exAll.profitEur.toFixed(2)}`}
            hint={`${exAll.marginPercent}%`}
          />
        </dl>
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.executiveSummary")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.period"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
            t("admin.profitability.users"),
          ]}
          rows={(
            [
              ["last7Days", profitability.executiveSummary.last7Days],
              ["last30Days", profitability.executiveSummary.last30Days],
              ["last90Days", profitability.executiveSummary.last90Days],
              ["last365Days", profitability.executiveSummary.last365Days],
              ["allTime", profitability.executiveSummary.allTime],
            ] as const
          ).map(([key, row]) => [
            t(`admin.profitability.period.${key}`),
            `€${row.revenueEur.toFixed(2)}`,
            usd(row.costUsd),
            `€${row.profitEur.toFixed(2)}`,
            `${row.marginPercent}%`,
            row.userCount,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.providerBreakdown")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.provider"),
            t("admin.profitability.last7d"),
            t("admin.profitability.last30d"),
            t("admin.profitability.last90d"),
            t("admin.profitability.share30d"),
          ]}
          rows={profitability.providerBreakdown.map((p) => [
            p.label,
            usd(p.last7DaysUsd),
            usd(p.last30DaysUsd),
            usd(p.last90DaysUsd),
            `${p.sharePercent30d}%`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.featureProfitability")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.feature"),
            t("admin.profitability.calls"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
          ]}
          rows={profitability.featureProfitability.map((f) => [
            f.label,
            f.calls,
            `€${f.revenueEur.toFixed(2)}`,
            usd(f.costUsd),
            `€${f.profitEur.toFixed(2)}`,
            `${f.marginPercent}%`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.projectProfitability")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.project"),
            t("admin.profitability.revenue"),
            t("admin.profitability.openai"),
            t("admin.profitability.elevenlabs"),
            t("admin.profitability.vidu"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
          ]}
          rows={profitability.projectProfitability.slice(0, 15).map((p) => [
            p.projectTitle ?? p.projectId.slice(0, 8),
            `€${p.revenueEur.toFixed(2)}`,
            usd(p.costs.openaiUsd),
            usd(p.costs.elevenlabsUsd),
            usd(p.costs.viduUsd),
            `€${p.profitEur.toFixed(2)}`,
            `${p.marginPercent}%`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.userProfitability")}</h2>
        <h3 className="mt-4 text-sm font-semibold">{t("admin.profitability.topProfitableUsers")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.email"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
          ]}
          rows={profitability.topProfitableUsers.map((u) => [
            u.email,
            `€${u.revenueEur.toFixed(2)}`,
            usd(u.totalCostUsd),
            `€${u.profitEur.toFixed(2)}`,
            `${u.marginPercent}%`,
          ])}
          emptyLabel={emptyLabel}
        />
        <h3 className="mt-5 text-sm font-semibold">{t("admin.profitability.topCostUsers")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.email"),
            t("admin.profitability.cost"),
            t("admin.profitability.revenue"),
            t("admin.profitability.profit"),
          ]}
          rows={profitability.topCostUsers.map((u) => [
            u.email,
            usd(u.totalCostUsd),
            `€${u.revenueEur.toFixed(2)}`,
            `€${u.profitEur.toFixed(2)}`,
          ])}
          emptyLabel={emptyLabel}
        />
        <h3 className="mt-5 text-sm font-semibold">{t("admin.profitability.negativeMarginUsers")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.email"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
          ]}
          rows={profitability.userProfitability
            .filter((u) => u.warning === "negative_margin")
            .slice(0, 10)
            .map((u) => [
              u.email,
              `€${u.revenueEur.toFixed(2)}`,
              usd(u.totalCostUsd),
              `€${u.profitEur.toFixed(2)}`,
              `${u.marginPercent}%`,
            ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.topCostDrivers")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.feature"),
            t("admin.profitability.calls"),
            t("admin.profitability.cost"),
            t("admin.profitability.share30d"),
          ]}
          rows={profitability.featureProfitability.slice(0, 5).map((f) => [
            f.label,
            f.calls,
            usd(f.costUsd),
            profitability.providerBreakdown.length > 0
              ? `${Math.round((f.costUsd / profitability.executiveSummary.last30Days.costUsd) * 1000) / 10}%`
              : "—",
          ])}
          emptyLabel={emptyLabel}
        />
        <h3 className="mt-5 text-sm font-semibold">{t("admin.profitability.topProfitableFeatures")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.feature"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
          ]}
          rows={profitability.topProfitableFeatures.map((f) => [
            f.label,
            `€${f.revenueEur.toFixed(2)}`,
            usd(f.costUsd),
            `€${f.profitEur.toFixed(2)}`,
          ])}
          emptyLabel={emptyLabel}
        />
        <h3 className="mt-5 text-sm font-semibold">{t("admin.profitability.topLossFeatures")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.feature"),
            t("admin.profitability.revenue"),
            t("admin.profitability.cost"),
            t("admin.profitability.profit"),
          ]}
          rows={profitability.topLossFeatures.map((f) => [
            f.label,
            `€${f.revenueEur.toFixed(2)}`,
            usd(f.costUsd),
            `€${f.profitEur.toFixed(2)}`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.unitEconomics")}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={t("admin.profitability.costPerProject")}
            value={usd(profitability.unitEconomics.costPerProjectUsd)}
          />
          <Metric
            label={t("admin.profitability.costPerUser")}
            value={usd(profitability.unitEconomics.costPerActiveUserUsd)}
          />
          <Metric
            label={t("admin.profitability.revenuePerProject")}
            value={`€${profitability.unitEconomics.revenuePerProjectEur.toFixed(2)}`}
          />
          <Metric
            label={t("admin.profitability.revenuePerUser")}
            value={`€${profitability.unitEconomics.revenuePerActiveUserEur.toFixed(2)}`}
          />
        </dl>
        <h3 className="mt-5 text-sm font-semibold">{t("admin.profitability.costPerAction")}</h3>
        <DataTable
          headers={[
            t("admin.profitability.feature"),
            t("admin.profitability.calls"),
            t("admin.profitability.avgCost"),
            t("admin.profitability.avgRevenue"),
          ]}
          rows={profitability.unitEconomics.byAction.map((a) => [
            a.label,
            a.totalCalls,
            usd(a.avgCostUsd),
            `€${a.avgRevenueEur.toFixed(2)}`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.negativeMargin")}</h2>
        <DataTable
          headers={[
            t("admin.profitability.kind"),
            t("admin.profitability.label"),
            t("admin.profitability.warning"),
            t("admin.profitability.profit"),
            t("admin.profitability.margin"),
          ]}
          rows={profitability.negativeMarginAlerts.slice(0, 20).map((a) => [
            a.kind,
            a.label.slice(0, 32),
            a.warning,
            `€${a.profitEur.toFixed(2)}`,
            `${a.marginPercent}%`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>

      <AppCard>
        <h2 className="text-lg font-semibold">{t("admin.profitability.subscriptionSimulation")}</h2>
        <p className="mt-1 text-xs text-zinc-600">{t("admin.profitability.subscriptionHint")}</p>
        <DataTable
          headers={[
            t("admin.profitability.plan"),
            t("admin.profitability.monthlyPrice"),
            t("admin.profitability.profitableUsers"),
            t("admin.profitability.lossUsers"),
            t("admin.profitability.avgMargin"),
            t("admin.profitability.breakEvenPercent"),
          ]}
          rows={profitability.subscriptionSimulation.map((s) => [
            s.planLabel,
            `€${s.monthlyPriceEur}`,
            s.profitableUserCount,
            s.lossMakingUserCount,
            `€${s.avgMarginEur.toFixed(2)} (${s.avgMarginPercent}%)`,
            `${s.breakEvenUserPercent}%`,
          ])}
          emptyLabel={emptyLabel}
        />
      </AppCard>
    </>
  );
}
