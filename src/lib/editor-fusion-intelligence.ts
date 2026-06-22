/**
 * Fusion Intelligence Layer orchestrator — analysis → blueprint → render payload.
 */

import {
  hasValidPremiumAnalysis,
  premiumAnalysisNeedsRefresh,
  readCachedFusionAnalysisProfile,
  readCachedFusionAnalysisProfileByUrl,
  writeCachedFusionAnalysisProfile,
} from "@/lib/editor-fusion-analysis-cache";
import { logFusionWorkflowCost } from "@/lib/editor-fusion-cost-log";
import { buildFusionBlueprint } from "@/lib/editor-fusion-blueprint";
import {
  buildReferenceAnalysisProfile,
  summarizeReferenceProfile,
} from "@/lib/editor-fusion-reference-profile";
import {
  buildFusionRenderPayload,
  buildFusionIntelligencePrompt,
} from "@/lib/editor-fusion-render-payload";
import {
  buildFusionAnalysisReadiness,
  buildFusionIntelligenceCostState,
  estimateFusionWorkflowProfit,
  fusionWorkflowUsesIntelligence,
} from "@/lib/editor-fusion-workflow-credits";
import { startEditorImageAnalysis } from "@/lib/start-editor-image-analysis";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import type {
  FusionIntelligenceState,
  ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent, EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type FusionReferenceInput = {
  document: EditorCanvasDocument;
  referenceId: string;
  role?: string;
  roleId?: string;
  name?: string;
};

export type EnsureFusionReferenceAnalysisResult = {
  document: EditorCanvasDocument;
  profile: ReferenceAnalysisProfile;
  creditsCharged: number;
  cached: boolean;
  ok: boolean;
  failureCode?: "insufficient_credits" | "analysis_failed";
};

export async function ensureFusionReferencePremiumAnalysis(input: {
  reference: FusionReferenceInput;
  force?: boolean;
  isAdmin?: boolean;
  creditsAvailable?: number;
  onDocumentChange?: (document: EditorCanvasDocument) => void;
}): Promise<EnsureFusionReferenceAnalysisResult> {
  const { reference } = input;
  let doc = reference.document;

  if (!premiumAnalysisNeedsRefresh(doc, { force: input.force }) && hasValidPremiumAnalysis(doc)) {
    const cached =
      readCachedFusionAnalysisProfile(doc) ??
      buildReferenceAnalysisProfile({
        document: doc,
        referenceId: reference.referenceId,
        role: reference.role,
        roleId: reference.roleId,
        name: reference.name,
        premiumCached: true,
      });
    doc = writeCachedFusionAnalysisProfile(doc, { ...cached, premiumCached: true });
    input.onDocumentChange?.(doc);
    return { document: doc, profile: cached, creditsCharged: 0, cached: true, ok: true };
  }

  const analysisResult = await startEditorImageAnalysis({
    document: doc,
    trigger: "deep-analyze",
    analysisDepth: "premium",
    force: Boolean(input.force),
    isAdmin: input.isAdmin,
    creditsAvailable: input.creditsAvailable,
    onDocumentChange: input.onDocumentChange,
  });

  if (!analysisResult.willExecute) {
    const failureCode =
      analysisResult.blockedReason === "insufficient_credits" ||
      analysisResult.blockedReason === "premium_analysis_gated"
        ? "insufficient_credits"
        : "analysis_failed";
    return {
      document: analysisResult.preparedDocument,
      profile: buildReferenceAnalysisProfile({
        document: analysisResult.preparedDocument,
        referenceId: reference.referenceId,
        role: reference.role,
        roleId: reference.roleId,
        name: reference.name,
        premiumCached: false,
      }),
      creditsCharged: 0,
      cached: false,
      ok: false,
      failureCode,
    };
  }

  doc = analysisResult.accepted ?? analysisResult.preparedDocument;

  if (!analysisResult.accepted || !hasValidPremiumAnalysis(doc)) {
    return {
      document: doc,
      profile: buildReferenceAnalysisProfile({
        document: doc,
        referenceId: reference.referenceId,
        role: reference.role,
        roleId: reference.roleId,
        name: reference.name,
        premiumCached: false,
      }),
      creditsCharged: 0,
      cached: false,
      ok: false,
      failureCode: "analysis_failed",
    };
  }

  const profile = buildReferenceAnalysisProfile({
    document: doc,
    referenceId: reference.referenceId,
    role: reference.role,
    roleId: reference.roleId,
    name: reference.name,
    premiumCached: false,
  });
  doc = writeCachedFusionAnalysisProfile(doc, profile);
  input.onDocumentChange?.(doc);

  const creditsCharged = input.isAdmin ? 0 : PREMIUM_VISION_ANALYSIS_CREDITS;
  return { document: doc, profile, creditsCharged, cached: false, ok: true };
}

export function profileFromAnalyzedDocument(input: FusionReferenceInput): ReferenceAnalysisProfile {
  const cached = readCachedFusionAnalysisProfile(input.document);
  if (cached) {
    return {
      ...cached,
      referenceId: input.referenceId,
      role: input.role ?? cached.role,
      roleId: input.roleId ?? cached.roleId,
      name: input.name ?? cached.name,
      premiumCached: true,
    };
  }
  return buildReferenceAnalysisProfile({
    document: input.document,
    referenceId: input.referenceId,
    role: input.role,
    roleId: input.roleId,
    name: input.name,
    premiumCached: hasValidPremiumAnalysis(input.document),
  });
}

export function buildFusionIntelligenceState(input: {
  document: EditorCanvasDocument;
  plan: EditorFusionPlan;
  profiles: ReferenceAnalysisProfile[];
}): FusionIntelligenceState {
  const blueprint = buildFusionBlueprint({
    intent: input.plan.intent,
    plan: input.plan,
    profiles: input.profiles,
  });
  const payload = buildFusionRenderPayload({
    document: input.document,
    plan: input.plan,
    profiles: input.profiles,
    blueprint,
  });

  const costState = buildFusionIntelligenceCostState({
    workflowType: input.plan.intent,
    profiles: input.profiles,
  });

  return {
    workflowType: input.plan.intent,
    referenceProfiles: input.profiles,
    blueprint,
    renderPayload: payload,
    builtAt: new Date().toISOString(),
    ...costState,
  };
}

export function resolveFusionIntelligenceForGeneration(input: {
  document: EditorCanvasDocument;
  plan: EditorFusionPlan;
  referenceDocuments?: FusionReferenceInput[];
}): {
  ready: boolean;
  prompt: string;
  state: FusionIntelligenceState | null;
  readiness: ReturnType<typeof buildFusionAnalysisReadiness>;
} {
  const intent = input.plan.intent;
  if (!fusionWorkflowUsesIntelligence(intent)) {
    return {
      ready: false,
      prompt: "",
      state: null,
      readiness: buildFusionAnalysisReadiness({
        requiredReferenceCount: 0,
        profiles: [],
      }),
    };
  }

  const stored = input.document.instructionStudioState?.fusionIntelligence;
  if (
    stored &&
    stored.workflowType === intent &&
    stored.renderPayload &&
    stored.referenceProfiles.length > 0
  ) {
    const readiness = buildFusionAnalysisReadiness({
      requiredReferenceCount: fusionIntelligenceRequiredReferenceCount(intent),
      profiles: stored.referenceProfiles,
    });
    const costLog = estimateFusionWorkflowProfit({
      workflowType: intent,
      profiles: stored.referenceProfiles,
    });
    logFusionWorkflowCost(costLog);
    return {
      ready:
        readiness.allReady &&
        stored.referenceProfiles.every(
          (profile) => profile.premiumCached || hasValidPremiumAnalysis(profile.assetId)
        ),
      prompt: buildFusionIntelligencePrompt(stored.renderPayload),
      state: stored,
      readiness,
    };
  }

  const refs =
    input.referenceDocuments ??
    input.plan.references.map((ref) => {
      const cached = readCachedFusionAnalysisProfileByUrl(ref.url);
      return {
        document: input.document,
        referenceId: ref.id,
        name: ref.name,
        ...(cached
          ? {
              document: {
                ...input.document,
                backgroundUrl: ref.url,
                referenceAnalysisProfile: cached,
                visionV6Meta: input.document.visionV6Meta,
                visionAnalysis: input.document.visionAnalysis,
              },
            }
          : {}),
      };
    });

  const profiles = refs.map((ref) => profileFromAnalyzedDocument(ref));
  const requiredCount = fusionIntelligenceRequiredReferenceCount(intent);
  const readiness = buildFusionAnalysisReadiness({
    requiredReferenceCount: requiredCount,
    profiles,
  });

  const premiumReady =
    profiles.length >= requiredCount &&
    profiles.every((profile) => profile.premiumCached || hasValidPremiumAnalysis(profile.assetId));

  if (!premiumReady) {
    return { ready: false, prompt: "", state: null, readiness };
  }

  const state = buildFusionIntelligenceState({
    document: input.document,
    plan: input.plan,
    profiles,
  });

  const costLog = estimateFusionWorkflowProfit({
    workflowType: intent,
    profiles,
  });
  logFusionWorkflowCost(costLog);

  const prompt = buildFusionIntelligencePrompt(state.renderPayload!);

  return { ready: true, prompt, state, readiness };
}

export function fusionIntelligenceRequiredReferenceCount(intent: EditorFusionIntent): number {
  switch (intent) {
    case "character_fusion":
    case "animal_human_fusion":
    case "genetic_blend":
    case "future_child":
    case "outfit_from_reference":
    case "person_outfit":
    case "person_background":
      return 2;
    case "product_branding":
    case "product_packaging":
      return 2;
    default:
      return 1;
  }
}

export function fusionReferenceSummaryForUi(profile: ReferenceAnalysisProfile): string {
  return summarizeReferenceProfile(profile);
}
