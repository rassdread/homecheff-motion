import type { AssistantProjectContext } from "@/lib/assistant-context-layer";
import {
  getAssistantExecutionCreditEstimate,
  getAssistantExecutionMode,
  type AssistantExecutionStepActionId,
} from "@/lib/assistant-tool-execution-mode";
import { getMotionActionPreset, isMotionActionPresetId } from "@/lib/motion-action-presets";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { ActionPresetResolutionStep } from "@/types/action-preset-requirements";
import type {
  AssistantExecutionPlan,
  AssistantExecutionStep,
  AssistantToolExecutionStatus,
} from "@/types/assistant-tool-execution";

function createExecutionPlanId(): string {
  return `asst-exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mapResolutionStepToAction(
  step: ActionPresetResolutionStep
): AssistantExecutionStepActionId | null {
  if (step.kind === "use_existing") {
    return "use_existing_asset";
  }
  if (step.kind === "use_default") {
    return "use_preset_default";
  }
  if (step.kind === "open_wizard") {
    return "open_motion_wizard";
  }
  if (step.kind === "generate_video") {
    return null;
  }
  if (step.kind === "prepare" && step.actionId === "prepare_motion_character") {
    return "prepare_motion_character";
  }
  if (step.kind === "generate_plan" && step.actionId) {
    if (step.actionId === "prepare_outfit") {
      return "prepare_outfit";
    }
    if (step.actionId === "prepare_background") {
      return step.requirementId?.includes("location") || step.requirementId === "stadium_location"
        ? "prepare_location"
        : "prepare_background";
    }
    if (step.actionId === "prepare_prop") {
      if (step.requirementId === "sports_car" || step.requirementId === "vehicle") {
        return "prepare_vehicle";
      }
      return "prepare_prop";
    }
    if (step.actionId === "prepare_music") {
      return "prepare_music";
    }
    if (step.actionId === "prepare_sfx") {
      return "prepare_sfx";
    }
  }
  return null;
}

function labelKeyForAction(actionId: AssistantExecutionStepActionId): AssistantExecutionStep["labelKey"] {
  const map: Record<AssistantExecutionStepActionId, AssistantExecutionStep["labelKey"]> = {
    use_existing_asset: "assistant.execution.step.useCharacter",
    use_preset_default: "assistant.execution.step.useDefault",
    open_motion_wizard: "assistant.execution.step.openMotionWizard",
    prepare_motion_character: "assistant.execution.step.prepareMotionReady",
    prepare_outfit: "assistant.execution.step.prepareOutfit",
    prepare_background: "assistant.execution.step.prepareBackground",
    prepare_location: "assistant.execution.step.prepareLocation",
    prepare_prop: "assistant.execution.step.prepareProp",
    prepare_vehicle: "assistant.execution.step.prepareVehicle",
    prepare_music: "assistant.execution.step.prepareMusic",
    prepare_sfx: "assistant.execution.step.prepareSfx",
  };
  return map[actionId];
}

function buildStepInput(
  actionId: AssistantExecutionStepActionId,
  resolutionStep: ActionPresetResolutionStep,
  pkg: AssistantPrefillPackage,
  projectId?: string | null
): AssistantExecutionStep["input"] {
  const presetIdRaw = pkg.motion?.actionPresetId ?? pkg.hcActionPreset?.actionPresetId;
  const preset = presetIdRaw && isMotionActionPresetId(presetIdRaw) ? getMotionActionPreset(presetIdRaw) : null;
  const character = pkg.availableAssets?.find((asset) => asset.requirementId === "person_character");

  return {
    requirementId: resolutionStep.requirementId,
    assetId: resolutionStep.assetId,
    characterAssetId: character?.assetId,
    characterAssetUrl: character?.assetUrl,
    presetId: preset?.id,
    scenePrompt: preset?.sceneSettings.backgroundPrompt,
    projectId: projectId ?? pkg.projectId ?? null,
    prefillId: pkg.id,
    fusionIntent:
      actionId === "prepare_outfit"
        ? "outfit_from_reference"
        : actionId === "prepare_background" || actionId === "prepare_location"
          ? "scene_background"
          : actionId === "prepare_prop" || actionId === "prepare_vehicle"
            ? "prop_placement"
            : undefined,
    fusionArchetype:
      actionId === "prepare_outfit"
        ? "character_outfit"
        : actionId === "prepare_background" || actionId === "prepare_location"
          ? "scene_background"
          : actionId === "prepare_prop" || actionId === "prepare_vehicle"
            ? "prop_object"
            : undefined,
  };
}

export function buildAssistantExecutionPlan(input: {
  pkg: AssistantPrefillPackage;
  activeProject?: AssistantProjectContext | null;
  activeProjectId?: string | null;
  confirmed?: boolean;
}): AssistantExecutionPlan | null {
  const analysis = input.pkg.requirementAnalysis;
  const resolutionPlan = input.pkg.resolutionPlan ?? analysis?.resolutionPlan;
  if (!resolutionPlan || !analysis) {
    return null;
  }

  const presetId = resolutionPlan.presetId;
  const projectId =
    input.activeProjectId ?? input.activeProject?.id ?? input.pkg.projectId ?? null;
  const now = new Date().toISOString();
  const steps: AssistantExecutionStep[] = [];
  let order = 1;

  for (const resolutionStep of resolutionPlan.steps) {
    if (resolutionStep.kind === "generate_video") {
      continue;
    }
    const actionId = mapResolutionStepToAction(resolutionStep);
    if (!actionId) {
      continue;
    }

    const executionMode = getAssistantExecutionMode(actionId);
    const estimatedCredits = getAssistantExecutionCreditEstimate(actionId);
    const status: AssistantToolExecutionStatus = input.confirmed
      ? "planned"
      : "waiting_for_confirmation";

    steps.push({
      id: resolutionStep.id,
      order: order++,
      actionId,
      labelKey: labelKeyForAction(actionId),
      descriptionKey: labelKeyForAction(actionId),
      required: resolutionStep.kind !== "use_default",
      executionMode,
      estimatedCredits,
      estimatedDurationSec: executionMode === "auto_safe" ? 1 : 30,
      requirementId: resolutionStep.requirementId,
      input: buildStepInput(actionId, resolutionStep, input.pkg, projectId),
      status,
      createdAt: now,
    });
  }

  if (!steps.some((step) => step.actionId === "open_motion_wizard")) {
    steps.push({
      id: "open_motion_wizard",
      order: order++,
      actionId: "open_motion_wizard",
      labelKey: "assistant.execution.step.openMotionWizard",
      required: true,
      executionMode: "auto_safe",
      estimatedCredits: 0,
      estimatedDurationSec: 1,
      input: {
        presetId,
        projectId,
        prefillId: input.pkg.id,
      },
      status: input.confirmed ? "planned" : "waiting_for_confirmation",
      createdAt: now,
    });
  }

  const totalEstimatedCredits = steps.reduce((sum, step) => sum + step.estimatedCredits, 0);

  return {
    id: createExecutionPlanId(),
    prefillId: input.pkg.id,
    presetId,
    presetTitle: resolutionPlan.presetTitle,
    projectId,
    status: input.confirmed ? "planned" : "waiting_for_confirmation",
    steps,
    totalEstimatedCredits,
    preparedByAssistant: true,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

export function summarizeExecutionPlanCredits(plan: AssistantExecutionPlan): number {
  return plan.steps
    .filter((step) => step.status !== "skipped" && step.status !== "cancelled")
    .reduce((sum, step) => sum + step.estimatedCredits, 0);
}

export function findNextExecutableStep(plan: AssistantExecutionPlan): AssistantExecutionStep | null {
  return (
    plan.steps.find(
      (step) =>
        step.status === "planned" ||
        step.status === "running" ||
        step.status === "requires_user_review"
    ) ?? null
  );
}
