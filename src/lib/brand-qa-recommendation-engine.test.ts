import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_QA_RECOMMENDATIONS,
  buildAggregateRecommendations,
  recommendForSurface,
  recommendForWorkflow,
  recommendFromCorrectionRate,
} from "@/lib/brand-qa-recommendation-engine";

describe("brand qa recommendation engine (Sprint J)", () => {
  it("maps correction rate tiers", () => {
    assert.equal(recommendFromCorrectionRate(0.02), BRAND_QA_RECOMMENDATIONS.CURRENT_SYSTEM_SUFFICIENT);
    assert.equal(recommendFromCorrectionRate(0.08), BRAND_QA_RECOMMENDATIONS.MONITOR_MORE_RUNS);
    assert.equal(recommendFromCorrectionRate(0.2), BRAND_QA_RECOMMENDATIONS.IMPROVE_TRACKING);
    assert.equal(recommendFromCorrectionRate(0.35), BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE);
  });

  it("flags high-risk surfaces above 15%", () => {
    assert.equal(
      recommendForSurface("shirt", 0.2),
      BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE
    );
    assert.equal(
      recommendForSurface("billboard", 0.03),
      BRAND_QA_RECOMMENDATIONS.NO_OPTICAL_FLOW_NEEDED
    );
  });

  it("recommends dynamic tracking sufficient for low flat workflows", () => {
    assert.equal(
      recommendForWorkflow("product_branding", 0.03),
      BRAND_QA_RECOMMENDATIONS.DYNAMIC_TRACKING_SUFFICIENT
    );
  });

  it("builds aggregate recommendations with high-risk surfaces", () => {
    const result = buildAggregateRecommendations({
      overallCorrectionRate: 0.03,
      workflowBreakdown: {
        logo_placement: {
          checked: 100,
          corrected: 3,
          correctionRate: 0.03,
          mostCommonFailureReason: null,
          recommendation: BRAND_QA_RECOMMENDATIONS.DYNAMIC_TRACKING_SUFFICIENT,
        },
      },
      surfaceTypeBreakdown: {
        shirt: {
          checked: 20,
          corrected: 5,
          correctionRate: 0.25,
          recommendation: BRAND_QA_RECOMMENDATIONS.IMPROVE_TRACKING,
        },
        billboard: {
          checked: 80,
          corrected: 2,
          correctionRate: 0.025,
          recommendation: BRAND_QA_RECOMMENDATIONS.NO_OPTICAL_FLOW_NEEDED,
        },
      },
      trackingModeBreakdown: {
        static: { correctionRate: 0.18 },
        quad_interpolation: { correctionRate: 0.03 },
      },
    });
    assert.ok(result.recommendations.length > 0);
    assert.ok(result.highRiskSurfaces.includes("shirt"));
  });
});
