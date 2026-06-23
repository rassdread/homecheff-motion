import { parsePosterMotionSettings } from "@/lib/poster-motion-preserve";
import { validateMotionAnalysisReadiness } from "@/lib/motion-analysis-readiness-gate";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

export type MotionPreflightAnalysisGateResult =
  | { ok: true }
  | { ok: false; code: "MOTION_ANALYSIS_INCOMPLETE"; blockMessage: string };

/** Server gate — block render when action preset requires uncached premium analysis. */
export function validateMotionPreflightAnalysisGate(
  payload: InstantPremiumCreatePayload
): MotionPreflightAnalysisGateResult {
  const settings = parsePosterMotionSettings(payload.posterMotionSettings);
  const preset = settings.hcActionPreset;
  if (!preset?.engineSnapshot) {
    return { ok: true };
  }

  const readiness = validateMotionAnalysisReadiness({
    hasActionPreset: true,
    complexityEstimate: preset.engineSnapshot.complexityEstimate,
    premiumAnalysisComplete: preset.engineSnapshot.premiumAnalysisComplete === true,
    premiumAnalysisFailed: false,
  });

  if (!readiness.ok) {
    return {
      ok: false,
      code: "MOTION_ANALYSIS_INCOMPLETE",
      blockMessage:
        readiness.reason === "premium_failed"
          ? "Image analysis could not finish. Please try again before generating."
          : "Please wait for image analysis to finish before generating your video.",
    };
  }

  return { ok: true };
}
