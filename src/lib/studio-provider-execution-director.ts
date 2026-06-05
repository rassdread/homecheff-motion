/**
 * Studio V41 — Provider Execution Director (planning only).
 */

import { resolveAllProviderAssignments } from "@/lib/studio-provider-assignment";
import { buildProviderCapabilityMatrix } from "@/lib/studio-provider-capabilities";
import {
  estimateProviderCost,
  sumProviderCostEstimates,
} from "@/lib/studio-provider-cost-estimate";
import { buildProviderFallbackPlan } from "@/lib/studio-provider-fallback";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  MotionProviderExecutionHandoffPlan,
  ProviderExecutionPlan,
  ProviderExecutionWarning,
  StudioProviderType,
} from "@/types/studio-provider-execution";

function detectExecutionWarnings(params: {
  storyboard: StudioStoryboardDetail;
  assignments: ProviderExecutionPlan["assignments"];
}): ProviderExecutionWarning[] {
  const warnings: ProviderExecutionWarning[] = [];
  const scenes = params.storyboard.scenes ?? [];

  if (params.storyboard.voiceEnabled) {
    const voice = params.assignments.find((a) => a.assetType === "voice");
    if (!voice?.fallbackProviderId) {
      warnings.push({
        code: "voice_no_fallback",
        severity: "info",
        messageKey: "studio.provider.warning.voiceNoFallback",
      });
    }
  }

  if (scenes.length > 8) {
    warnings.push({
      code: "high_scene_count",
      severity: "warning",
      messageKey: "studio.provider.warning.highSceneCount",
      params: { count: scenes.length },
    });
  }

  warnings.push({
    code: "planning_only",
    severity: "info",
    messageKey: "studio.provider.warning.planningOnly",
  });

  return warnings;
}

export function buildProviderExecutionPlan(
  storyboard: StudioStoryboardDetail
): ProviderExecutionPlan {
  const scenes = storyboard.scenes ?? [];
  const language = (storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const assignments = resolveAllProviderAssignments({
    language,
    costProfile: "balanced",
    qualityProfile: "standard",
  });

  const estimatedCost = assignments.map((assignment) =>
    estimateProviderCost({
      providerId: assignment.selectedProviderId,
      providerType: assignment.assetType,
      sceneCount: scenes.length,
      qualityProfile: "standard",
      costProfile: "balanced",
    })
  );

  const totals = sumProviderCostEstimates(estimatedCost);
  const capabilities = buildProviderCapabilityMatrix();
  const fallbackPlan = buildProviderFallbackPlan();
  const executionWarnings = detectExecutionWarnings({ storyboard, assignments });

  const pick = (type: StudioProviderType) =>
    assignments.find((a) => a.assetType === type)!.selectedProviderId;

  return {
    enabled: scenes.length > 0,
    version: 41,
    voiceProvider: pick("voice"),
    musicProvider: pick("music"),
    soundProvider: pick("sound"),
    imageProvider: pick("image"),
    videoProvider: pick("video"),
    assignments,
    estimatedCost,
    estimatedTotalCredits: totals.totalCredits,
    estimatedTotalCostEur: totals.totalCostEur,
    estimatedLatencySeconds: totals.maxLatencySeconds,
    executionWarnings,
    fallbackPlan,
    capabilities,
  };
}

export function isProviderExecutionPlanReady(plan: ProviderExecutionPlan): boolean {
  return (
    plan.enabled &&
    plan.assignments.length === 5 &&
    plan.assignments.every((a) => Boolean(a.selectedProviderId))
  );
}

export function buildMotionProviderExecutionHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionProviderExecutionHandoffPlan {
  const plan = buildProviderExecutionPlan(storyboard);
  return {
    enabled: plan.enabled,
    voiceProvider: plan.voiceProvider,
    musicProvider: plan.musicProvider,
    soundProvider: plan.soundProvider,
    imageProvider: plan.imageProvider,
    videoProvider: plan.videoProvider,
    estimatedTotalCredits: plan.estimatedTotalCredits,
    estimatedTotalCostEur: plan.estimatedTotalCostEur,
    estimatedLatencySeconds: plan.estimatedLatencySeconds,
    executionWarnings: plan.executionWarnings,
    providerAssignments: plan.assignments,
    providerFallbackPlan: plan.fallbackPlan,
    providerCapabilities: plan.capabilities,
    providerCostEstimate: plan.estimatedCost,
    providerWarnings: plan.executionWarnings,
  };
}
