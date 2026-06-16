import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type {
  ActionPresetRequirementMetadata,
  ActionPresetRequirementResult,
  ActionPresetResolutionPlan,
  ActionPresetResolutionStep,
  AssistantActionPresetRequirementAnalysis,
} from "@/types/action-preset-requirements";
import type { MotionActionPresetMetadata } from "@/types/motion-action-presets";
import { resolveActionPresetRequirementsById } from "@/lib/action-preset-requirement-resolver";
import type {
  AssistantContextSnapshot,
  AssistantProjectContext,
} from "@/lib/assistant-context-layer";
import { getMotionActionPreset, isMotionActionPresetId } from "@/lib/motion-action-presets";

function planLabelForMissing(requirementId: string, kind: "generate" | "default"): ActionPresetResolutionStep["labelKey"] {
  if (requirementId.includes("outfit")) {
    return kind === "generate"
      ? "assistant.requirements.plan.generateOutfit"
      : "assistant.requirements.plan.defaultOutfit";
  }
  if (requirementId.includes("location") || requirementId === "stadium_location") {
    return kind === "generate"
      ? "assistant.requirements.plan.generateLocation"
      : "assistant.requirements.plan.defaultLocation";
  }
  if (requirementId === "sports_car" || requirementId === "vehicle") {
    return kind === "generate"
      ? "assistant.requirements.plan.generateVehicle"
      : "assistant.requirements.plan.defaultVehicle";
  }
  if (requirementId === "stage") {
    return kind === "generate"
      ? "assistant.requirements.plan.generateStage"
      : "assistant.requirements.plan.defaultStage";
  }
  return kind === "generate"
    ? "assistant.requirements.plan.generateAsset"
    : "assistant.requirements.plan.defaultAsset";
}

export function buildActionPresetResolutionPlan(
  result: ActionPresetRequirementResult
): ActionPresetResolutionPlan {
  const steps: ActionPresetResolutionStep[] = [];
  let order = 1;

  const character = result.availableAssets.find(
    (asset) => asset.requirementId === "person_character"
  );
  if (character) {
    steps.push({
      order: order++,
      id: "use_character",
      labelKey: "assistant.requirements.plan.useCharacter",
      kind: "use_existing",
      requirementId: "person_character",
      assetId: character.assetId,
    });
  } else {
    steps.push({
      order: order++,
      id: "prepare_character",
      labelKey: "assistant.requirements.plan.prepareCharacter",
      kind: "prepare",
      requirementId: "person_character",
      actionId: "create_character",
    });
  }

  if (result.motionReadyIssue) {
    steps.push({
      order: order++,
      id: "motion_ready",
      labelKey: "assistant.requirements.plan.prepareMotionReady",
      kind: "prepare",
      requirementId: "person_character",
      actionId: "prepare_motion_character",
    });
  }

  for (const missing of result.missingAssets) {
    if (missing.requirementId === "person_character") {
      continue;
    }
    const generateOption = missing.options.find(
      (option) =>
        option.kind === "generate_with_fusion" ||
        option.kind === "generate_background"
    );
    const defaultOption = missing.options.find((option) => option.kind === "use_preset_default");

    if (generateOption) {
      steps.push({
        order: order++,
        id: `plan_generate_${missing.requirementId}`,
        labelKey: planLabelForMissing(missing.requirementId, "generate"),
        kind: "generate_plan",
        requirementId: missing.requirementId,
        actionId: generateOption.actionId,
      });
    } else if (defaultOption) {
      steps.push({
        order: order++,
        id: `plan_default_${missing.requirementId}`,
        labelKey: planLabelForMissing(missing.requirementId, "default"),
        kind: "use_default",
        requirementId: missing.requirementId,
      });
    }
  }

  steps.push({
    order: order++,
    id: "open_motion_wizard",
    labelKey: "assistant.requirements.plan.openMotionWizard",
    kind: "open_wizard",
    actionId: "create_motion_video",
  });

  steps.push({
    order: order++,
    id: "generate_video",
    labelKey: "assistant.requirements.plan.generateVideo",
    kind: "generate_video",
    actionId: "create_motion_video",
  });

  return {
    presetId: result.presetId,
    presetTitle: result.presetTitle,
    steps,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function buildAssistantRecommendations(
  result: ActionPresetRequirementResult
): AssistantActionPresetRequirementAnalysis["assistantRecommendations"] {
  const recommendations: AssistantActionPresetRequirementAnalysis["assistantRecommendations"] = [];

  if (result.availableAssets.some((asset) => asset.requirementId === "person_character")) {
    recommendations.push("assistant.requirements.recommendation.characterFound");
  } else {
    recommendations.push("assistant.requirements.recommendation.characterMissing");
  }

  if (result.motionReadyIssue) {
    recommendations.push("assistant.requirements.recommendation.motionReadyNeeded");
  }

  if (result.recommendedAssets.length > 0) {
    recommendations.push("assistant.requirements.recommendation.reuseProjectAssets");
  }

  for (const missing of result.missingAssets) {
    if (missing.requirementId.includes("outfit")) {
      recommendations.push("assistant.requirements.recommendation.outfitMissing");
      break;
    }
  }

  for (const missing of result.missingAssets) {
    if (missing.requirementId.includes("location") || missing.requirementId === "stadium_location") {
      recommendations.push("assistant.requirements.recommendation.locationMissing");
      break;
    }
  }

  for (const missing of result.missingAssets) {
    if (missing.requirementId === "sports_car" || missing.requirementId === "vehicle") {
      recommendations.push("assistant.requirements.recommendation.vehicleMissing");
      break;
    }
  }

  for (const missing of result.missingAssets) {
    if (missing.requirementId === "stage") {
      recommendations.push("assistant.requirements.recommendation.stageMissing");
      break;
    }
  }

  recommendations.push("assistant.requirements.recommendation.noProviderCalls");

  return recommendations;
}

export function buildActionPresetRequirementMetadata(
  result: ActionPresetRequirementResult,
  plan: ActionPresetResolutionPlan,
  projectId?: string | null
): ActionPresetRequirementMetadata {
  return {
    presetId: result.presetId,
    analyzedAt: new Date().toISOString(),
    availableCount: result.availableAssets.length,
    missingCount: result.missingAssets.length,
    requiredMissingCount: result.missingAssets.filter((asset) => asset.required).length,
    projectId: projectId ?? null,
    reusedProjectAssetIds: result.recommendedAssets.map((asset) => asset.assetId),
    planStepIds: plan.steps.map((step) => step.id),
  };
}

export function buildAssistantProducerAnalysis(input: {
  presetId: string;
  snapshot: AssistantContextSnapshot;
  activeProject?: AssistantProjectContext | null;
}): AssistantActionPresetRequirementAnalysis | null {
  if (!isMotionActionPresetId(input.presetId)) {
    return null;
  }

  const requirementResult = resolveActionPresetRequirementsById(
    input.presetId,
    input.snapshot,
    input.activeProject
  );
  if (!requirementResult) {
    return null;
  }

  const resolutionPlan = buildActionPresetResolutionPlan(requirementResult);
  requirementResult.resolutionPlan = resolutionPlan;

  const requirementMetadata = buildActionPresetRequirementMetadata(
    requirementResult,
    resolutionPlan,
    input.activeProject?.id
  );

  return {
    requirementResult,
    resolutionPlan,
    missingAssets: requirementResult.missingAssets,
    availableAssets: requirementResult.availableAssets,
    assistantRecommendations: buildAssistantRecommendations(requirementResult),
    requirementMetadata,
  };
}

export function enrichPrefillWithProducerAnalysis(
  pkg: AssistantPrefillPackage,
  snapshot: AssistantContextSnapshot,
  activeProject?: AssistantProjectContext | null
): AssistantPrefillPackage {
  const presetId =
    pkg.motion?.actionPresetId ??
    (typeof pkg.outputSettings?.actionPresetId === "string"
      ? pkg.outputSettings.actionPresetId
      : null);

  if (!presetId || !isMotionActionPresetId(presetId)) {
    return pkg;
  }

  const analysis = buildAssistantProducerAnalysis({
    presetId,
    snapshot,
    activeProject,
  });
  if (!analysis) {
    return pkg;
  }

  const preset = getMotionActionPreset(presetId);
  const requiredPersonMissing = analysis.missingAssets.some(
    (asset) => asset.requirementId === "person_character" && asset.required
  );

  const hcActionPreset: MotionActionPresetMetadata = {
    ...(pkg.hcActionPreset ?? {
      actionPresetId: presetId,
      actionPresetCategory: preset?.category ?? "sports",
      actionPresetTitle: preset?.title ?? presetId,
      promptTemplate: preset?.promptTemplate ?? "",
      feasibilityNote: preset?.feasibilityNote ?? "",
    }),
    requirementMetadata: analysis.requirementMetadata,
  };

  const activitySteps = [
    { id: "intent", labelKey: "assistant.prefill.activity.intent" as const, status: "done" as const },
    { id: "preset", labelKey: "assistant.prefill.activity.actionPreset" as const, status: "done" as const },
    {
      id: "requirements",
      labelKey: "assistant.prefill.activity.requirements" as const,
      status: "done" as const,
    },
    {
      id: "plan",
      labelKey: "assistant.prefill.activity.preparationPlan" as const,
      status: requiredPersonMissing ? ("active" as const) : ("done" as const),
    },
    {
      id: "review",
      labelKey: "assistant.prefill.activity.review" as const,
      status: requiredPersonMissing ? ("pending" as const) : ("active" as const),
    },
  ];

  return {
    ...pkg,
    readiness: requiredPersonMissing ? "waiting_for_answer" : pkg.readiness,
    understoodKey: "assistant.understood.producerActionPreset",
    activitySteps,
    requirementAnalysis: analysis,
    resolutionPlan: analysis.resolutionPlan,
    missingAssets: analysis.missingAssets,
    availableAssets: analysis.availableAssets,
    assistantRecommendations: analysis.assistantRecommendations,
    requirementMetadata: analysis.requirementMetadata,
    hcActionPreset,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function buildProducerSummaryParams(
  analysis: AssistantActionPresetRequirementAnalysis
): Record<string, string | number> {
  return {
    presetTitle: analysis.requirementResult.presetTitle,
    availableCount: analysis.availableAssets.length,
    missingCount: analysis.missingAssets.length,
    planSteps: analysis.resolutionPlan.steps.length,
  };
}
