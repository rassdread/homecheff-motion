import type { MotionTransactionCorrelation } from "@/types/motion-transaction-correlation";
import type { WizardTransactionRecord } from "@/lib/wizard-transaction-lifecycle";

export type MotionTransactionReconciliationIssue = {
  code:
    | "missing_project_id"
    | "orphan_transaction"
    | "analysis_incomplete"
    | "double_capture_risk"
    | "refund_without_capture"
    | "state_mismatch";
  message: string;
  transactionId?: string;
  projectId?: string | null;
};

export function reconcileMotionTransaction(input: {
  correlation: MotionTransactionCorrelation | null | undefined;
  session?: WizardTransactionRecord | null;
  projectId?: string | null;
  renderStarted?: boolean;
}): MotionTransactionReconciliationIssue[] {
  const issues: MotionTransactionReconciliationIssue[] = [];
  const correlation = input.correlation;
  if (!correlation) {
    return issues;
  }

  if (input.projectId && correlation.projectId && correlation.projectId !== input.projectId) {
    issues.push({
      code: "state_mismatch",
      message: "Project id does not match stored motion transaction correlation.",
      transactionId: correlation.transactionId,
      projectId: input.projectId,
    });
  }

  if (!correlation.projectId && input.renderStarted) {
    issues.push({
      code: "missing_project_id",
      message: "Render started without project id on motion transaction correlation.",
      transactionId: correlation.transactionId,
    });
  }

  if (
    correlation.premiumAnalysisComplete === false &&
    correlation.analysisCredits > 0 &&
    input.renderStarted
  ) {
    issues.push({
      code: "analysis_incomplete",
      message: "Render started before premium analysis completed.",
      transactionId: correlation.transactionId,
      projectId: correlation.projectId,
    });
  }

  if (input.session?.renderCaptured && correlation.state !== "CAPTURED") {
    issues.push({
      code: "double_capture_risk",
      message: "Session marked captured but correlation state is not CAPTURED.",
      transactionId: correlation.transactionId,
    });
  }

  if (correlation.state === "REFUNDED" && correlation.capturedAt) {
    issues.push({
      code: "refund_without_capture",
      message: "Transaction refunded but capture timestamp exists.",
      transactionId: correlation.transactionId,
    });
  }

  return issues;
}

export function motionTransactionIsReconciled(issues: MotionTransactionReconciliationIssue[]): boolean {
  return issues.length === 0;
}
