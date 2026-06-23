/**
 * Sprint J — rule-based Brand QA recommendations (no AI).
 */

import type { BrandQaSurfaceRow, BrandQaWorkflowRow } from "@/types/brand-qa-analytics";

export const BRAND_QA_RECOMMENDATIONS = {
  CURRENT_SYSTEM_SUFFICIENT: "current_system_sufficient",
  MONITOR_MORE_RUNS: "monitor_more_runs",
  IMPROVE_TRACKING: "improve_tracking",
  OPTICAL_FLOW_CANDIDATE: "optical_flow_candidate",
  DYNAMIC_TRACKING_SUFFICIENT: "dynamic_tracking_sufficient",
  NO_OPTICAL_FLOW_NEEDED: "no_optical_flow_needed",
} as const;

const FLAT_GOOD_SURFACES = new Set([
  "billboard",
  "packaging",
  "product_branding",
  "poster",
  "signage",
  "wall",
  "screen",
  "product_label",
]);

const HIGH_RISK_SURFACES = new Set(["shirt", "vehicle", "mug", "cup"]);

export function recommendFromCorrectionRate(correctionRate: number): string {
  if (correctionRate < 0.05) {
    return BRAND_QA_RECOMMENDATIONS.CURRENT_SYSTEM_SUFFICIENT;
  }
  if (correctionRate < 0.15) {
    return BRAND_QA_RECOMMENDATIONS.MONITOR_MORE_RUNS;
  }
  if (correctionRate < 0.3) {
    return BRAND_QA_RECOMMENDATIONS.IMPROVE_TRACKING;
  }
  return BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE;
}

export function recommendForSurface(
  surfaceType: string,
  correctionRate: number
): string {
  if (HIGH_RISK_SURFACES.has(surfaceType) && correctionRate > 0.15) {
    return BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE;
  }
  if (FLAT_GOOD_SURFACES.has(surfaceType) && correctionRate < 0.05) {
    return BRAND_QA_RECOMMENDATIONS.NO_OPTICAL_FLOW_NEEDED;
  }
  return recommendFromCorrectionRate(correctionRate);
}

export function recommendForWorkflow(
  workflowType: string,
  correctionRate: number
): string {
  if (
    (workflowType === "product_branding" ||
      workflowType === "logo_placement" ||
      workflowType === "product_packaging" ||
      workflowType === "billboard") &&
    correctionRate < 0.05
  ) {
    return BRAND_QA_RECOMMENDATIONS.DYNAMIC_TRACKING_SUFFICIENT;
  }
  return recommendFromCorrectionRate(correctionRate);
}

export function buildAggregateRecommendations(input: {
  overallCorrectionRate: number;
  workflowBreakdown: Record<string, BrandQaWorkflowRow>;
  surfaceTypeBreakdown: Record<string, BrandQaSurfaceRow>;
  trackingModeBreakdown: Record<string, { correctionRate: number }>;
}): { recommendations: string[]; highRiskSurfaces: string[] } {
  const recommendations = new Set<string>();
  const highRiskSurfaces: string[] = [];

  recommendations.add(recommendFromCorrectionRate(input.overallCorrectionRate));

  const staticRate = input.trackingModeBreakdown.static?.correctionRate ?? null;
  const quadRate = input.trackingModeBreakdown.quad_interpolation?.correctionRate ?? null;
  if (staticRate != null && quadRate != null && staticRate > quadRate) {
    recommendations.add(BRAND_QA_RECOMMENDATIONS.DYNAMIC_TRACKING_SUFFICIENT);
  }

  for (const [workflow, row] of Object.entries(input.workflowBreakdown)) {
    if (row.correctionRate >= 0.15) {
      recommendations.add(`${workflow}:${recommendForWorkflow(workflow, row.correctionRate)}`);
    }
  }

  for (const [surface, row] of Object.entries(input.surfaceTypeBreakdown)) {
    if (HIGH_RISK_SURFACES.has(surface)) {
      if (row.correctionRate > 0.1) {
        highRiskSurfaces.push(surface);
      }
      if (row.correctionRate > 0.15) {
        recommendations.add(`${surface}:${BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE}`);
      }
    }
    if (FLAT_GOOD_SURFACES.has(surface) && row.correctionRate < 0.05) {
      recommendations.add(`${surface}:${BRAND_QA_RECOMMENDATIONS.NO_OPTICAL_FLOW_NEEDED}`);
    }
  }

  if (
    input.overallCorrectionRate < 0.05 &&
    highRiskSurfaces.length === 0
  ) {
    recommendations.add(
      "Current system sufficient for flat branding workflows."
    );
  }

  return {
    recommendations: [...recommendations],
    highRiskSurfaces: [...new Set(highRiskSurfaces)],
  };
}

export function humanizeRecommendation(code: string): string {
  switch (code) {
    case BRAND_QA_RECOMMENDATIONS.CURRENT_SYSTEM_SUFFICIENT:
      return "Current system sufficient";
    case BRAND_QA_RECOMMENDATIONS.MONITOR_MORE_RUNS:
      return "Monitor more production runs";
    case BRAND_QA_RECOMMENDATIONS.IMPROVE_TRACKING:
      return "Improve tracking layer";
    case BRAND_QA_RECOMMENDATIONS.OPTICAL_FLOW_CANDIDATE:
      return "Optical flow candidate";
    case BRAND_QA_RECOMMENDATIONS.DYNAMIC_TRACKING_SUFFICIENT:
      return "Dynamic tracking sufficient";
    case BRAND_QA_RECOMMENDATIONS.NO_OPTICAL_FLOW_NEEDED:
      return "No optical flow needed";
    default:
      return code;
  }
}
