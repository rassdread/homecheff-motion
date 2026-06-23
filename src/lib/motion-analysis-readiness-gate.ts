import type { MotionComplexityEstimate } from "@/types/motion-preset-engine";

export type MotionAnalysisReadinessResult =
  | { ok: true; reason: "cached" | "premium_complete" | "admin_bypass" | "not_required" }
  | { ok: false; reason: "premium_pending" | "premium_failed"; messageKey: string };

/** No render until required premium analysis is complete (or cached). */
export function validateMotionAnalysisReadiness(input: {
  hasActionPreset: boolean;
  complexityEstimate: MotionComplexityEstimate | null | undefined;
  premiumAnalysisComplete: boolean;
  userIsAdmin?: boolean;
  premiumAnalysisFailed?: boolean;
}): MotionAnalysisReadinessResult {
  if (!input.hasActionPreset) {
    return { ok: true, reason: "not_required" };
  }
  if (input.userIsAdmin) {
    return { ok: true, reason: "admin_bypass" };
  }
  if (input.premiumAnalysisFailed) {
    return { ok: false, reason: "premium_failed", messageKey: "motionEngine.errors.analysisFailed" };
  }
  const estimate = input.complexityEstimate;
  if (!estimate) {
    return { ok: true, reason: "not_required" };
  }
  if (estimate.analysisCached || estimate.requiredAnalysisPasses === 0) {
    return { ok: true, reason: "cached" };
  }
  if (input.premiumAnalysisComplete) {
    return { ok: true, reason: "premium_complete" };
  }
  return { ok: false, reason: "premium_pending", messageKey: "motionEngine.errors.analysisPending" };
}
