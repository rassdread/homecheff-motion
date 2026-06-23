import type { MotionWizardSession } from "@/lib/motion-wizard-pipeline";
import type { MotionPresetEngineSnapshot } from "@/types/motion-preset-engine";
import type { MotionTransactionCorrelation } from "@/types/motion-transaction-correlation";
import { buildMotionBillingCorrelationId } from "@/types/motion-transaction-correlation";
import type { WizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";

export function buildMotionTransactionCorrelation(input: {
  session: MotionWizardSession;
  price: WizardWorkflowPrice;
  snapshot: MotionPresetEngineSnapshot;
  projectId?: string | null;
  premiumAnalysisComplete?: boolean;
}): MotionTransactionCorrelation {
  const transactionId = input.session.metadata.transactionId;
  return {
    version: 1,
    motionWizardSessionId: transactionId,
    transactionId,
    billingCorrelationId: buildMotionBillingCorrelationId(transactionId),
    workflowKind: input.session.workflowKind,
    projectId: input.projectId ?? null,
    analysisIds: input.snapshot.visionPipeline?.signalsReady ? [transactionId] : [],
    renderId: null,
    state: input.session.state,
    reservedAt: new Date().toISOString(),
    analysisCompleteAt: input.premiumAnalysisComplete ? new Date().toISOString() : null,
    renderStartedAt: null,
    capturedAt: null,
    premiumAnalysisComplete: input.premiumAnalysisComplete ?? input.snapshot.complexityEstimate.analysisCached,
    cachedAnalysesUsed: input.price.cachedAnalysesUsed,
    analysisCredits: input.price.analysisCredits,
    renderCredits: input.price.renderCredits,
    totalCredits: input.price.totalCredits,
  };
}

export function parseMotionTransactionCorrelation(raw: unknown): MotionTransactionCorrelation | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Partial<MotionTransactionCorrelation>;
  if (o.version !== 1 || typeof o.transactionId !== "string") {
    return null;
  }
  return o as MotionTransactionCorrelation;
}

export function stampMotionTransactionProjectId(
  correlation: MotionTransactionCorrelation,
  projectId: string
): MotionTransactionCorrelation {
  return {
    ...correlation,
    projectId,
    renderId: projectId,
  };
}

export function stampMotionTransactionCaptured(
  correlation: MotionTransactionCorrelation
): MotionTransactionCorrelation {
  return {
    ...correlation,
    state: "CAPTURED",
    capturedAt: new Date().toISOString(),
  };
}
