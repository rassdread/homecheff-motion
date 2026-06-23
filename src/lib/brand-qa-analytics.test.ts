import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateBrandQaReports,
  buildBrandQaExportPayload,
  buildBrandQaProjectReport,
  type BrandQaSourceRecord,
} from "@/lib/brand-qa-analytics";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type { MotionLockProjectMetrics } from "@/types/motion-lock-metrics";
import type { MotionLockProjectReport } from "@/types/motion-lock-layer";

function lockedAsset(surfaceType: BrandLockedAsset["surfaceType"]): BrandLockedAsset {
  return {
    assetId: "logo",
    assetUrl: "https://example.com/logo.png",
    motionLocked: true,
    preserveExact: true,
    preserveMode: "post_composite",
    targetBounds: { x: 0.1, y: 0.1, width: 0.5, height: 0.3, exact: true },
    quad: {
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.6, y: 0.1 },
      bottomRight: { x: 0.6, y: 0.4 },
      bottomLeft: { x: 0.1, y: 0.4 },
    },
    trackingMode: "perspective_segment",
    validationMode: "post_composite",
    surfaceType,
  };
}

function metrics(overrides: Partial<MotionLockProjectMetrics>): MotionLockProjectMetrics {
  return {
    projectId: "p1",
    workflowType: "logo_placement",
    segmentsChecked: 10,
    segmentsPassed: 8,
    segmentsWarned: 1,
    segmentsFailed: 1,
    segmentsCorrected: 2,
    enforcementRate: 0.2,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function motionReport(overrides?: Partial<MotionLockProjectReport>): MotionLockProjectReport {
  return {
    projectId: "p1",
    segmentsChecked: 2,
    segmentsCorrected: 1,
    assetsLocked: 1,
    generatedAt: new Date().toISOString(),
    segments: [
      {
        segmentId: "s0",
        segmentIndex: 0,
        validationPassed: false,
        enforcementApplied: true,
        sourceVideoUrl: "https://example.com/0.mp4",
        validation: {
          passed: false,
          assetsChecked: 1,
          assetsMissing: ["logo"],
          assetsDegraded: [],
          confidence: 0.3,
          enforcementRequired: true,
          assetResults: [
            {
              assetId: "logo",
              validationResult: "FAIL",
              confidence: 0.3,
              reason: "brand_logo_not_recognizable",
            },
          ],
        },
        tracking: {
          trackingMode: "static",
          trackedSamples: 0,
          perspectiveWarpApplied: true,
          enforcementApplied: true,
          dynamicWarpCount: 0,
          trackedAssetIds: ["logo"],
        },
      },
      {
        segmentId: "s1",
        segmentIndex: 1,
        validationPassed: true,
        enforcementApplied: false,
        sourceVideoUrl: "https://example.com/1.mp4",
        validation: {
          passed: true,
          assetsChecked: 1,
          assetsMissing: [],
          assetsDegraded: [],
          confidence: 0.9,
          enforcementRequired: false,
          assetResults: [],
        },
        tracking: {
          trackingMode: "quad_interpolation",
          trackedSamples: 11,
          perspectiveWarpApplied: true,
          enforcementApplied: false,
          dynamicWarpCount: 11,
          trackedAssetIds: ["logo"],
        },
      },
    ],
    ...overrides,
  };
}

describe("brand qa analytics (Sprint J)", () => {
  it("builds project report from motion lock metrics", () => {
    const record: BrandQaSourceRecord = {
      projectId: "p1",
      workflowType: "product_branding",
      metrics: metrics({ workflowType: "product_branding", segmentsChecked: 4, segmentsCorrected: 1 }),
      report: null,
      brandLockedAssets: [lockedAsset("packaging")],
      brandMotionLockLog: null,
    };
    const report = buildBrandQaProjectReport(record);
    assert.ok(report);
    assert.equal(report?.workflowType, "product_branding");
    assert.equal(report?.correctionRate, 0.25);
    assert.equal(report?.brandLockedAssetsCount, 1);
    assert.ok(report?.surfaceTypesUsed.includes("packaging"));
  });

  it("aggregates workflow breakdown with failure reasons", () => {
    const aggregate = aggregateBrandQaReports([
      {
        projectId: "a",
        workflowType: "logo_placement",
        metrics: metrics({ segmentsChecked: 10, segmentsCorrected: 2 }),
        report: motionReport(),
        brandLockedAssets: [lockedAsset("billboard")],
        brandMotionLockLog: null,
      },
    ]);
    assert.equal(aggregate.projectsChecked, 1);
    assert.equal(aggregate.segmentsChecked, 10);
    assert.ok(aggregate.workflowBreakdown.logo_placement);
    assert.equal(
      aggregate.workflowBreakdown.logo_placement?.mostCommonFailureReason,
      "brand_logo_not_recognizable"
    );
    assert.ok(aggregate.workflowBreakdown.logo_placement?.recommendation);
  });

  it("aggregates surface type breakdown", () => {
    const aggregate = aggregateBrandQaReports([
      {
        projectId: "b",
        workflowType: "logo_placement",
        metrics: metrics({ segmentsChecked: 5, segmentsCorrected: 1 }),
        report: null,
        brandLockedAssets: [lockedAsset("shirt")],
        brandMotionLockLog: null,
      },
    ]);
    assert.ok(aggregate.surfaceTypeBreakdown.shirt);
    assert.equal(aggregate.surfaceTypeBreakdown.shirt?.checked, 5);
  });

  it("compares tracking modes static vs quad interpolation", () => {
    const aggregate = aggregateBrandQaReports([
      {
        projectId: "c",
        workflowType: "logo_placement",
        metrics: metrics({ segmentsChecked: 2, segmentsCorrected: 1 }),
        report: motionReport(),
        brandLockedAssets: [lockedAsset("billboard")],
        brandMotionLockLog: null,
      },
    ]);
    assert.ok(aggregate.trackingModeBreakdown.static);
    assert.ok(aggregate.trackingModeBreakdown.quad_interpolation);
    assert.equal(aggregate.trackingModeBreakdown.static?.checked, 1);
    assert.equal(aggregate.trackingModeBreakdown.quad_interpolation?.checked, 1);
  });

  it("computes before/after dynamic tracking per workflow", () => {
    const aggregate = aggregateBrandQaReports([
      {
        projectId: "d",
        workflowType: "logo_placement",
        metrics: metrics({}),
        report: motionReport(),
        brandLockedAssets: [lockedAsset("billboard")],
        brandMotionLockLog: null,
      },
    ]);
    const row = aggregate.beforeAfterDynamicTracking.find((r) => r.workflowType === "logo_placement");
    assert.ok(row);
    assert.equal(row?.beforeDynamicTracking, 1);
    assert.equal(row?.afterDynamicTracking, 0);
    assert.equal(row?.improvementPercent, 100);
  });

  it("exports JSON payload shape", () => {
    const aggregate = aggregateBrandQaReports([]);
    const payload = buildBrandQaExportPayload(aggregate);
    assert.ok(payload.generatedAt);
    assert.ok(payload.overall);
    assert.ok(Array.isArray(payload.recommendations));
    assert.ok(payload.workflows);
    assert.ok(payload.surfaceTypes);
    assert.ok(payload.trackingModes);
  });
});
