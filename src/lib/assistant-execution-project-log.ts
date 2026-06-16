import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  AssistantExecutionLogEntry,
  AssistantExecutionPlan,
  AssistantExecutionProjectMetadata,
  AssistantExecutionResult,
  AssistantExecutionStep,
  AssistantPreparedAssetLink,
} from "@/types/assistant-tool-execution";

export const ASSISTANT_EXECUTION_METADATA_KEY = "assistantExecution";

export function readAssistantExecutionProjectMetadata(
  project: HomeCheffProjectPackage
): AssistantExecutionProjectMetadata | null {
  const raw = project.metadata[ASSISTANT_EXECUTION_METADATA_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as AssistantExecutionProjectMetadata;
}

export function appendAssistantExecutionLogEntry(
  project: HomeCheffProjectPackage,
  plan: AssistantExecutionPlan,
  entry: AssistantExecutionLogEntry
): HomeCheffProjectPackage {
  const existing = readAssistantExecutionProjectMetadata(project);
  const now = new Date().toISOString();
  const plans = existing?.plans ?? [];
  const planIndex = plans.findIndex((row) => row.planId === plan.id);
  const planRow = {
    planId: plan.id,
    presetId: plan.presetId,
    status: plan.status,
    confirmedAt: plan.confirmedAt,
    completedAt: plan.completedAt,
    entries: planIndex >= 0 ? [...plans[planIndex]!.entries] : [],
  };
  planRow.entries.push(entry);
  const nextPlans =
    planIndex >= 0
      ? plans.map((row, index) => (index === planIndex ? planRow : row))
      : [...plans, planRow];

  return {
    ...project,
    updatedAt: now,
    metadata: {
      ...project.metadata,
      [ASSISTANT_EXECUTION_METADATA_KEY]: {
        version: 1,
        updatedAt: now,
        plans: nextPlans,
      } satisfies AssistantExecutionProjectMetadata,
    },
    handoffHistory: [
      ...project.handoffHistory,
      {
        id: `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sourceService: project.projectType ?? "motion",
        targetService: "motion",
        handoffType: `assistant_execution_${entry.actionId}`,
        payload: {
          planId: entry.planId,
          stepId: entry.stepId,
          status: entry.status,
          outputAssetId: entry.outputAssetId ?? null,
          error: entry.error ?? null,
        },
        createdAt: now,
      },
    ],
  };
}

export function buildExecutionLogEntry(
  plan: AssistantExecutionPlan,
  step: AssistantExecutionStep,
  status: AssistantExecutionLogEntry["status"]
): AssistantExecutionLogEntry {
  return {
    planId: plan.id,
    stepId: step.id,
    actionId: step.actionId,
    status,
    startedAt: step.startedAt ?? step.createdAt,
    completedAt: step.completedAt,
    outputAssetId: step.output?.assetId ?? step.output?.preparedAsset?.assetId,
    error: step.error,
  };
}

export function collectPreparedAssetsFromPlan(
  plan: AssistantExecutionPlan
): AssistantPreparedAssetLink[] {
  const assets: AssistantPreparedAssetLink[] = [];
  for (const step of plan.steps) {
    if (step.output?.preparedAsset) {
      assets.push(step.output.preparedAsset);
    }
  }
  return assets;
}

export function isExecutionPlanComplete(plan: AssistantExecutionPlan): boolean {
  const actionable = plan.steps.filter((step) => step.actionId !== "open_motion_wizard");
  if (actionable.length === 0) {
    return true;
  }
  return actionable.every(
    (step) =>
      step.status === "completed" ||
      step.status === "skipped" ||
      step.status === "requires_user_review"
  );
}

export function applyExecutionResultToPlan(
  plan: AssistantExecutionPlan,
  result: AssistantExecutionResult
): AssistantExecutionPlan {
  const steps = plan.steps.map((step) => (step.id === result.stepId ? result.step : step));
  const allDone = steps.every(
    (step) =>
      step.status === "completed" ||
      step.status === "skipped" ||
      step.status === "requires_user_review" ||
      (step.actionId === "open_motion_wizard" && step.status === "planned")
  );
  const openWizard = steps.find((step) => step.actionId === "open_motion_wizard");
  const wizardReady =
    isExecutionPlanComplete({ ...plan, steps }) &&
    openWizard &&
    (openWizard.status === "planned" || openWizard.status === "completed");

  return {
    ...plan,
    steps,
    status: wizardReady ? "completed" : result.plan.status,
    completedAt: wizardReady ? new Date().toISOString() : plan.completedAt,
    creditsConsumed: 0,
    providerCalls: 0,
  };
}
