import type { RenderAnalyticsCsvSection, RenderAnalyticsReport } from "@/types/render-analytics";

function escapeCsv(value: string | number | null | undefined | boolean): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: (string | number | null | undefined | boolean)[]): string {
  return values.map(escapeCsv).join(",");
}

export const RENDER_ANALYTICS_CSV_SECTIONS: RenderAnalyticsCsvSection[] = [
  "render-costs",
  "render-jobs",
  "cost-events",
  "video-costs",
  "provider-costs",
  "project-usage",
  "user-usage",
  "customer-billing",
];

export function buildRenderAnalyticsCsv(
  report: RenderAnalyticsReport,
  section: RenderAnalyticsCsvSection
): { csv: string; filename: string } {
  if (section === "render-jobs") {
    return {
      filename: "render-jobs.csv",
      csv: [
        csvRow([
          "id",
          "provider",
          "providerJobId",
          "projectId",
          "userId",
          "renderType",
          "status",
          "durationSeconds",
          "creditsBefore",
          "creditsAfter",
          "creditsUsed",
          "creditUnitCostUsd",
          "totalCostUsd",
          "isEstimated",
          "needsReview",
          "estimateReason",
          "creditAccuracy",
          "startedAt",
          "completedAt",
        ]),
        ...report.creditRows.map((r) =>
          csvRow([
            r.id,
            r.provider,
            r.providerJobId,
            r.projectId,
            r.userId,
            r.renderType,
            r.status,
            r.durationSeconds,
            r.creditsBefore,
            r.creditsAfter,
            r.creditsUsed,
            r.creditUnitCostUsd,
            r.totalCostUsd,
            r.isEstimated,
            r.needsReview,
            r.estimateReason,
            r.creditAccuracy,
            r.startedAt,
            r.completedAt,
          ])
        ),
      ].join("\n"),
    };
  }

  if (section === "render-costs") {
    const c = report.credits;
    return {
      filename: "render-costs.csv",
      csv: [
        csvRow([
          "period",
          "credits",
          "exact_credits",
          "estimated_credits",
          "render_cost_usd",
          "storage_usd",
          "ai_usd",
          "infra_usd",
          "total_usd",
        ]),
        csvRow([
          "today",
          c.today.credits,
          c.today.exactCredits,
          c.today.estimatedCredits,
          report.financial.today.renderCostUsd,
          report.financial.today.storageCostUsd,
          report.financial.today.aiCostUsd,
          report.financial.today.infrastructureCostUsd,
          report.financial.today.totalCostUsd,
        ]),
        csvRow([
          "last_7_days",
          c.last7Days.credits,
          c.last7Days.exactCredits,
          c.last7Days.estimatedCredits,
          report.financial.last7Days.renderCostUsd,
          report.financial.last7Days.storageCostUsd,
          report.financial.last7Days.aiCostUsd,
          report.financial.last7Days.infrastructureCostUsd,
          report.financial.last7Days.totalCostUsd,
        ]),
        csvRow([
          "last_30_days",
          c.last30Days.credits,
          c.last30Days.exactCredits,
          c.last30Days.estimatedCredits,
          report.financial.last30Days.renderCostUsd,
          report.financial.last30Days.storageCostUsd,
          report.financial.last30Days.aiCostUsd,
          report.financial.last30Days.infrastructureCostUsd,
          report.financial.last30Days.totalCostUsd,
        ]),
        csvRow([
          "all_time",
          c.allTime.credits,
          c.allTime.exactCredits,
          c.allTime.estimatedCredits,
          report.financial.allTime.renderCostUsd,
          report.financial.allTime.storageCostUsd,
          report.financial.allTime.aiCostUsd,
          report.financial.allTime.infrastructureCostUsd,
          report.financial.allTime.totalCostUsd,
        ]),
        "",
        csvRow(["metric", "value"]),
        csvRow(["avg_credits_per_render", c.avgCreditsPerRender]),
        csvRow(["max_credits_per_render", c.maxCreditsPerRender]),
        csvRow(["min_credits_per_render", c.minCreditsPerRender]),
        csvRow(["failed_render_credits", c.failedCredits]),
        csvRow(["cancelled_render_credits", c.cancelledCredits]),
        csvRow(["exact_render_count", c.exactRenderCount]),
        csvRow(["estimated_render_count", c.estimatedRenderCount]),
        csvRow(["pending_render_count", c.pendingRenderCount]),
      ].join("\n"),
    };
  }

  if (section === "provider-costs") {
    return {
      filename: "provider-costs.csv",
      csv: [
        csvRow([
          "provider",
          "total_calls",
          "successful",
          "failed",
          "cancelled",
          "total_credits",
          "exact_credits",
          "estimated_credits",
          "total_cost_usd",
          "cost_last_30d_usd",
          "avg_credits_per_call",
          "avg_cost_per_call_usd",
          "is_estimated",
          "basis",
        ]),
        ...report.providers.map((p) =>
          csvRow([
            p.provider,
            p.totalCalls,
            p.successfulCalls,
            p.failedCalls,
            p.cancelledCalls,
            p.totalCredits,
            p.exactCredits,
            p.estimatedCredits,
            p.totalCostUsd,
            p.totalCostUsdLast30Days,
            p.avgCreditsPerCall,
            p.avgCostPerCallUsd,
            p.isEstimated,
            p.basis,
          ])
        ),
      ].join("\n"),
    };
  }

  if (section === "cost-events") {
    return {
      filename: "cost-events.csv",
      csv: [
        csvRow([
          "id",
          "provider",
          "actionType",
          "projectId",
          "userId",
          "relatedJobId",
          "relatedExportId",
          "balanceBefore",
          "balanceAfter",
          "unitsUsed",
          "unitType",
          "unitCostUsd",
          "totalCostUsd",
          "status",
          "isEstimated",
          "needsReview",
          "estimateReason",
          "costAccuracy",
          "startedAt",
          "completedAt",
        ]),
        ...report.videoCosts.costEvents.map((e) =>
          csvRow([
            e.id,
            e.provider,
            e.actionType,
            e.projectId,
            e.userId,
            e.relatedJobId,
            e.relatedExportId,
            e.balanceBefore,
            e.balanceAfter,
            e.unitsUsed,
            e.unitType,
            e.unitCostUsd,
            e.totalCostUsd,
            e.status,
            e.isEstimated,
            e.needsReview,
            e.estimateReason,
            e.costAccuracy,
            e.startedAt,
            e.completedAt,
          ])
        ),
      ].join("\n"),
    };
  }

  if (section === "video-costs") {
    const vc = report.videoCosts;
    return {
      filename: "video-costs.csv",
      csv: [
        csvRow(["metric", "value"]),
        csvRow(["completed_videos", vc.completedVideos]),
        csvRow(["avg_net_cost_per_video_usd", vc.avgNetCostPerVideoUsd]),
        csvRow(["break_even_price_eur", vc.portfolio.breakEvenPriceEur]),
        csvRow(["reference_sale_price_eur", vc.referenceSalePriceEur]),
        csvRow(["profitable_videos", vc.portfolio.profitableVideoCount]),
        csvRow(["loss_making_videos", vc.portfolio.lossMakingVideoCount]),
        "",
        csvRow([
          "project_id",
          "title",
          "owner_email",
          "status",
          "net_cost_usd",
          "exact_cost_usd",
          "estimated_cost_usd",
          "event_count",
          "video_seconds",
          "break_even_price_eur",
          "margin_at_reference_usd",
        ]),
        ...vc.topExpensiveVideos.map((v) =>
          csvRow([
            v.projectId,
            v.projectTitle,
            v.ownerEmail,
            v.status,
            v.netCostUsd,
            v.exactCostUsd,
            v.estimatedCostUsd,
            v.eventCount,
            v.videoSeconds,
            v.breakEvenPriceEur,
            v.marginAtReference.marginUsd,
          ])
        ),
      ].join("\n"),
    };
  }

  if (section === "project-usage") {
    return {
      filename: "project-usage.csv",
      csv: [
        csvRow([
          "project_id",
          "title",
          "owner_email",
          "render_count",
          "version_count",
          "total_credits",
          "exact_credits",
          "estimated_credits",
          "total_cost_usd",
          "storage_bytes",
          "storage_cost_usd",
          "video_seconds",
        ]),
        ...report.projects.topByCredits.map((p) =>
          csvRow([
            p.projectId,
            p.projectTitle,
            p.ownerEmail,
            p.renderCount,
            p.versionCount,
            p.totalCredits,
            p.exactCredits,
            p.estimatedCredits,
            p.totalCostUsd,
            p.storageBytes,
            p.estimatedStorageCostUsd,
            p.totalVideoSeconds,
          ])
        ),
      ].join("\n"),
    };
  }

  if (section === "customer-billing") {
    return {
      filename: "customer-billing.csv",
      csv: [
        csvRow([
          "date",
          "userId",
          "projectId",
          "actionType",
          "renderType",
          "customerUnits",
          "grossPriceEur",
          "netPriceEur",
          "status",
          "pricingRuleLabel",
          "isAdminFree",
          "isEstimated",
        ]),
        ...report.customerBillingRows.map((e) =>
          csvRow([
            e.createdAt,
            e.userId,
            e.projectId,
            e.actionType,
            e.renderType,
            e.customerUnits,
            e.grossPriceEur,
            e.netPriceEur,
            e.status,
            e.pricingRuleLabel,
            e.isAdminFree,
            e.isEstimated,
          ])
        ),
      ].join("\n"),
    };
  }

  return {
    filename: "user-usage.csv",
    csv: [
      csvRow([
        "user_id",
        "email",
        "render_count",
        "total_credits",
        "exact_credits",
        "estimated_credits",
        "total_cost_usd",
        "storage_bytes",
        "storage_cost_usd",
        "last_render_at",
      ]),
      ...report.users.topByCredits.map((u) =>
        csvRow([
          u.userId,
          u.email,
          u.renderCount,
          u.totalCredits,
          u.exactCredits,
          u.estimatedCredits,
          u.totalCostUsd,
          u.storageBytes,
          u.estimatedStorageCostUsd,
          u.lastRenderAt,
        ])
      ),
    ].join("\n"),
  };
}
