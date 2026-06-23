import { resolveCompositionBaseImageUrl } from "@/lib/editor-composition-plan";
import { logFusionRenderAnalysis } from "@/lib/editor-fusion-analysis-timing-log";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { resolveFusionIntelligenceForGeneration } from "@/lib/editor-fusion-intelligence";
import { fusionPayloadToInstructionReferences } from "@/lib/editor-fusion-variant-render";
import { ensureFusionWizardPremiumAnalyses } from "@/lib/editor-fusion-wizard-premium";
import { FUSION_WIZARD_PROGRESS_STEP_KEYS } from "@/lib/editor-fusion-wizard-flow";
import { getFusionPlan } from "@/lib/editor-fusion-plan";
import { mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveCompositionBrandIdentity } from "@/lib/editor-personalized-recommendations";
import { validateWizardCreditReservation } from "@/lib/wizard-credit-reservation";
import { resolveWizardWorkflowPriceFromIntake } from "@/lib/wizard-workflow-pricing";
import {
  compensateWizardPipelineFailure,
  createWizardTransaction,
  markWizardTransactionCaptureComplete,
  markWizardTransactionReserved,
  registerWizardPremiumCapture,
  transitionWizardTransaction,
} from "@/lib/wizard-transaction-lifecycle";
import { metadataEnrichedGenerationPrompt } from "@/lib/editor-metadata-pipeline";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { FusionRunRecord } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type FusionWizardRenderApiResponse = {
  ok: boolean;
  resultUrl?: string;
  storageKey?: string;
  provider?: string;
  model?: string;
  error?: string;
  code?: string;
  creditGate?: boolean;
  estimatedCredits?: number;
  fusionRun?: FusionRunRecord;
  fusionCreditsCharged?: number;
  analysisCreditsCharged?: number;
  totalCreditsCharged?: number;
  librarySaved?: boolean;
  libraryAssetId?: string | null;
  providerSupportsMultiReference?: boolean;
  referenceImageCount?: number;
};

export async function executeFusionWizardRenderApi(input: {
  sessionId: string;
  imageUrl: string;
  prompt: string;
  workflowType: EditorFusionIntent;
  fusionRenderPayload: import("@/types/editor-fusion-intelligence").FusionRenderPayload;
  references?: import("@/types/editor-instruction-studio").EditorInstructionReference[];
  confirmed?: boolean;
  hcProjectId?: string | null;
  projectTitle?: string | null;
}): Promise<FusionWizardRenderApiResponse> {
  const res = await fetch("/api/editor/fusion/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflowType: input.workflowType,
      sessionId: input.sessionId,
      imageUrl: input.imageUrl,
      prompt: input.prompt,
      fusionRenderPayload: input.fusionRenderPayload,
      references: input.references,
      confirmed: input.confirmed ?? true,
      hcProjectId: input.hcProjectId,
      projectTitle: input.projectTitle,
      triggerSource: "fusion_wizard_render",
      componentName: "EditorFusionWizard",
      buttonName: "fusion-wizard-render",
    }),
  });

  const payload = (await res.json()) as FusionWizardRenderApiResponse & {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: payload.error ?? "Fusion render failed.",
      code: payload.code,
      creditGate: payload.creditGate,
      estimatedCredits: payload.estimatedCredits,
    };
  }

  return payload;
}

export type FusionWizardRenderOutcome =
  | {
      ok: true;
      resultUrl: string;
      storageKey?: string;
      document: EditorCanvasDocument;
      intake: EditorReferenceIntakeState;
      fusionRun?: FusionRunRecord;
      creditsUsed: number;
      analysisReused: boolean;
      premiumCreditsCharged: number;
      renderCreditsCharged: number;
    }
  | {
      ok: false;
      code: "validation" | "analysis" | "credit_gate" | "render" | "unknown";
      message: string;
      estimatedCredits?: number;
      document: EditorCanvasDocument;
      intake: EditorReferenceIntakeState;
    };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runFusionWizardRenderPipeline(input: {
  intake: EditorReferenceIntakeState;
  document: EditorCanvasDocument;
  combineIntent: EditorFusionIntent;
  isAdmin?: boolean;
  creditsAvailable?: number;
  onProgress: (stepIndex: number) => void;
  confirmed?: boolean;
}): Promise<FusionWizardRenderOutcome> {
  let document = input.document;
  let intake = input.intake;
  const fusionPlan = getFusionPlan(document);
  if (!fusionPlan) {
    return {
      ok: false,
      code: "validation",
      message: "Missing fusion plan.",
      document,
      intake,
    };
  }

  const base = resolveCompositionBaseImageUrl(document);
  if (!base.url?.trim() || !document.sessionId?.trim()) {
    return {
      ok: false,
      code: "validation",
      message: "validation_missing_base",
      document,
      intake,
    };
  }

  const price = resolveWizardWorkflowPriceFromIntake({
    intake,
    isAdmin: input.isAdmin,
  });
  let transaction = price ? createWizardTransaction(price) : null;
  if (price) {
    const reservation = validateWizardCreditReservation({
      price,
      creditsAvailable: input.creditsAvailable ?? 0,
    });
    if (!reservation.ok) {
      return {
        ok: false,
        code: "credit_gate",
        message: "insufficient_credits",
        estimatedCredits: reservation.required,
        document,
        intake,
      };
    }
    if (transaction) {
      transaction = markWizardTransactionReserved(transaction);
    }
  }

  input.onProgress(0);
  await delay(80);

  input.onProgress(1);
  transaction =
    transaction ? transitionWizardTransaction(transaction, "ANALYSIS_RUNNING") : null;
  const premiumResult = await ensureFusionWizardPremiumAnalyses({
    intake,
    isAdmin: input.isAdmin,
    creditsAvailable: input.creditsAvailable,
  });

  if (!premiumResult.ok) {
    if (premiumResult.code === "credit_gate") {
      return {
        ok: false,
        code: "credit_gate",
        message: "insufficient_credits",
        estimatedCredits: premiumResult.estimatedCredits,
        document,
        intake: premiumResult.intake,
      };
    }
    return {
      ok: false,
      code: "analysis",
      message: "analysis_failed",
      document,
      intake: premiumResult.intake,
    };
  }

  document = premiumResult.document;
  intake = premiumResult.intake;
  if (transaction) {
    for (const session of premiumResult.capturedPremiumSessions) {
      transaction = registerWizardPremiumCapture(transaction, session);
    }
  }

  await delay(80);
  input.onProgress(2);
  transaction =
    transaction ? transitionWizardTransaction(transaction, "RENDER_RUNNING") : null;

  const fusionIntelligence = resolveFusionIntelligenceForGeneration({
    document,
    plan: getFusionPlan(document) ?? fusionPlan,
  });

  if (!fusionIntelligence.ready || !fusionIntelligence.state?.renderPayload) {
    return {
      ok: false,
      code: "analysis",
      message: "analysis_incomplete",
      document,
      intake,
    };
  }

  document = {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      fusionIntelligence: fusionIntelligence.state,
    },
  };

  const recCtx = buildEditorRecommendationContext({ document });
  const referenceAssignments =
    document.instructionStudioState?.referenceIntake?.roleAssignments?.filter(
      (assignment): assignment is import("@/types/editor-reference-metadata").EditorReferenceAssignment =>
        Boolean(assignment.url && assignment.instanceId && assignment.name)
    ) ?? [];

  const prompt = metadataEnrichedGenerationPrompt(
    fusionIntelligence.prompt ||
      buildEditorFusionPrompt({
        plan: fusionPlan,
        brandIdentity: resolveCompositionBrandIdentity(recCtx),
        referenceAssignments,
        fusionRenderPayload: fusionIntelligence.state.renderPayload,
      }),
    document
  );

  await delay(80);
  input.onProgress(3);

  const result = await executeFusionWizardRenderApi({
    sessionId: document.sessionId,
    imageUrl: base.url,
    prompt,
    workflowType: input.combineIntent,
    fusionRenderPayload: fusionIntelligence.state.renderPayload,
    references: fusionPayloadToInstructionReferences(fusionIntelligence.state.renderPayload),
    confirmed: input.confirmed,
    hcProjectId: document.sessionId,
    projectTitle: document.name,
  });

  input.onProgress(4);

  const renderCreditsCharged = result.fusionCreditsCharged ?? 0;

  logFusionRenderAnalysis({
    phase: "render",
    cacheHits: premiumResult.cacheHits,
    cacheMisses: premiumResult.cacheMisses,
    premiumAnalysesStarted: premiumResult.premiumAnalysesStarted,
    premiumCreditsCharged: premiumResult.premiumCreditsCharged,
    renderCreditsCharged,
  });

  if (!result.ok && result.creditGate) {
    if (transaction) {
      await compensateWizardPipelineFailure({
        record: transaction,
        failureReason: "render_credit_gate",
        renderFailed: true,
      });
    }
    return {
      ok: false,
      code: "credit_gate",
        message: "insufficient_credits",
      estimatedCredits: result.estimatedCredits,
      document,
      intake,
    };
  }

  if (!result.ok) {
    if (transaction) {
      await compensateWizardPipelineFailure({
        record: transaction,
        failureReason: result.error ?? "render_failed",
        renderFailed: true,
      });
    }
    const code =
      result.code === "ANALYSIS" || result.code === "analysis_failed"
        ? "analysis"
        : result.code === "VALIDATION"
          ? "validation"
          : "render";
    return {
      ok: false,
      code,
      message: result.error ?? "render_failed",
      document,
      intake,
    };
  }

  if (!result.resultUrl) {
    if (transaction) {
      await compensateWizardPipelineFailure({
        record: transaction,
        failureReason: "render_no_image",
        renderFailed: true,
      });
    }
    return {
      ok: false,
      code: "render",
      message: "Fusion render returned no image.",
      document,
      intake,
    };
  }

  const fusionRunWithProtection = result.fusionRun;

  const completedDoc: EditorCanvasDocument = {
    ...document,
    backgroundUrl: result.resultUrl,
    instructionStudioState: {
      ...document.instructionStudioState,
      fusionIntelligence: {
        ...fusionIntelligence.state,
        lastRun: fusionRunWithProtection,
      },
    },
  };

  const analysisReused = premiumResult.cacheHits > 0 && premiumResult.premiumAnalysesStarted === 0;

  if (transaction) {
    markWizardTransactionCaptureComplete(transaction);
  }

  return {
    ok: true,
    resultUrl: result.resultUrl,
    storageKey: result.storageKey,
    document: completedDoc,
    intake,
      fusionRun: fusionRunWithProtection,
    creditsUsed:
      result.totalCreditsCharged ??
      premiumResult.premiumCreditsCharged + renderCreditsCharged,
    analysisReused,
    premiumCreditsCharged: premiumResult.premiumCreditsCharged,
    renderCreditsCharged,
  };
}

export function fusionWizardProgressLabelKey(stepIndex: number): string {
  return FUSION_WIZARD_PROGRESS_STEP_KEYS[stepIndex] ?? FUSION_WIZARD_PROGRESS_STEP_KEYS[0];
}
