/** Persisted motion billing correlation — stored in posterMotionSettings JSON (no schema migration). */

export type MotionTransactionCorrelation = {
  version: 1;
  motionWizardSessionId: string;
  transactionId: string;
  billingCorrelationId: string;
  workflowKind: string;
  projectId?: string | null;
  analysisIds: string[];
  renderId?: string | null;
  state: string;
  reservedAt: string;
  analysisCompleteAt?: string | null;
  renderStartedAt?: string | null;
  capturedAt?: string | null;
  premiumAnalysisComplete: boolean;
  cachedAnalysesUsed: number;
  analysisCredits: number;
  renderCredits: number;
  totalCredits: number;
};

export function buildMotionBillingCorrelationId(transactionId: string): string {
  return `motion_${transactionId}`;
}
