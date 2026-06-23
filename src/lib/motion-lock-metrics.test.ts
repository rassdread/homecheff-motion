import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateMotionLockProjectMetrics,
  buildMotionLockProjectMetrics,
  resolveMotionLockWorkflowType,
} from "@/lib/motion-lock-metrics";
import type { MotionLockProjectReport } from "@/types/motion-lock-layer";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";

function sampleReport(overrides?: Partial<MotionLockProjectReport>): MotionLockProjectReport {
  return {
    projectId: "proj-1",
    segmentsChecked: 2,
    segmentsCorrected: 1,
    assetsLocked: 1,
    generatedAt: new Date().toISOString(),
    segments: [
      {
        segmentId: "s0",
        segmentIndex: 0,
        validationPassed: true,
        enforcementApplied: false,
        sourceVideoUrl: "https://example.com/0.mp4",
        validation: {
          passed: true,
          assetsChecked: 1,
          assetsMissing: [],
          assetsDegraded: [],
          confidence: 0.9,
          assetResults: [],
          enforcementRequired: false,
          sampling: {
            sampleCount: 11,
            passCount: 11,
            warnCount: 0,
            failCount: 0,
            worstConfidence: 0.9,
            segmentVerdict: "PASS",
          },
        },
        sampling: {
          sampleCount: 11,
          passCount: 11,
          warnCount: 0,
          failCount: 0,
          worstConfidence: 0.9,
          segmentVerdict: "PASS",
        },
      },
      {
        segmentId: "s1",
        segmentIndex: 1,
        validationPassed: false,
        enforcementApplied: true,
        sourceVideoUrl: "https://example.com/1.mp4",
        validation: {
          passed: false,
          assetsChecked: 1,
          assetsMissing: ["logo"],
          assetsDegraded: [],
          confidence: 0.2,
          assetResults: [],
          enforcementRequired: true,
          sampling: {
            sampleCount: 11,
            passCount: 10,
            warnCount: 0,
            failCount: 1,
            worstConfidence: 0.2,
            segmentVerdict: "FAIL",
          },
        },
        sampling: {
          sampleCount: 11,
          passCount: 10,
          warnCount: 0,
          failCount: 1,
          worstConfidence: 0.2,
          segmentVerdict: "FAIL",
        },
      },
    ],
    ...overrides,
  };
}

describe("motion lock metrics (Sprint H)", () => {
  it("builds project metrics with enforcement rate", () => {
    const metrics = buildMotionLockProjectMetrics({
      projectId: "proj-1",
      workflowType: "product_branding",
      report: sampleReport(),
    });
    assert.equal(metrics.segmentsChecked, 2);
    assert.equal(metrics.segmentsPassed, 1);
    assert.equal(metrics.segmentsFailed, 1);
    assert.equal(metrics.segmentsCorrected, 1);
    assert.equal(metrics.enforcementRate, 0.5);
    assert.equal(metrics.workflowType, "product_branding");
  });

  it("aggregates workflow breakdown and correction rate", () => {
    const aggregate = aggregateMotionLockProjectMetrics([
      buildMotionLockProjectMetrics({
        projectId: "a",
        workflowType: "product_branding",
        report: sampleReport(),
      }),
      buildMotionLockProjectMetrics({
        projectId: "b",
        workflowType: "logo_placement",
        report: sampleReport({
          segmentsChecked: 1,
          segmentsCorrected: 0,
          segments: sampleReport().segments.slice(0, 1),
        }),
      }),
    ]);

    assert.equal(aggregate.projectsChecked, 2);
    assert.equal(aggregate.segmentsChecked, 3);
    assert.equal(aggregate.segmentsCorrected, 1);
    assert.ok(Math.abs(aggregate.correctionRate - 1 / 3) < 0.001);
    assert.equal(aggregate.workflowBreakdown.product_branding?.corrected, 1);
    assert.equal(aggregate.workflowBreakdown.logo_placement?.checked, 1);
  });

  it("counts warned segments separately", () => {
    const report = sampleReport({
      segmentsCorrected: 0,
      segments: [
        {
          segmentId: "w",
          segmentIndex: 0,
          validationPassed: true,
          enforcementApplied: false,
          sourceVideoUrl: "https://example.com/w.mp4",
          validation: {
            passed: true,
            assetsChecked: 1,
            assetsMissing: [],
            assetsDegraded: ["logo"],
            confidence: 0.55,
            assetResults: [],
            enforcementRequired: false,
            sampling: {
              sampleCount: 11,
              passCount: 9,
              warnCount: 2,
              failCount: 0,
              worstConfidence: 0.55,
              segmentVerdict: "WARN",
            },
          },
          sampling: {
            sampleCount: 11,
            passCount: 9,
            warnCount: 2,
            failCount: 0,
            worstConfidence: 0.55,
            segmentVerdict: "WARN",
          },
        },
      ],
    });
    const metrics = buildMotionLockProjectMetrics({
      projectId: "warn",
      workflowType: "packaging",
      report,
    });
    assert.equal(metrics.segmentsWarned, 1);
    assert.equal(metrics.segmentsFailed, 0);
    assert.equal(metrics.segmentsPassed, 0);
  });

  it("resolves workflow type from handoff fusion intent", () => {
    const type = resolveMotionLockWorkflowType(
      { fusionIntent: "product_branding" },
      [] as BrandLockedAsset[]
    );
    assert.equal(type, "product_branding");
  });

  it("infers workflow type from locked asset surface", () => {
    const assets: BrandLockedAsset[] = [
      {
        assetId: "l",
        assetUrl: "https://example.com/l.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        targetBounds: { x: 0, y: 0, width: 0.2, height: 0.1, exact: true },
        trackingMode: "affine_segment",
        validationMode: "post_composite",
        surfaceType: "packaging",
      },
    ];
    assert.equal(resolveMotionLockWorkflowType(null, assets), "product_packaging");
  });
});
