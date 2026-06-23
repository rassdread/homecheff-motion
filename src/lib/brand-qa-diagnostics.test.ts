import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runBrandQaDiagnostics } from "@/lib/brand-qa-diagnostics";
import type { BrandQaSourceRecord } from "@/lib/brand-qa-analytics";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";

function record(
  workflowType: string,
  surfaceType: BrandLockedAsset["surfaceType"],
  corrected: number,
  checked: number
): BrandQaSourceRecord {
  return {
    projectId: `p-${workflowType}-${surfaceType}`,
    workflowType,
    metrics: {
      projectId: `p-${workflowType}-${surfaceType}`,
      workflowType,
      segmentsChecked: checked,
      segmentsPassed: checked - corrected,
      segmentsWarned: 0,
      segmentsFailed: corrected,
      segmentsCorrected: corrected,
      enforcementRate: checked > 0 ? corrected / checked : 0,
      createdAt: new Date().toISOString(),
    },
    report: null,
    brandLockedAssets: [
      {
        assetId: "logo",
        assetUrl: "https://example.com/logo.png",
        motionLocked: true,
        preserveExact: true,
        preserveMode: "post_composite",
        trackingMode: "affine_segment",
        validationMode: "post_composite",
        surfaceType,
      },
    ],
    brandMotionLockLog: null,
  };
}

describe("brand qa diagnostics (Sprint J)", () => {
  it("filters by workflow and surface type", () => {
    const records = [
      record("logo_placement", "billboard", 1, 10),
      record("logo_placement", "shirt", 4, 10),
      record("product_branding", "packaging", 0, 10),
    ];

    const result = runBrandQaDiagnostics(records, {
      workflowType: "logo_placement",
      surfaceType: "billboard",
      sampleCount: 10,
    });

    assert.equal(result.workflowType, "logo_placement");
    assert.equal(result.surfaceType, "billboard");
    assert.equal(result.sampleCount, 1);
    assert.equal(result.correctionRate, 0.1);
    assert.ok(result.recommendation);
  });

  it("returns pass rate from metrics", () => {
    const result = runBrandQaDiagnostics([record("logo_placement", "billboard", 2, 10)], {
      workflowType: "logo_placement",
      surfaceType: "billboard",
    });
    assert.equal(result.passRate, 0.8);
  });
});
