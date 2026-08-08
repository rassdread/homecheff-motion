/**
 * Fusion workflow render credit pricing — separate from premium analysis (5 credits/image once).
 * Intent credits live in SHARED_PURE `studio-credit-constants` (no server imports).
 */

import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { BASE_EDITOR_GENERATION_PROVIDER_COST_USD } from "@/lib/editor-generation-access-config";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import {
  fusionIntentRenderCredits,
  USD_PER_CREDIT,
} from "@/lib/studio-credit-constants";
import type {
  FusionAnalysisReadiness,
  FusionIntelligenceState,
  FusionWorkflowCostLog,
  ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

const PREMIUM_ANALYSIS_PROVIDER_COST_USD = 0.025;
const BLUEPRINT_COST_USD = 0.001;
const TARGET_PROFIT_MARGIN_PERCENT = 50;
const LOW_PROFIT_MARGIN_PERCENT = 25;

export const FUSION_INTELLIGENCE_WORKFLOWS = new Set<EditorFusionIntent>([
  "character_fusion",
  "animal_human_fusion",
  "genetic_blend",
  "future_child",
  "human_into_mascot",
  "mascot_into_human",
  "character_upgrade",
  "character_role_variant",
  "outfit_from_reference",
  "person_outfit",
  "person_background",
  "product_branding",
  "product_packaging",
  "product_family",
  "life_timeline",
  "campaign_variant",
]);

export function fusionWorkflowUsesIntelligence(intent: EditorFusionIntent): boolean {
  return FUSION_INTELLIGENCE_WORKFLOWS.has(normalizeFusionIntent(intent));
}

export function fusionWorkflowRenderCredits(intent: EditorFusionIntent): number {
  return fusionIntentRenderCredits(normalizeFusionIntent(intent));
}

export function estimateFusionAnalysisCredits(
  profiles: ReferenceAnalysisProfile[],
  uncachedCount?: number
): { required: number; cached: number } {
  const missing =
    uncachedCount ??
    profiles.filter((profile) => !profile.premiumCached).length;
  const cached = profiles.length - missing;
  return {
    required: missing * PREMIUM_VISION_ANALYSIS_CREDITS,
    cached: cached * PREMIUM_VISION_ANALYSIS_CREDITS,
  };
}

export function buildFusionAnalysisReadiness(input: {
  requiredReferenceCount: number;
  profiles: ReferenceAnalysisProfile[];
}): FusionAnalysisReadiness {
  const analyzedCount = input.profiles.length;
  const cachedCount = input.profiles.filter((p) => p.premiumCached).length;
  const missingCount = Math.max(0, input.requiredReferenceCount - analyzedCount);
  return {
    requiredReferenceCount: input.requiredReferenceCount,
    analyzedCount,
    cachedCount,
    missingCount,
    allReady: missingCount === 0 && analyzedCount >= input.requiredReferenceCount,
    profiles: input.profiles,
  };
}

export function buildFusionIntelligenceCostState(input: {
  workflowType: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
}): Pick<
  FusionIntelligenceState,
  "analysisCreditsRequired" | "analysisCreditsCached" | "renderCredits"
> {
  const analysis = estimateFusionAnalysisCredits(input.profiles);
  return {
    analysisCreditsRequired: analysis.required,
    analysisCreditsCached: analysis.cached,
    renderCredits: fusionWorkflowRenderCredits(input.workflowType),
  };
}

export function estimateFusionWorkflowProfit(input: {
  workflowType: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  generationCount?: number;
}): FusionWorkflowCostLog {
  const renderCredits = fusionWorkflowRenderCredits(input.workflowType);
  const analysisCredits = estimateFusionAnalysisCredits(input.profiles).required;
  const totalCredits = renderCredits + analysisCredits;
  const generationCount = input.generationCount ?? 1;
  const renderCostUsd = BASE_EDITOR_GENERATION_PROVIDER_COST_USD * generationCount;
  const analysisCostUsd =
    input.profiles.filter((p) => !p.premiumCached).length * PREMIUM_ANALYSIS_PROVIDER_COST_USD;
  const blueprintCostUsd = BLUEPRINT_COST_USD;
  const totalCostUsd = renderCostUsd + analysisCostUsd + blueprintCostUsd;
  const revenueUsd = totalCredits * USD_PER_CREDIT;
  const estimatedProfitUsd = revenueUsd - totalCostUsd;
  const profitMarginPercent =
    revenueUsd > 0 ? Math.round((estimatedProfitUsd / revenueUsd) * 100) : 0;

  return {
    workflowType: input.workflowType,
    analysisCostUsd,
    blueprintCostUsd,
    renderCostUsd,
    totalCostUsd,
    creditsCharged: totalCredits,
    estimatedProfitUsd,
    profitMarginPercent,
    imageCount: generationCount + input.profiles.length,
    timestamp: new Date().toISOString(),
  };
}

export function fusionProfitMarginWarning(log: FusionWorkflowCostLog): "loss" | "low" | "ok" {
  if (log.estimatedProfitUsd < 0) {
    return "loss";
  }
  if (log.profitMarginPercent < LOW_PROFIT_MARGIN_PERCENT) {
    return "low";
  }
  if (log.profitMarginPercent >= TARGET_PROFIT_MARGIN_PERCENT) {
    return "ok";
  }
  return "low";
}

export function fusionIntelligenceTotalRenderCredits(intent: EditorFusionIntent): number {
  return fusionWorkflowRenderCredits(intent);
}
