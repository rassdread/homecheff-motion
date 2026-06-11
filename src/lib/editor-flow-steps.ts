import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const EDITOR_FLOW_STEP_IDS = [
  "workflow",
  "references",
  "output",
  "plan",
  "generate",
  "results",
] as const;

export type EditorFlowStepId = (typeof EDITOR_FLOW_STEP_IDS)[number];

export type EditorFlowStepState = "complete" | "active" | "upcoming" | "blocked";

export type EditorFlowStepDefinition = {
  id: EditorFlowStepId;
  labelKey: string;
  shortLabelKey: string;
};

export const EDITOR_FLOW_STEPS: EditorFlowStepDefinition[] = [
  { id: "workflow", labelKey: "editor.flow.step.workflow", shortLabelKey: "editor.flow.step.workflowShort" },
  { id: "references", labelKey: "editor.flow.step.references", shortLabelKey: "editor.flow.step.referencesShort" },
  { id: "output", labelKey: "editor.flow.step.output", shortLabelKey: "editor.flow.step.outputShort" },
  { id: "plan", labelKey: "editor.flow.step.plan", shortLabelKey: "editor.flow.step.planShort" },
  { id: "generate", labelKey: "editor.flow.step.generate", shortLabelKey: "editor.flow.step.generateShort" },
  { id: "results", labelKey: "editor.flow.step.results", shortLabelKey: "editor.flow.step.resultsShort" },
];

export function resolveEditorFlowStepStates(input: {
  activeStep: EditorFlowStepId;
  hasReferences?: boolean;
  hasResults?: boolean;
}): Record<EditorFlowStepId, EditorFlowStepState> {
  const activeIndex = EDITOR_FLOW_STEP_IDS.indexOf(input.activeStep);
  const states = {} as Record<EditorFlowStepId, EditorFlowStepState>;

  for (let i = 0; i < EDITOR_FLOW_STEP_IDS.length; i++) {
    const stepId = EDITOR_FLOW_STEP_IDS[i]!;
    if (i < activeIndex) {
      states[stepId] = "complete";
    } else if (i === activeIndex) {
      states[stepId] = "active";
    } else if (stepId === "references" && !input.hasReferences && i > activeIndex) {
      states[stepId] = activeIndex >= EDITOR_FLOW_STEP_IDS.indexOf("references") ? "upcoming" : "blocked";
    } else if (stepId === "results" && !input.hasResults) {
      states[stepId] = "blocked";
    } else {
      states[stepId] = "upcoming";
    }
  }

  return states;
}

export function startScreenPhaseToFlowStep(phase: {
  kind: "workflow" | "combine_intent" | "reference_flow";
  referenceStep?: "reference_roles" | "output_type" | "motion_upsell" | "plan_review";
}): EditorFlowStepId {
  if (phase.kind === "workflow" || phase.kind === "combine_intent") {
    return "workflow";
  }
  switch (phase.referenceStep) {
    case "output_type":
    case "motion_upsell":
      return "output";
    case "plan_review":
      return "plan";
    default:
      return "references";
  }
}

export function workflowCategoryKey(input: {
  workflow: EditorPostUploadMode;
  intent?: EditorFusionIntent;
}): string {
  if (input.intent) {
    return `editor.flow.category.${input.intent}`;
  }
  return `editor.flow.category.${input.workflow}`;
}
