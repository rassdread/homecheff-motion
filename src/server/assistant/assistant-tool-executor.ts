import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import {
  isAssistantV4BlockedAction,
  isAssistantV4ExecutableAction,
  isVideoRenderAction,
} from "@/lib/assistant-tool-execution-mode";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import { getActionPresetRequirement } from "@/lib/action-preset-requirements";
import type {
  AssistantExecutionPlan,
  AssistantExecutionResult,
  AssistantExecutionStep,
  AssistantPreparedAssetLink,
} from "@/types/assistant-tool-execution";

export type ExecuteAssistantPlanStepInput = {
  plan: AssistantExecutionPlan;
  stepId: string;
  confirmed: boolean;
  libraryAssetNames?: Record<string, { assetName: string; assetUrl: string; thumbnailUrl?: string | null }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function failStep(
  plan: AssistantExecutionPlan,
  step: AssistantExecutionStep,
  message: string,
  options?: { retryable?: boolean; skipAllowed?: boolean; manualRoute?: string }
): AssistantExecutionResult {
  const failed: AssistantExecutionStep = {
    ...step,
    status: "failed",
    startedAt: step.startedAt ?? nowIso(),
    completedAt: nowIso(),
    error: message,
    output: {
      errorMessage: message,
      retryable: options?.retryable ?? true,
      skipAllowed: options?.skipAllowed ?? !step.required,
      manualRoute: options?.manualRoute,
    },
  };
  return {
    planId: plan.id,
    stepId: step.id,
    status: "failed",
    step: failed,
    plan: { ...plan, status: "failed" },
    requiresUserReview: false,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function completeStep(
  plan: AssistantExecutionPlan,
  step: AssistantExecutionStep,
  output: AssistantExecutionStep["output"],
  status: AssistantExecutionStep["status"] = "completed"
): AssistantExecutionResult {
  const completed: AssistantExecutionStep = {
    ...step,
    status,
    startedAt: step.startedAt ?? nowIso(),
    completedAt: nowIso(),
    output,
  };
  const stepIndex = plan.steps.findIndex((row) => row.id === step.id);
  const next = plan.steps.slice(stepIndex + 1).find((row) => row.status === "planned" || row.status === "waiting_for_confirmation");
  return {
    planId: plan.id,
    stepId: step.id,
    status,
    step: completed,
    plan: {
      ...plan,
      status: status === "requires_user_review" ? "requires_user_review" : plan.status,
      startedAt: plan.startedAt ?? nowIso(),
    },
    nextStepId: next?.id ?? null,
    requiresUserReview: status === "requires_user_review",
    handoffRoute: output?.handoffRoute,
    handoffPrefillId: output?.handoffPrefillId,
    providerCalls: 0,
    creditsConsumed: 0,
  };
}

function preparedFromExisting(
  step: AssistantExecutionStep,
  assetId: string,
  assetName: string,
  assetUrl: string,
  projectId?: string | null
): AssistantPreparedAssetLink {
  return {
    requirementId: step.requirementId ?? "person_character",
    assetId,
    url: assetUrl,
    assetName,
    projectId: projectId ?? null,
    sourceActionId: "use_existing",
  };
}

function buildFusionBootstrap(step: AssistantExecutionStep): Record<string, unknown> {
  const requirement = step.requirementId ? getActionPresetRequirement(step.requirementId) : null;
  return {
    prefillId: step.input.prefillId,
    fusionIntent: step.input.fusionIntent,
    fusionArchetype: step.input.fusionArchetype,
    requirementId: step.requirementId,
    requirementLabel: requirement?.label,
    scenePrompt: step.input.scenePrompt,
    characterAssetId: step.input.characterAssetId,
    characterAssetUrl: step.input.characterAssetUrl,
    projectId: step.input.projectId,
    generationProfile: "assistant_v4_prepare",
  };
}

export function executeAssistantPlanStep(input: ExecuteAssistantPlanStepInput): AssistantExecutionResult {
  const { plan, stepId, confirmed } = input;
  const step = plan.steps.find((row) => row.id === stepId);
  if (!step) {
    throw new Error(`Unknown execution step: ${stepId}`);
  }

  if (isAssistantV4BlockedAction(step.actionId) || isVideoRenderAction(step.actionId)) {
    return failStep(plan, step, `Action not allowed in assistant V4: ${step.actionId}`, {
      retryable: false,
      skipAllowed: false,
    });
  }

  if (!confirmed && step.executionMode !== "auto_safe") {
    const waiting: AssistantExecutionStep = {
      ...step,
      status: "waiting_for_confirmation",
    };
    return {
      planId: plan.id,
      stepId: step.id,
      status: "waiting_for_confirmation",
      step: waiting,
      plan: { ...plan, status: "waiting_for_confirmation" },
      requiresUserReview: true,
      providerCalls: 0,
      creditsConsumed: 0,
    };
  }

  const running: AssistantExecutionStep = { ...step, status: "running", startedAt: nowIso() };

  if (step.actionId === "use_existing_asset") {
    const assetId = step.input.assetId ?? step.input.characterAssetId;
    const library = assetId ? input.libraryAssetNames?.[assetId] : undefined;
    const assetName = library?.assetName ?? "Character";
    const assetUrl = library?.assetUrl ?? step.input.characterAssetUrl ?? "";
    if (!assetId || !assetUrl) {
      return failStep(plan, running, "Existing asset could not be resolved.");
    }
    const prepared = preparedFromExisting(step, assetId, assetName, assetUrl, step.input.projectId);
    return completeStep(plan, running, {
      assetId,
      url: assetUrl,
      assetName,
      projectId: step.input.projectId,
      sourceActionId: "use_existing",
      preparedAsset: prepared,
    });
  }

  if (step.actionId === "use_preset_default") {
    const preset = step.input.presetId ? getMotionActionPreset(step.input.presetId) : null;
    const assetName = step.requirementId
      ? getActionPresetRequirement(step.requirementId).label
      : "Preset default";
    const prepared: AssistantPreparedAssetLink = {
      requirementId: step.requirementId ?? "background",
      assetId: `preset-default:${step.requirementId ?? step.id}`,
      url: "",
      assetName,
      projectId: step.input.projectId ?? null,
      sourceActionId: "use_preset_default",
    };
    return completeStep(plan, running, {
      assetName,
      sourceActionId: "use_preset_default",
      preparedAsset: prepared,
      fusionBootstrap: {
        scenePrompt: preset?.sceneSettings.backgroundPrompt ?? step.input.scenePrompt,
        requirementId: step.requirementId,
      },
    });
  }

  if (step.actionId === "open_motion_wizard") {
    const route = buildAssistantActionRoute("create_motion_video", {
      projectId: step.input.projectId ?? undefined,
    });
    return completeStep(plan, running, {
      handoffRoute: route,
      handoffPrefillId: step.input.prefillId,
      sourceActionId: "use_existing",
    });
  }

  if (step.actionId === "prepare_motion_character") {
    const route = buildCharacterClusterHref("motion-ready");
    return completeStep(
      plan,
      running,
      {
        handoffRoute: route,
        handoffPrefillId: step.input.prefillId,
        manualRoute: route,
        fusionBootstrap: {
          characterAssetId: step.input.characterAssetId,
          projectId: step.input.projectId,
        },
      },
      "requires_user_review"
    );
  }

  if (
    isAssistantV4ExecutableAction(step.actionId) &&
    (step.actionId === "prepare_outfit" ||
      step.actionId === "prepare_background" ||
      step.actionId === "prepare_location" ||
      step.actionId === "prepare_prop" ||
      step.actionId === "prepare_vehicle")
  ) {
    const route = buildAssistantActionRoute("create_fusion", {
      projectId: step.input.projectId ?? undefined,
    });
    return completeStep(
      plan,
      running,
      {
        handoffRoute: route,
        handoffPrefillId: step.input.prefillId,
        manualRoute: route,
        fusionBootstrap: buildFusionBootstrap(step),
      },
      "requires_user_review"
    );
  }

  if (step.actionId === "prepare_music" || step.actionId === "prepare_sfx") {
    const preset = step.input.presetId ? getMotionActionPreset(step.input.presetId) : null;
    const assetName = step.actionId === "prepare_music" ? "Music suggestion" : "SFX suggestion";
    return completeStep(plan, running, {
      assetName,
      sourceActionId: step.actionId,
      preparedAsset: {
        requirementId: step.requirementId ?? (step.actionId === "prepare_music" ? "music" : "sfx"),
        assetId: `assistant-suggest:${step.id}`,
        url: "",
        assetName,
        projectId: step.input.projectId ?? null,
        sourceActionId: step.actionId,
      },
      fusionBootstrap: {
        musicMood: preset?.audioSuggestions.musicMood,
        sfxSuggestions: preset?.sfxSuggestions,
      },
    });
  }

  return failStep(plan, running, `Unsupported execution action: ${step.actionId}`);
}

export function executeAssistantPlanSequential(
  plan: AssistantExecutionPlan,
  options: {
    confirmed: boolean;
    libraryAssetNames?: ExecuteAssistantPlanStepInput["libraryAssetNames"];
    stopOnReview?: boolean;
  }
): { plan: AssistantExecutionPlan; results: AssistantExecutionResult[] } {
  const results: AssistantExecutionResult[] = [];
  let currentPlan: AssistantExecutionPlan = {
    ...plan,
    status: "running",
    startedAt: nowIso(),
  };

  for (const step of currentPlan.steps) {
    if (step.status === "completed" || step.status === "skipped") {
      continue;
    }
    const result = executeAssistantPlanStep({
      plan: currentPlan,
      stepId: step.id,
      confirmed: options.confirmed,
      libraryAssetNames: options.libraryAssetNames,
    });
    results.push(result);
    currentPlan = {
      ...currentPlan,
      steps: currentPlan.steps.map((row) => (row.id === result.stepId ? result.step : row)),
      status:
        result.status === "failed"
          ? "failed"
          : result.status === "requires_user_review"
            ? "requires_user_review"
            : currentPlan.status,
    };
    if (result.status === "failed") {
      break;
    }
    if (options.stopOnReview && result.status === "requires_user_review") {
      break;
    }
  }

  const complete = currentPlan.steps.every(
    (row) =>
      row.status === "completed" ||
      row.status === "skipped" ||
      row.status === "requires_user_review"
  );
  if (complete && currentPlan.status !== "failed") {
    currentPlan = { ...currentPlan, status: "completed", completedAt: nowIso() };
  }

  return { plan: currentPlan, results };
}
