/** Premium editor vision analysis — credit pricing and billing action key. */

export const PREMIUM_VISION_ANALYSIS_ACTION = "premium_vision_analysis" as const;

export const PREMIUM_VISION_ANALYSIS_CREDITS = 5;

export type PremiumVisionCreditStatus =
  | "pending"
  | "charged"
  | "refunded"
  | "admin_free"
  | "none";

export type PremiumVisionAnalysisBillingLog = {
  analysisType: "premium";
  creditsRequired: number;
  creditsCharged: number;
  creditStatus: PremiumVisionCreditStatus;
  creditTransactionId?: string | null;
  providersUsed: string[];
  providerCostEstimateUsd: number;
  providerCostActualUsd: number;
  status: "running" | "complete" | "failed";
  startedAt: string;
  completedAt?: string;
};

export type PremiumVisionCreditReservation = {
  reservationId: string;
  requiredCredits: number;
  service: string;
  provider: string;
  reservedCostUsd: number;
  marginEstimate: number;
};

export type PremiumVisionCreditSession = {
  adminBypass: boolean;
  reservation: PremiumVisionCreditReservation;
  creditsCharged: number;
  creditStatus: PremiumVisionCreditStatus;
  startedAt: string;
  sessionId?: string | null;
  analysisId?: string | null;
  analysisRunId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
};

export function buildEditorPremiumProviderCallId(input: {
  analysisRunId?: string | null;
  sessionId?: string | null;
  analysisId?: string | null;
  route: "style_dna" | "vision_parts";
}): string {
  const runKey =
    input.analysisRunId?.trim() ||
    [input.sessionId?.trim(), input.analysisId?.trim()].filter(Boolean).join("::") ||
    "unknown-run";
  return `${runKey}::${input.route}`;
}
