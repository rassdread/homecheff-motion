import {
  createMotionWizardSession,
  motionWizardCaptureComplete,
  motionWizardCompensateFailure,
  motionWizardCompleteAnalysis,
  motionWizardStartAnalysis,
  motionWizardStartRender,
  validateMotionWizardCredits,
  type MotionWizardSession,
} from "@/lib/motion-wizard-pipeline";
import type { MotionComplexityEstimate } from "@/types/motion-preset-engine";
import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";

export type MotionPresetTransactionContext = {
  session: MotionWizardSession;
  price: WizardWorkflowPrice;
};

export function buildMotionPresetTransactionPrice(
  estimate: MotionComplexityEstimate
): WizardWorkflowPrice {
  return {
    workflowType: "person_background",
    analysisCredits: estimate.estimatedAnalysisCredits,
    renderCredits: estimate.estimatedRenderCredits,
    totalCredits: estimate.estimatedTotalCredits,
    includedFeatures: ["smart_analysis", "high_quality_render", "character_consistency"],
    requiresPayment: estimate.estimatedTotalCredits > 0,
    adminBypass: false,
    cachedAnalysesUsed: estimate.cachedAnalysisCount,
    uncachedReferenceCount: estimate.uncachedAnalysisCount,
    referenceCount: estimate.referenceCount,
  };
}

export function beginMotionPresetTransaction(input: {
  estimate: MotionComplexityEstimate;
  creditsAvailable: number;
}): { ok: true; context: MotionPresetTransactionContext } | { ok: false; reason: string } {
  const price = buildMotionPresetTransactionPrice(input.estimate);
  const gate = validateMotionWizardCredits({
    price,
    creditsAvailable: input.creditsAvailable,
  });
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.code === "insufficient_credits" ? "insufficient_credits" : "credit_gate_failed",
    };
  }
  const session = createMotionWizardSession({
    workflowKind: "action_preset",
    price,
  });
  return {
    ok: true,
    context: {
      session: {
        ...session,
        ...motionWizardStartAnalysis(session),
      },
      price,
    },
  };
}

export function advanceMotionPresetTransactionAfterAnalysis(
  session: MotionWizardSession
): MotionWizardSession {
  return motionWizardCompleteAnalysis(session);
}

export function advanceMotionPresetTransactionToRender(
  session: MotionWizardSession
): MotionWizardSession {
  return motionWizardStartRender(session);
}

export async function failMotionPresetTransaction(
  session: MotionWizardSession,
  reason: string
): Promise<MotionWizardSession> {
  return motionWizardCompensateFailure(session, reason);
}

export function completeMotionPresetTransaction(
  session: MotionWizardSession
): MotionWizardSession {
  return motionWizardCaptureComplete(session);
}
