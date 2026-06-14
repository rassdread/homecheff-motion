import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { getCompositionPlan } from "@/lib/editor-composition-plan";
import { listChangePlan } from "@/lib/editor-instruction-change-plan";
import { parseEditorInstructionRequest } from "@/lib/editor-instruction-request-parser";
import { isMotionWorkspaceUnlocked } from "@/lib/editor-workflow-phases";
import type {
  EditorWorkflowStage,
  EditorWorkflowStageStatus,
  EditorWorkspaceIntent,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type WorkflowStageView = {
  stage: EditorWorkflowStage;
  status: EditorWorkflowStageStatus;
  labelKey: string;
};

export type SmartNextStep = {
  id: string;
  labelKey: string;
  intent?: EditorWorkspaceIntent;
};

export function resolveWorkflowIntent(document: EditorCanvasDocument): EditorWorkspaceIntent {
  const stored = document.instructionStudioState?.workflow?.intent;
  if (stored) {
    return stored;
  }
  switch (document.editorFlowMode) {
    case "combine":
      return "combine";
    case "motion_prepare":
      return "edit";
    case "export":
      return "export";
    default:
      return "edit";
  }
}

export function detectEditorWorkflowIntent(
  document: EditorCanvasDocument,
  hint?: string
): EditorWorkspaceIntent {
  const text = [
    hint ?? "",
    document.instructionStudioState?.directorPrompt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/combine|reference image|from image \d|use the .+ from/.test(text)) {
    return "combine";
  }
  if (/motion|animation|video|commercial|animate/.test(text)) {
    return isMotionWorkspaceUnlocked(document) ? "motion" : "edit";
  }
  if (/print|flyer|poster|a3|a4|export|instagram|tiktok|social/.test(text)) {
    return "export";
  }
  if (getCompositionPlan(document)?.items.length) {
    return "combine";
  }
  if (listChangePlan(document).length > 0) {
    return "edit";
  }
  return resolveWorkflowIntent(document);
}

export function resolveWorkflowStages(document: EditorCanvasDocument): WorkflowStageView[] {
  const hasAnalysis =
    Boolean(document.detectedObjects?.length) ||
    Boolean(document.semanticLayers?.length) ||
    Boolean(document.assetProfile);
  const hasPlan =
    listChangePlan(document).length > 0 || (getCompositionPlan(document)?.items.length ?? 0) > 0;
  const hasVariant = (document.instructionVariants ?? []).some((v) => v.status === "completed");
  const approved = Boolean(activeApprovedVariant(document));
  const handoffReady = approved;

  const stages: EditorWorkflowStage[] = ["analyze", "plan", "generate", "approve", "deliver"];
  const labelKeys: Record<EditorWorkflowStage, string> = {
    analyze: "editor.workflow.stage.analyze",
    plan: "editor.workflow.stage.plan",
    generate: "editor.workflow.stage.generate",
    approve: "editor.workflow.stage.approve",
    deliver: "editor.workflow.stage.deliver",
  };

  const complete = {
    analyze: hasAnalysis,
    plan: hasPlan,
    generate: hasVariant,
    approve: approved,
    deliver: handoffReady,
  };

  let currentSet = false;
  return stages.map((stage) => {
    let status: EditorWorkflowStageStatus;
    if (complete[stage]) {
      status = "complete";
    } else if (!currentSet) {
      status = "current";
      currentSet = true;
    } else {
      status = stage === "deliver" && !approved ? "blocked" : "pending";
    }
    return { stage, status, labelKey: labelKeys[stage] };
  });
}

export function suggestSmartNextSteps(document: EditorCanvasDocument): SmartNextStep[] {
  const steps: SmartNextStep[] = [];
  const stages = resolveWorkflowStages(document);
  const approved = activeApprovedVariant(document);
  const changePlan = listChangePlan(document);
  const composition = getCompositionPlan(document);

  if (stages.find((s) => s.stage === "analyze")?.status !== "complete") {
    steps.push({ id: "analyze", labelKey: "editor.workflow.next.analyze" });
  }
  if (changePlan.length === 0 && resolveWorkflowIntent(document) === "edit") {
    steps.push({ id: "add_change", labelKey: "editor.workflow.next.addChange", intent: "edit" });
  }
  if ((composition?.references.length ?? 0) === 0 && resolveWorkflowIntent(document) === "combine") {
    steps.push({ id: "add_reference", labelKey: "editor.workflow.next.addReference", intent: "combine" });
  }
  if (changePlan.length > 0 || (composition?.items.length ?? 0) > 0) {
    steps.push({ id: "generate", labelKey: "editor.workflow.next.generateVariant" });
  }
  if (!approved && (document.instructionVariants ?? []).some((v) => v.status === "completed")) {
    steps.push({ id: "approve", labelKey: "editor.workflow.next.approveVariant" });
  }
  if (approved) {
    steps.push({ id: "export", labelKey: "editor.workflow.next.export", intent: "export" });
    steps.push({ id: "motion", labelKey: "editor.workflow.next.prepareMotion", intent: "motion" });
    steps.push({ id: "studio", labelKey: "editor.workflow.next.sendStudio" });
  }
  return steps.slice(0, 5);
}

export function patchWorkflowIntent(
  document: EditorCanvasDocument,
  intent: EditorWorkspaceIntent
): EditorCanvasDocument {
  const stages = resolveWorkflowStages(document);
  const activeStage = stages.find((s) => s.status === "current")?.stage ?? "analyze";
  return {
    ...document,
    editorFlowMode:
      intent === "combine"
        ? "combine"
        : intent === "motion"
          ? "motion_prepare"
          : intent === "export"
            ? "export"
            : "edit",
    instructionStudioState: {
      ...document.instructionStudioState,
      workflow: { intent, activeStage },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function inferIntentFromDirectorPrompt(
  prompt: string,
  document?: EditorCanvasDocument
): EditorWorkspaceIntent {
  const parsed = parseEditorInstructionRequest(prompt);
  if (parsed.outputTarget === "print") {
    return "export";
  }
  if (parsed.outputTarget === "motion") {
    return document && isMotionWorkspaceUnlocked(document) ? "motion" : "edit";
  }
  if (/reference|combine|from image/.test(prompt.toLowerCase())) {
    return "combine";
  }
  return "edit";
}
