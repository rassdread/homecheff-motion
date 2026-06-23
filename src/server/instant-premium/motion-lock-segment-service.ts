/**
 * Sprint G/H/I — Motion Lock Layer: dense validation + segment enforcement.
 */

import path from "node:path";
import { readBrandLockedAssetsFromHandoffJson } from "@/lib/brand-asset-motion-lock";
import { resolveMotionKeyframeBrandAssets } from "@/lib/motion-keyframe-brand-baking";
import {
  clampPixelBounds,
  validateBrandRegionInFrame,
} from "@/lib/motion-lock-brand-validation";
import { aggregateDenseMotionLockValidation } from "@/lib/motion-lock-dense-sampling";
import {
  recordMotionLockProjectMetrics,
  resolveMotionLockWorkflowType,
} from "@/lib/motion-lock-metrics";
import { buildMotionLockTrackingMetrics } from "@/lib/motion-lock-tracking-metrics";
import { buildPostCompositeOverlayPlansFromBrandLockedAssets } from "@/lib/brand-asset-post-composite-plan";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type {
  MotionLockProjectReport,
  MotionLockSegment,
  MotionLockSegmentReport,
  MotionLockValidationResult,
} from "@/types/motion-lock-layer";
import { extractDenseSegmentFrames } from "@/server/instant-premium/motion-lock-extract-frames";
import {
  enforceBrandLockOnSegmentVideoSmart,
} from "@/server/instant-premium/motion-lock-dynamic-warp";
import { prepareLogoReferenceGrayscale } from "@/server/instant-premium/motion-lock-enforcement";
import { prisma } from "@/lib/prisma";

export function logMotionLock(context: Record<string, unknown>): void {
  console.info("[motion-lock]", context);
}

export function buildMotionLockSegment(input: {
  segmentId: string;
  segmentIndex: number;
  sourceVideoUrl: string;
  brandLockedAssets: BrandLockedAsset[];
}): MotionLockSegment {
  const bakeable = resolveMotionKeyframeBrandAssets(input.brandLockedAssets);
  const validationMode =
    bakeable[0]?.validationMode ?? input.brandLockedAssets[0]?.validationMode ?? "post_composite";
  return {
    segmentId: input.segmentId,
    segmentIndex: input.segmentIndex,
    brandLockedAssets: input.brandLockedAssets,
    validationMode,
    enforcementMode: bakeable.length > 0 ? "post_composite_overlay" : "none",
    sourceVideoUrl: input.sourceVideoUrl,
  };
}

export async function validateMotionLockSegment(input: {
  segment: MotionLockSegment;
  segmentVideoPath: string;
}): Promise<MotionLockValidationResult> {
  const frames = await extractDenseSegmentFrames(input.segmentVideoPath);
  const keyframeAssets = resolveMotionKeyframeBrandAssets(input.segment.brandLockedAssets);
  if (!frames || keyframeAssets.length === 0) {
    return {
      passed: true,
      assetsChecked: 0,
      assetsMissing: [],
      assetsDegraded: [],
      confidence: 1,
      assetResults: [],
      enforcementRequired: false,
    };
  }

  const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
    assets: keyframeAssets,
    sourceImageWidth: frames.width,
    sourceImageHeight: frames.height,
  });

  const sharp = (await import("sharp")).default;
  const assetResults = [];

  for (const plan of plans) {
    const bounds = clampPixelBounds(plan.pixelBounds, frames.width, frames.height);
    const logoRef = await prepareLogoReferenceGrayscale(
      plan.sourceUrl,
      bounds.width,
      bounds.height
    );

    for (const sample of frames.samples) {
      const region = await sharp(sample.buffer)
        .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
        .greyscale()
        .resize(bounds.width, bounds.height, { fit: "fill" })
        .raw()
        .toBuffer();

      assetResults.push(
        validateBrandRegionInFrame({
          assetId: plan.assetId,
          regionGrayscale: region,
          logoGrayscale: logoRef,
          samplePercent: sample.percent,
        })
      );
    }
  }

  return aggregateDenseMotionLockValidation(assetResults);
}

export async function processMotionLockSegment(input: {
  segment: MotionLockSegment;
  segmentVideoPath: string;
  workDir: string;
  workflowType?: string;
}): Promise<MotionLockSegmentReport> {
  const validation = await validateMotionLockSegment({
    segment: input.segment,
    segmentVideoPath: input.segmentVideoPath,
  });

  const sampling = validation.sampling;

  logMotionLock({
    segmentId: input.segment.segmentId,
    segmentIndex: input.segment.segmentIndex,
    assetsChecked: validation.assetsChecked,
    assetsCorrected: 0,
    validationPassed: validation.passed,
    enforcementApplied: false,
    confidence: validation.confidence,
    sampleCount: sampling?.sampleCount,
    passCount: sampling?.passCount,
    warnCount: sampling?.warnCount,
    failCount: sampling?.failCount,
  });

  if (!validation.enforcementRequired || input.segment.enforcementMode === "none") {
    return {
      segmentId: input.segment.segmentId,
      segmentIndex: input.segment.segmentIndex,
      validation,
      validationPassed: validation.passed,
      enforcementApplied: false,
      sourceVideoUrl: input.segment.sourceVideoUrl,
      sampling,
    };
  }

  const frames = await extractDenseSegmentFrames(input.segmentVideoPath);
  if (!frames) {
    return {
      segmentId: input.segment.segmentId,
      segmentIndex: input.segment.segmentIndex,
      validation,
      validationPassed: false,
      enforcementApplied: false,
      sourceVideoUrl: input.segment.sourceVideoUrl,
      sampling,
    };
  }

  const middleFrame =
    frames.samples.find((s) => s.percent === 0.5)?.buffer ?? frames.samples[0]!.buffer;

  const correctedPath = path.join(
    input.workDir,
    `brand-lock-segment-${input.segment.segmentIndex}.mp4`
  );
  const enforced = await enforceBrandLockOnSegmentVideoSmart({
    segmentVideoPath: input.segmentVideoPath,
    outputVideoPath: correctedPath,
    brandLockedAssets: input.segment.brandLockedAssets,
    segmentIndex: input.segment.segmentIndex,
    referenceFrameBuffer: middleFrame,
    width: frames.width,
    height: frames.height,
    durationSec: frames.durationSec,
    workflowType: input.workflowType,
  });

  logMotionLock({
    segmentId: input.segment.segmentId,
    segmentIndex: input.segment.segmentIndex,
    assetsChecked: validation.assetsChecked,
    assetsCorrected: enforced.applied ? validation.assetsMissing.length : 0,
    validationPassed: false,
    enforcementApplied: enforced.applied,
    warnings: enforced.warnings,
    sampleCount: sampling?.sampleCount,
    failCount: sampling?.failCount,
    trackingMode: enforced.tracking.trackingMode,
    dynamicWarpCount: enforced.tracking.dynamicWarpCount,
  });

  return {
    segmentId: input.segment.segmentId,
    segmentIndex: input.segment.segmentIndex,
    validation,
    validationPassed: enforced.applied,
    enforcementApplied: enforced.applied,
    correctedVideoPath: enforced.applied ? correctedPath : undefined,
    sourceVideoUrl: input.segment.sourceVideoUrl,
    sampling,
    tracking: enforced.tracking,
  };
}

export async function applyMotionLockToSegmentPaths(input: {
  projectId: string;
  workDir: string;
  segmentPaths: string[];
  segmentMeta: Array<{ segmentId: string; segmentIndex: number; sourceVideoUrl: string }>;
  brandLockedAssets: BrandLockedAsset[];
  studioHandoffJson?: unknown;
}): Promise<{ segmentPaths: string[]; report: MotionLockProjectReport }> {
  const reports: MotionLockSegmentReport[] = [];
  const nextPaths = [...input.segmentPaths];

  const workflowType = resolveMotionLockWorkflowType(
    input.studioHandoffJson,
    input.brandLockedAssets
  );

  for (let i = 0; i < input.segmentPaths.length; i += 1) {
    const meta = input.segmentMeta[i];
    const segmentPath = input.segmentPaths[i];
    if (!meta || !segmentPath) {
      continue;
    }

    const segment = buildMotionLockSegment({
      segmentId: meta.segmentId,
      segmentIndex: meta.segmentIndex,
      sourceVideoUrl: meta.sourceVideoUrl,
      brandLockedAssets: input.brandLockedAssets,
    });

    const report = await processMotionLockSegment({
      segment,
      segmentVideoPath: segmentPath,
      workDir: input.workDir,
      workflowType,
    });
    reports.push(report);

    if (report.enforcementApplied && report.correctedVideoPath) {
      nextPaths[i] = report.correctedVideoPath;
    }
  }

  const projectReport: MotionLockProjectReport = {
    projectId: input.projectId,
    segmentsChecked: reports.length,
    segmentsCorrected: reports.filter((r) => r.enforcementApplied).length,
    assetsLocked: resolveMotionKeyframeBrandAssets(input.brandLockedAssets).length,
    segments: reports,
    generatedAt: new Date().toISOString(),
  };

  logMotionLock({
    projectId: input.projectId,
    segmentsChecked: projectReport.segmentsChecked,
    segmentsCorrected: projectReport.segmentsCorrected,
    assetsLocked: projectReport.assetsLocked,
  });

  const tracking = buildMotionLockTrackingMetrics({
    brandLockedAssets: input.brandLockedAssets,
    workflowType,
    report: projectReport,
  });

  await recordMotionLockProjectMetrics({
    projectId: input.projectId,
    workflowType,
    report: projectReport,
    tracking,
  });

  return { segmentPaths: nextPaths, report: projectReport };
}

export async function persistMotionLockReport(
  projectId: string,
  report: MotionLockProjectReport
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
        motionLockReport: report,
      } as object,
    },
  });
}

export function readMotionLockReportFromHandoff(raw: unknown): MotionLockProjectReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const report = (raw as Record<string, unknown>).motionLockReport;
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return null;
  }
  const row = report as MotionLockProjectReport;
  if (typeof row.projectId !== "string" || !Array.isArray(row.segments)) {
    return null;
  }
  return row;
}

export function resolveBrandLockedAssetsForMerge(studioHandoffJson: unknown): BrandLockedAsset[] {
  return readBrandLockedAssetsFromHandoffJson(studioHandoffJson);
}
