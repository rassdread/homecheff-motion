/**
 * Sprint J — Brand QA analytics from existing Motion Lock data (no duplicate storage).
 */

import { prisma } from "@/lib/prisma";
import { readBrandLockedAssetsFromHandoffJson } from "@/lib/brand-asset-motion-lock";
import {
  readMotionLockProjectMetricsFromHandoff,
} from "@/lib/motion-lock-metrics";
import { readMotionLockReportFromHandoff } from "@/server/instant-premium/motion-lock-segment-service";
import {
  buildAggregateRecommendations,
  recommendForSurface,
  recommendForWorkflow,
} from "@/lib/brand-qa-recommendation-engine";
import type { BrandLockedAsset, BrandMotionLockLog } from "@/types/brand-asset-protection";
import type { MotionLockProjectMetrics } from "@/types/motion-lock-metrics";
import type { MotionLockProjectReport } from "@/types/motion-lock-layer";
import type {
  BrandQaAggregateReport,
  BrandQaBeforeAfterRow,
  BrandQaExportPayload,
  BrandQaProjectReport,
  BrandQaSurfaceRow,
  BrandQaTrackingModeRow,
  BrandQaWorkflowRow,
} from "@/types/brand-qa-analytics";

export type BrandQaSourceRecord = {
  projectId: string;
  workflowType: string;
  metrics: MotionLockProjectMetrics | null;
  report: MotionLockProjectReport | null;
  brandLockedAssets: BrandLockedAsset[];
  brandMotionLockLog: BrandMotionLockLog | null;
};

export function logBrandQa(context: Record<string, unknown>): void {
  console.info("[brand-qa]", context);
}

function readBrandMotionLockLogFromHandoff(raw: unknown): BrandMotionLockLog | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const log = (raw as Record<string, unknown>).brandMotionLockLog;
  if (!log || typeof log !== "object" || Array.isArray(log)) {
    return null;
  }
  return log as BrandMotionLockLog;
}

function normalizeWorkflowType(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "logo_placement";
}

function resolveSurfaceTypesFromAssets(assets: BrandLockedAsset[]): string[] {
  const surfaces = new Set<string>();
  for (const asset of assets) {
    if (asset.surfaceType) {
      surfaces.add(asset.surfaceType);
    }
    if (asset.assetId.includes("mascot") || asset.preserveMode === "reference_asset") {
      surfaces.add("mascot_emblem");
    }
  }
  return [...surfaces];
}

function resolveTrackingModesFromAssets(assets: BrandLockedAsset[]): string[] {
  const modes = new Set<string>();
  for (const asset of assets) {
    if (asset.trackingMode) {
      modes.add(asset.trackingMode);
    }
    if (asset.validationMode) {
      modes.add(asset.validationMode);
    }
    if (asset.preserveMode === "post_composite") {
      modes.add("post_composite");
    }
  }
  return [...modes];
}

export function buildBrandQaProjectReport(record: BrandQaSourceRecord): BrandQaProjectReport | null {
  const metrics = record.metrics;
  if (!metrics) {
    return null;
  }

  const segmentsChecked = metrics.segmentsChecked;
  const correctionRate = segmentsChecked > 0 ? metrics.segmentsCorrected / segmentsChecked : 0;
  const warningRate = segmentsChecked > 0 ? metrics.segmentsWarned / segmentsChecked : 0;
  const failureRate = segmentsChecked > 0 ? metrics.segmentsFailed / segmentsChecked : 0;

  const trackingFromReport = new Set<string>();
  const surfacesFromReport = resolveSurfaceTypesFromAssets(record.brandLockedAssets);
  const trackingFromAssets = resolveTrackingModesFromAssets(record.brandLockedAssets);

  if (record.report) {
    for (const segment of record.report.segments) {
      if (segment.tracking?.trackingMode) {
        trackingFromReport.add(segment.tracking.trackingMode);
      }
    }
  }

  if (metrics.tracking) {
    if (metrics.tracking.trackingModeUsage.static > 0) {
      trackingFromReport.add("static");
    }
    if (metrics.tracking.trackingModeUsage.quad_interpolation > 0) {
      trackingFromReport.add("quad_interpolation");
    }
  }

  return {
    projectId: record.projectId,
    workflowType: normalizeWorkflowType(record.workflowType),
    brandLockedAssetsCount: record.brandLockedAssets.length,
    segmentsChecked,
    segmentsPassed: metrics.segmentsPassed,
    segmentsWarned: metrics.segmentsWarned,
    segmentsFailed: metrics.segmentsFailed,
    segmentsCorrected: metrics.segmentsCorrected,
    correctionRate,
    warningRate,
    failureRate,
    trackingModesUsed: [...new Set([...trackingFromReport, ...trackingFromAssets])],
    surfaceTypesUsed: surfacesFromReport,
    createdAt: metrics.createdAt,
  };
}

type MutableBucket = { checked: number; corrected: number; failureReasons: Map<string, number> };

function bumpBucket(bucket: MutableBucket, corrected: boolean): void {
  bucket.checked += 1;
  if (corrected) {
    bucket.corrected += 1;
  }
}

function mostCommonFailureReason(reasons: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [reason, count] of reasons) {
    if (count > bestCount) {
      best = reason;
      bestCount = count;
    }
  }
  return best;
}

function collectFailureReasons(report: MotionLockProjectReport | null): Map<string, number> {
  const reasons = new Map<string, number>();
  if (!report) {
    return reasons;
  }
  for (const segment of report.segments) {
    for (const result of segment.validation.assetResults) {
      if (result.validationResult === "FAIL" && result.reason) {
        reasons.set(result.reason, (reasons.get(result.reason) ?? 0) + 1);
      }
    }
  }
  return reasons;
}

export function aggregateBrandQaReports(records: BrandQaSourceRecord[]): BrandQaAggregateReport {
  const projectReports = records
    .map((record) => buildBrandQaProjectReport(record))
    .filter((row): row is BrandQaProjectReport => row !== null);

  const workflowBuckets = new Map<string, MutableBucket>();
  const surfaceBuckets = new Map<string, MutableBucket>();
  const trackingBuckets = new Map<string, MutableBucket>();
  const workflowFailureReasons = new Map<string, Map<string, number>>();
  const beforeAfterByWorkflow = new Map<
    string,
    { static: MutableBucket; quad: MutableBucket }
  >();

  let segmentsChecked = 0;
  let segmentsCorrected = 0;

  for (const record of records) {
    const workflow = normalizeWorkflowType(record.workflowType);
    const wfBucket = workflowBuckets.get(workflow) ?? {
      checked: 0,
      corrected: 0,
      failureReasons: new Map(),
    };

    const failureReasons = collectFailureReasons(record.report);
    const wfReasons = workflowFailureReasons.get(workflow) ?? new Map<string, number>();
    for (const [reason, count] of failureReasons) {
      wfReasons.set(reason, (wfReasons.get(reason) ?? 0) + count);
    }
    workflowFailureReasons.set(workflow, wfReasons);

    if (record.metrics) {
      wfBucket.checked += record.metrics.segmentsChecked;
      wfBucket.corrected += record.metrics.segmentsCorrected;
      segmentsChecked += record.metrics.segmentsChecked;
      segmentsCorrected += record.metrics.segmentsCorrected;
    }
    workflowBuckets.set(workflow, wfBucket);

    for (const surface of resolveSurfaceTypesFromAssets(record.brandLockedAssets)) {
      const bucket = surfaceBuckets.get(surface) ?? {
        checked: 0,
        corrected: 0,
        failureReasons: new Map(),
      };
      if (record.metrics) {
        bucket.checked += record.metrics.segmentsChecked;
        bucket.corrected += record.metrics.segmentsCorrected;
      }
      surfaceBuckets.set(surface, bucket);
    }

    for (const asset of record.brandLockedAssets) {
      const modes = resolveTrackingModesFromAssets([asset]);
      for (const mode of modes) {
        const bucket = trackingBuckets.get(mode) ?? {
          checked: 0,
          corrected: 0,
          failureReasons: new Map(),
        };
        if (record.metrics) {
          bucket.checked += record.metrics.segmentsChecked;
          bucket.corrected += record.metrics.segmentsCorrected;
        }
        trackingBuckets.set(mode, bucket);
      }
    }

    if (record.report) {
      const ba = beforeAfterByWorkflow.get(workflow) ?? {
        static: { checked: 0, corrected: 0, failureReasons: new Map() },
        quad: { checked: 0, corrected: 0, failureReasons: new Map() },
      };

      for (const segment of record.report.segments) {
        const mode = segment.tracking?.trackingMode ?? "static";
        const target = mode === "quad_interpolation" ? ba.quad : ba.static;
        bumpBucket(target, segment.enforcementApplied);

        const enforceBucket = trackingBuckets.get(mode) ?? {
          checked: 0,
          corrected: 0,
          failureReasons: new Map(),
        };
        bumpBucket(enforceBucket, segment.enforcementApplied);
        trackingBuckets.set(mode, enforceBucket);
      }

      beforeAfterByWorkflow.set(workflow, ba);
    }
  }

  const workflowBreakdown: Record<string, BrandQaWorkflowRow> = {};
  for (const [workflow, bucket] of workflowBuckets) {
    const correctionRate = bucket.checked > 0 ? bucket.corrected / bucket.checked : 0;
    workflowBreakdown[workflow] = {
      checked: bucket.checked,
      corrected: bucket.corrected,
      correctionRate,
      mostCommonFailureReason: mostCommonFailureReason(
        workflowFailureReasons.get(workflow) ?? new Map()
      ),
      recommendation: recommendForWorkflow(workflow, correctionRate),
    };
  }

  const surfaceTypeBreakdown: Record<string, BrandQaSurfaceRow> = {};
  for (const [surface, bucket] of surfaceBuckets) {
    const correctionRate = bucket.checked > 0 ? bucket.corrected / bucket.checked : 0;
    surfaceTypeBreakdown[surface] = {
      checked: bucket.checked,
      corrected: bucket.corrected,
      correctionRate,
      recommendation: recommendForSurface(surface, correctionRate),
    };
  }

  const trackingModeBreakdown: Record<string, BrandQaTrackingModeRow> = {};
  for (const [mode, bucket] of trackingBuckets) {
    trackingModeBreakdown[mode] = {
      trackingMode: mode,
      checked: bucket.checked,
      corrected: bucket.corrected,
      correctionRate: bucket.checked > 0 ? bucket.corrected / bucket.checked : 0,
    };
  }

  const staticRow = trackingModeBreakdown.static;
  const quadRow = trackingModeBreakdown.quad_interpolation;
  if (staticRow && quadRow && staticRow.correctionRate > quadRow.correctionRate) {
    const improvement =
      staticRow.correctionRate > 0
        ? ((staticRow.correctionRate - quadRow.correctionRate) / staticRow.correctionRate) * 100
        : 0;
    trackingModeBreakdown.improvement_vs_static = {
      trackingMode: "improvement_vs_static",
      checked: quadRow.checked,
      corrected: quadRow.corrected,
      correctionRate: improvement / 100,
    };
  }

  const beforeAfterDynamicTracking: BrandQaBeforeAfterRow[] = [];
  for (const [workflow, ba] of beforeAfterByWorkflow) {
    const before = ba.static.checked > 0 ? ba.static.corrected / ba.static.checked : 0;
    const after = ba.quad.checked > 0 ? ba.quad.corrected / ba.quad.checked : 0;
    const improvementPercent =
      before > 0 ? ((before - after) / before) * 100 : after === 0 ? 0 : 100;
    beforeAfterDynamicTracking.push({
      workflowType: workflow,
      beforeDynamicTracking: before,
      afterDynamicTracking: after,
      improvementPercent,
    });
  }

  const overallCorrectionRate =
    segmentsChecked > 0 ? segmentsCorrected / segmentsChecked : 0;

  const { recommendations, highRiskSurfaces } = buildAggregateRecommendations({
    overallCorrectionRate,
    workflowBreakdown,
    surfaceTypeBreakdown,
    trackingModeBreakdown,
  });

  return {
    projectsChecked: projectReports.length,
    segmentsChecked,
    segmentsCorrected,
    overallCorrectionRate,
    workflowBreakdown,
    surfaceTypeBreakdown,
    trackingModeBreakdown,
    beforeAfterDynamicTracking,
    recommendations,
    highRiskSurfaces,
  };
}

export function buildBrandQaExportPayload(report: BrandQaAggregateReport): BrandQaExportPayload {
  return {
    generatedAt: new Date().toISOString(),
    overall: {
      projectsChecked: report.projectsChecked,
      segmentsChecked: report.segmentsChecked,
      segmentsCorrected: report.segmentsCorrected,
      overallCorrectionRate: report.overallCorrectionRate,
    },
    workflows: report.workflowBreakdown,
    surfaceTypes: report.surfaceTypeBreakdown,
    trackingModes: report.trackingModeBreakdown,
    beforeAfterDynamicTracking: report.beforeAfterDynamicTracking,
    recommendations: report.recommendations,
    highRiskSurfaces: report.highRiskSurfaces,
  };
}

export async function loadBrandQaSourceRecords(limit = 3000): Promise<BrandQaSourceRecord[]> {
  const rows = await prisma.animationProject.findMany({
    where: { projectType: "instant_premium" },
    select: { id: true, studioHandoffJson: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const records: BrandQaSourceRecord[] = [];

  for (const row of rows) {
    const handoff = row.studioHandoffJson;
    const metrics = readMotionLockProjectMetricsFromHandoff(handoff);
    const report = readMotionLockReportFromHandoff(handoff);
    if (!metrics && !report) {
      continue;
    }

    const brandLockedAssets = readBrandLockedAssetsFromHandoffJson(handoff);
    const workflowType =
      metrics?.workflowType ??
      (handoff && typeof handoff === "object" && !Array.isArray(handoff)
        ? String((handoff as Record<string, unknown>).fusionIntent ?? "logo_placement")
        : "logo_placement");

    records.push({
      projectId: row.id,
      workflowType: normalizeWorkflowType(workflowType),
      metrics,
      report,
      brandLockedAssets,
      brandMotionLockLog: readBrandMotionLockLogFromHandoff(handoff),
    });
  }

  return records;
}

export async function loadBrandQaAggregateReport(): Promise<BrandQaAggregateReport> {
  const records = await loadBrandQaSourceRecords();
  const report = aggregateBrandQaReports(records);
  logBrandQa({
    projectsChecked: report.projectsChecked,
    correctionRate: report.overallCorrectionRate,
    recommendationCount: report.recommendations.length,
  });
  return report;
}
