import { detectEditorCommandIntents, type EditorV7DetectedIntent } from "@/lib/editor-v7-intent";
import {
  humanLabelsForLayers,
  inferObjectRefFromPrompt,
  resolveLayerByObjectRef,
  resolveLayersToPreserve,
  type EditorV7ObjectRefKind,
} from "@/lib/editor-v7-object-references";
import { EDITOR_V7_SKILL_DEFINITIONS, matchEditorSkill } from "@/lib/editor-v7-skills";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type {
  EditorCanvasDocument,
  EditorV7CommandPlan,
  EditorV7CommandPlanStep,
} from "@/types/homecheff-visual-editor";

function stepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function planId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function refFromIntent(intent: EditorV7DetectedIntent, prompt: string): EditorV7ObjectRefKind | null {
  if (intent.objectRef) {
    const ref = intent.objectRef as EditorV7ObjectRefKind;
    if (ref === "background" || ref === "globe" || ref === "logo" || ref === "jacket") {
      return ref;
    }
  }
  return inferObjectRefFromPrompt(intent.params?.target ?? prompt);
}

function buildStepFromIntent(
  document: EditorCanvasDocument,
  intent: EditorV7DetectedIntent,
  prompt: string
): EditorV7CommandPlanStep[] {
  const steps: EditorV7CommandPlanStep[] = [];
  const ref = refFromIntent(intent, prompt);
  const layer = ref ? resolveLayerByObjectRef(document, ref) : null;
  const preserve = humanLabelsForLayers(resolveLayersToPreserve(document, layer?.id));

  if (intent.actionType === "detect_object" && layer) {
    steps.push({
      id: stepId(),
      actionType: "detect_object",
      labelKey: "editor.v7.plan.objectDetected",
      objectLayerId: layer.id,
      objectLabel: layer.label,
      status: "pending",
    });
  }

  if (intent.actionType === "magic_replace") {
    if (layer) {
      steps.push({
        id: stepId(),
        actionType: "detect_object",
        labelKey: "editor.v7.plan.objectDetected",
        objectLayerId: layer.id,
        objectLabel: layer.label,
        status: "pending",
      });
    }
    steps.push({
      id: stepId(),
      actionType: "magic_replace",
      labelKey: intent.labelKey,
      objectLayerId: layer?.id,
      objectLabel: layer?.label,
      params: intent.params,
      preserveLabels: preserve,
      status: "pending",
    });
    for (const label of preserve) {
      steps.push({
        id: stepId(),
        actionType: "preserve_object",
        labelKey: "editor.v7.plan.preserveObject",
        objectLabel: label,
        status: "pending",
      });
    }
    return steps;
  }

  steps.push({
    id: stepId(),
    actionType: intent.actionType,
    labelKey: intent.labelKey,
    objectLayerId: layer?.id,
    objectLabel: layer?.label,
    params: intent.params,
    preserveLabels: preserve.length > 0 ? preserve : undefined,
    status: "pending",
  });

  return steps;
}

export function buildEditorCommandPlan(document: EditorCanvasDocument, prompt: string): EditorV7CommandPlan {
  const trimmed = prompt.trim();
  const skill = matchEditorSkill(trimmed);

  if (skill) {
    const steps: EditorV7CommandPlanStep[] = [];
    for (const intent of skill.intents) {
      steps.push(...buildStepFromIntent(document, intent, trimmed));
    }
    return {
      id: planId(),
      prompt: trimmed,
      skillId: skill.id,
      steps: dedupeSteps(steps),
      createdAt: new Date().toISOString(),
    };
  }

  const intents = detectEditorCommandIntents(trimmed);
  const steps: EditorV7CommandPlanStep[] = [];

  if (intents.length === 0) {
    const ref = inferObjectRefFromPrompt(trimmed);
    const layer = ref ? resolveLayerByObjectRef(document, ref) : null;
    steps.push({
      id: stepId(),
      actionType: "magic_replace",
      labelKey: "editor.v7.plan.applyPrompt",
      objectLayerId: layer?.id,
      objectLabel: layer?.label,
      params: { prompt: trimmed },
      status: "pending",
    });
  } else {
    for (const intent of intents) {
      steps.push(...buildStepFromIntent(document, intent, trimmed));
    }
  }

  return {
    id: planId(),
    prompt: trimmed,
    steps: dedupeSteps(steps),
    createdAt: new Date().toISOString(),
  };
}

function dedupeSteps(steps: EditorV7CommandPlanStep[]): EditorV7CommandPlanStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.actionType}:${step.objectLayerId ?? ""}:${step.labelKey}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function markPlanStepDone(plan: EditorV7CommandPlan, stepId: string): EditorV7CommandPlan {
  return {
    ...plan,
    steps: plan.steps.map((s) => (s.id === stepId ? { ...s, status: "done" as const } : s)),
  };
}

export function planSummaryObjectTypes(document: EditorCanvasDocument): string[] {
  const types = new Set<string>();
  for (const layer of document.objects) {
    if (layer.layerType === "background") {
      continue;
    }
    types.add(resolveHumanFirstObjectType(layer));
  }
  return [...types];
}

export function skillLabelKey(skillId: string): string {
  return EDITOR_V7_SKILL_DEFINITIONS.find((s) => s.id === skillId)?.labelKey ?? "editor.v7.skill.unknown";
}
