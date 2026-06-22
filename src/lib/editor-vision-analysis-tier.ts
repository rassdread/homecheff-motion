/**
 * Editor vision analysis tiers — basic (cheap/local) vs premium (AI Vision Parts + Style DNA).
 */

import type { VisionAnalysisRunTrigger } from "@/lib/editor-vision-analysis-run-guard";
import {
  PREMIUM_VISION_ANALYSIS_CREDITS,
  type PremiumVisionAnalysisBillingLog,
  type PremiumVisionCreditStatus,
} from "@/lib/editor-premium-vision-credits";
import {
  resolveEditorAssetId,
  resolveEditorProjectId,
} from "@/lib/editor-project-isolation";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

/** @deprecated use "basic" | "premium" — "provisional" and "full" are legacy aliases. */
export type EditorVisionAnalysisDepth = "basic" | "premium" | "provisional" | "full";

export type EditorVisionAnalysisTier = "basic" | "premium";

export type EditorVisionAnalysisCostTrigger =
  | "upload"
  | "manual_button"
  | "admin_test"
  | "auto_start"
  | "workspace_mount"
  | "document_change"
  | "isolation_controls"
  | "unknown";

export type EditorVisionAnalysisProvider =
  | "rtdetr_local"
  | "style_dna_gpt"
  | "vision_parts_api"
  | "template_local";

export type EditorVisionAnalysisCostLog = {
  analysisType: EditorVisionAnalysisTier;
  triggeredBy: EditorVisionAnalysisCostTrigger;
  userId?: string | null;
  projectId?: string | null;
  assetId?: string | null;
  sessionId?: string | null;
  runId?: string | null;
  providersUsed: EditorVisionAnalysisProvider[];
  estimatedCost: number;
  actualCost: number;
  timestamp: string;
};

export type PremiumVisionAnalysisGateResult = {
  allowed: boolean;
  reason: "admin_bypass" | "credits_available" | "no_credits" | "payment_required";
  adminTestLabel?: string;
  requiredCredits: number;
};

const PROVIDER_ESTIMATED_COST_USD: Record<EditorVisionAnalysisProvider, number> = {
  rtdetr_local: 0,
  template_local: 0,
  style_dna_gpt: 0.012,
  vision_parts_api: 0.045,
};

const costLogs: EditorVisionAnalysisCostLog[] = [];

export function normalizeEditorVisionAnalysisTier(
  depth?: EditorVisionAnalysisDepth | null
): EditorVisionAnalysisTier {
  if (depth === "premium" || depth === "full") {
    return "premium";
  }
  return "basic";
}

export function resolveEditorVisionAnalysisTierFromInput(input: {
  trigger?: VisionAnalysisRunTrigger;
  analysisDepth?: EditorVisionAnalysisDepth | null;
}): EditorVisionAnalysisTier {
  if (input.analysisDepth != null) {
    return normalizeEditorVisionAnalysisTier(input.analysisDepth);
  }
  if (input.trigger === "deep-analyze" || input.trigger === "manual-reanalyze") {
    return "premium";
  }
  return "basic";
}

export function mapTriggerToCostLogTrigger(
  trigger?: VisionAnalysisRunTrigger
): EditorVisionAnalysisCostTrigger {
  switch (trigger) {
    case "auto-start":
    case "auto-start-retry":
    case "image-visible":
      return "upload";
    case "deep-analyze":
    case "manual-reanalyze":
      return "manual_button";
    case "workspace-mount":
    case "instruction-workspace-mount":
      return "workspace_mount";
    case "document-change":
    case "hydrate":
    case "refresh-load":
      return "document_change";
    case "isolation-controls":
      return "isolation_controls";
    default:
      return "unknown";
  }
}

export function providersForAnalysisTier(
  tier: EditorVisionAnalysisTier
): EditorVisionAnalysisProvider[] {
  if (tier === "premium") {
    return ["rtdetr_local", "template_local", "style_dna_gpt", "vision_parts_api"];
  }
  return ["rtdetr_local", "template_local"];
}

export function estimateAnalysisCostUsd(
  providers: EditorVisionAnalysisProvider[]
): number {
  return providers.reduce((sum, provider) => sum + PROVIDER_ESTIMATED_COST_USD[provider], 0);
}

export function resolvePremiumVisionAnalysisGate(input: {
  isAdmin?: boolean;
  creditsAvailable?: number;
  requiredCredits?: number;
}): PremiumVisionAnalysisGateResult {
  const requiredCredits = input.requiredCredits ?? PREMIUM_VISION_ANALYSIS_CREDITS;
  if (input.isAdmin) {
    return {
      allowed: true,
      reason: "admin_bypass",
      adminTestLabel: "Admin test — geen credits",
      requiredCredits: 0,
    };
  }
  if (typeof input.creditsAvailable === "number" && input.creditsAvailable >= requiredCredits) {
    return { allowed: true, reason: "credits_available", requiredCredits };
  }
  return { allowed: false, reason: "no_credits", requiredCredits };
}

export function logEditorVisionAnalysisCost(
  input: Omit<EditorVisionAnalysisCostLog, "timestamp" | "estimatedCost" | "actualCost"> & {
    estimatedCost?: number;
    actualCost?: number;
  }
): EditorVisionAnalysisCostLog {
  const estimatedCost =
    input.estimatedCost ?? estimateAnalysisCostUsd(input.providersUsed);
  const actualCost = input.actualCost ?? estimatedCost;
  const entry: EditorVisionAnalysisCostLog = {
    ...input,
    estimatedCost,
    actualCost,
    timestamp: new Date().toISOString(),
  };
  costLogs.push(entry);
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor.vision.analysis.cost]", entry);
  }
  return entry;
}

export function buildEditorVisionAnalysisCostLogFromDocument(input: {
  document: EditorCanvasDocument;
  tier: EditorVisionAnalysisTier;
  trigger?: VisionAnalysisRunTrigger;
  userId?: string | null;
  runId?: string | null;
  providersUsed?: EditorVisionAnalysisProvider[];
  isAdminTest?: boolean;
}): EditorVisionAnalysisCostLog {
  const triggeredBy = mapTriggerToCostLogTrigger(input.trigger);
  return logEditorVisionAnalysisCost({
    analysisType: input.tier,
    triggeredBy:
      input.tier === "premium" && input.isAdminTest ? "admin_test" : triggeredBy,
    userId: input.userId ?? null,
    projectId: resolveEditorProjectId(input.document),
    assetId: resolveEditorAssetId(input.document),
    sessionId: input.document.sessionId,
    runId: input.runId ?? input.document.visionAnalysisRun?.runId ?? null,
    providersUsed: input.providersUsed ?? providersForAnalysisTier(input.tier),
  });
}

export function getEditorVisionAnalysisCostLogsForTests(): EditorVisionAnalysisCostLog[] {
  return [...costLogs];
}

export function resetEditorVisionAnalysisCostLogsForTests(): void {
  costLogs.length = 0;
}

export function documentHasPremiumVisionAnalysis(
  document: Pick<EditorCanvasDocument, "visionV6Meta">
): boolean {
  return document.visionV6Meta?.analysisTier === "premium";
}

export function stampDocumentAnalysisTier(
  document: EditorCanvasDocument,
  tier: EditorVisionAnalysisTier
): EditorCanvasDocument {
  const meta = document.visionV6Meta;
  if (!meta) {
    return {
      ...document,
      visionV6Meta: {
        illustrationAnalysis: tier === "premium",
        rtdetrCount: 0,
        visionPartCount: 0,
        mergedLayerCount: 0,
        openAiPartsUsed: false,
        layerSources: [],
        analysisTier: tier,
        premiumAnalysisCompletedAt:
          tier === "premium" ? new Date().toISOString() : undefined,
      },
    };
  }
  return {
    ...document,
    visionV6Meta: {
      ...meta,
      analysisTier: tier,
      premiumAnalysisCompletedAt:
        tier === "premium"
          ? new Date().toISOString()
          : meta.premiumAnalysisCompletedAt,
    },
  };
}

export function stampPremiumAnalysisBilling(
  document: EditorCanvasDocument,
  billing: PremiumVisionAnalysisBillingLog
): EditorCanvasDocument {
  const meta = document.visionV6Meta;
  if (!meta) {
    return {
      ...document,
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 0,
        visionPartCount: 0,
        mergedLayerCount: 0,
        openAiPartsUsed: false,
        layerSources: [],
        analysisTier: "premium",
        premiumAnalysisBilling: billing,
      },
    };
  }
  return {
    ...document,
    visionV6Meta: {
      ...meta,
      premiumAnalysisBilling: billing,
    },
  };
}

export function buildPremiumAnalysisBillingLog(input: {
  creditsRequired: number;
  creditsCharged: number;
  creditStatus: PremiumVisionCreditStatus;
  creditTransactionId?: string | null;
  providersUsed?: EditorVisionAnalysisProvider[];
  providerCostEstimateUsd?: number;
  providerCostActualUsd?: number;
  status: PremiumVisionAnalysisBillingLog["status"];
  startedAt: string;
  completedAt?: string;
}): PremiumVisionAnalysisBillingLog {
  const providersUsed = input.providersUsed ?? providersForAnalysisTier("premium");
  return {
    analysisType: "premium",
    creditsRequired: input.creditsRequired,
    creditsCharged: input.creditsCharged,
    creditStatus: input.creditStatus,
    creditTransactionId: input.creditTransactionId ?? null,
    providersUsed: providersUsed.filter((p) => p !== "rtdetr_local" && p !== "template_local"),
    providerCostEstimateUsd:
      input.providerCostEstimateUsd ?? estimateAnalysisCostUsd(providersUsed),
    providerCostActualUsd:
      input.providerCostActualUsd ?? input.providerCostEstimateUsd ?? estimateAnalysisCostUsd(providersUsed),
    status: input.status,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };
}
