/**
 * Sprint H — Motion Lock production metrics (persistent per project + aggregate).
 */

import { prisma } from "@/lib/prisma";
import type { MotionLockProjectReport, MotionLockSegmentReport } from "@/types/motion-lock-layer";
import type {
  MotionLockAggregateMetrics,
  MotionLockProjectMetrics,
} from "@/types/motion-lock-metrics";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";

export function logMotionLockMetrics(context: Record<string, unknown>): void {
  console.info("[motion-lock-metrics]", context);
}

export function resolveMotionLockWorkflowType(
  studioHandoffJson: unknown,
  brandLockedAssets: BrandLockedAsset[]
): string {
  if (studioHandoffJson && typeof studioHandoffJson === "object" && !Array.isArray(studioHandoffJson)) {
    const handoff = studioHandoffJson as Record<string, unknown>;
    const direct = handoff.workflowType ?? handoff.fusionIntent;
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
    const bootstrap = handoff.editorBootstrap;
    if (bootstrap && typeof bootstrap === "object" && !Array.isArray(bootstrap)) {
      const fusionIntent = (bootstrap as Record<string, unknown>).fusionIntent;
      if (typeof fusionIntent === "string" && fusionIntent.trim()) {
        return fusionIntent.trim();
      }
    }
  }

  const surface = brandLockedAssets[0]?.surfaceType;
  if (surface === "packaging") {
    return "product_packaging";
  }
  if (surface === "product_label") {
    return "product_branding";
  }
  if (surface === "signage") {
    return "logo_placement";
  }
  return "logo_placement";
}

function segmentOutcome(report: MotionLockSegmentReport): "passed" | "warned" | "failed" {
  const verdict = report.sampling?.segmentVerdict ?? (report.validationPassed ? "PASS" : "FAIL");
  if (verdict === "FAIL") {
    return "failed";
  }
  if (verdict === "WARN") {
    return "warned";
  }
  return "passed";
}

export function buildMotionLockProjectMetrics(input: {
  projectId: string;
  workflowType: string;
  report: MotionLockProjectReport;
  tracking?: import("@/types/motion-lock-tracking").MotionLockTrackingMetrics;
}): MotionLockProjectMetrics {
  let segmentsPassed = 0;
  let segmentsWarned = 0;
  let segmentsFailed = 0;

  for (const segment of input.report.segments) {
    const outcome = segmentOutcome(segment);
    if (outcome === "passed") {
      segmentsPassed += 1;
    } else if (outcome === "warned") {
      segmentsWarned += 1;
    } else {
      segmentsFailed += 1;
    }
  }

  const segmentsChecked = input.report.segmentsChecked;
  const segmentsCorrected = input.report.segmentsCorrected;
  const enforcementRate =
    segmentsChecked > 0 ? segmentsCorrected / segmentsChecked : 0;

  return {
    projectId: input.projectId,
    workflowType: input.workflowType,
    segmentsChecked,
    segmentsPassed,
    segmentsWarned,
    segmentsFailed,
    segmentsCorrected,
    enforcementRate,
    createdAt: new Date().toISOString(),
    ...(input.tracking ? { tracking: input.tracking } : {}),
  };
}

export function aggregateMotionLockProjectMetrics(
  rows: MotionLockProjectMetrics[]
): MotionLockAggregateMetrics {
  const workflowBreakdown: MotionLockAggregateMetrics["workflowBreakdown"] = {};

  let segmentsChecked = 0;
  let segmentsPassed = 0;
  let segmentsWarned = 0;
  let segmentsFailed = 0;
  let segmentsCorrected = 0;
  let staticTracking = 0;
  let quadInterpolationTracking = 0;
  let dynamicWarpCount = 0;
  let trackedAssetsTotal = 0;
  let quadTrackingSuccessSum = 0;
  let quadTrackingSuccessCount = 0;
  const surfaceTypeBreakdown: Record<string, number> = {};

  for (const row of rows) {
    segmentsChecked += row.segmentsChecked;
    segmentsPassed += row.segmentsPassed;
    segmentsWarned += row.segmentsWarned;
    segmentsFailed += row.segmentsFailed;
    segmentsCorrected += row.segmentsCorrected;

    const bucket = workflowBreakdown[row.workflowType] ?? { checked: 0, corrected: 0, trackedPercent: 0 };
    bucket.checked += row.segmentsChecked;
    bucket.corrected += row.segmentsCorrected;
    if (row.tracking) {
      const tracked = row.tracking.trackingModeUsage.quad_interpolation;
      const totalAssets =
        row.tracking.trackingModeUsage.static + row.tracking.trackingModeUsage.quad_interpolation;
      bucket.trackedPercent =
        totalAssets > 0 ? (tracked / totalAssets) * 100 : bucket.trackedPercent;
      staticTracking += row.tracking.trackingModeUsage.static;
      quadInterpolationTracking += row.tracking.trackingModeUsage.quad_interpolation;
      dynamicWarpCount += row.tracking.dynamicWarpCount;
      trackedAssetsTotal += row.tracking.trackedAssets;
      quadTrackingSuccessSum += row.tracking.quadTrackingSuccessRate;
      quadTrackingSuccessCount += 1;
      for (const [surface, count] of Object.entries(row.tracking.surfaceTypeBreakdown)) {
        surfaceTypeBreakdown[surface] = (surfaceTypeBreakdown[surface] ?? 0) + count;
      }
    }
    workflowBreakdown[row.workflowType] = bucket;
  }

  const correctionRate =
    segmentsChecked > 0 ? segmentsCorrected / segmentsChecked : 0;

  return {
    projectsChecked: rows.length,
    segmentsChecked,
    segmentsPassed,
    segmentsWarned,
    segmentsFailed,
    segmentsCorrected,
    correctionRate,
    workflowBreakdown,
    trackingModeUsage: {
      static: staticTracking,
      quad_interpolation: quadInterpolationTracking,
    },
    surfaceTypeBreakdown,
    quadTrackingSuccessRate:
      quadTrackingSuccessCount > 0 ? quadTrackingSuccessSum / quadTrackingSuccessCount : 0,
    dynamicWarpCount,
    trackedAssetsTotal,
  };
}

export function readMotionLockProjectMetricsFromHandoff(
  raw: unknown
): MotionLockProjectMetrics | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const metrics = (raw as Record<string, unknown>).motionLockMetrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return null;
  }
  const row = metrics as MotionLockProjectMetrics;
  if (typeof row.projectId !== "string" || typeof row.workflowType !== "string") {
    return null;
  }
  return row;
}

export async function persistMotionLockProjectMetrics(
  projectId: string,
  metrics: MotionLockProjectMetrics
): Promise<void> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { studioHandoffJson: true },
  });
  const base =
    project?.studioHandoffJson &&
    typeof project.studioHandoffJson === "object" &&
    !Array.isArray(project.studioHandoffJson)
      ? (project.studioHandoffJson as Record<string, unknown>)
      : {};

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      studioHandoffJson: {
        ...base,
        motionLockMetrics: metrics,
      } as object,
    },
  });

  logMotionLockMetrics({
    projectId: metrics.projectId,
    workflowType: metrics.workflowType,
    segmentsChecked: metrics.segmentsChecked,
    segmentsCorrected: metrics.segmentsCorrected,
    correctionRate: metrics.enforcementRate,
  });
}

export async function loadMotionLockAggregateMetrics(): Promise<MotionLockAggregateMetrics> {
  const rows = await prisma.animationProject.findMany({
    where: {
      projectType: "instant_premium",
    },
    select: { studioHandoffJson: true },
    orderBy: { updatedAt: "desc" },
    take: 3000,
  });

  const metrics = rows
    .map((row) => readMotionLockProjectMetricsFromHandoff(row.studioHandoffJson))
    .filter((row): row is MotionLockProjectMetrics => row !== null);

  return aggregateMotionLockProjectMetrics(metrics);
}

export async function recordMotionLockProjectMetrics(input: {
  projectId: string;
  workflowType: string;
  report: MotionLockProjectReport;
  tracking?: import("@/types/motion-lock-tracking").MotionLockTrackingMetrics;
}): Promise<MotionLockProjectMetrics> {
  const metrics = buildMotionLockProjectMetrics(input);
  await persistMotionLockProjectMetrics(input.projectId, metrics);
  return metrics;
}
