import { getCompositionPlan } from "@/lib/editor-composition-plan";
import { listChangePlan } from "@/lib/editor-instruction-change-plan";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const EDITOR_PROJECT_STORAGE_KEY = "hc-editor-canvas-sessions-v1";

export function editorProjectHasUnsavedVisualChanges(document: EditorCanvasDocument): boolean {
  const hasInstructionDrafts = (document.instructionVariants ?? []).some(
    (v) => v.approvalStatus === "draft" && v.status === "completed"
  );
  const hasPendingPlan =
    listChangePlan(document).length > 0 ||
    (getCompositionPlan(document)?.items.length ?? 0) > 0;
  return (
    document.status !== "draft_saved" ||
    Boolean(document.importedLayers?.length) ||
    Boolean(document.placements.length) ||
    Boolean(document.cutoutAssets?.length) ||
    hasInstructionDrafts ||
    hasPendingPlan
  );
}

export type EditorProjectCloseChoice = "save" | "discard" | "cancel";

export function resolveEditorProjectCloseChoice(
  hasUnsaved: boolean,
  choice: EditorProjectCloseChoice
): "proceed" | "cancel" {
  if (!hasUnsaved) {
    return "proceed";
  }
  if (choice === "cancel") {
    return "cancel";
  }
  return "proceed";
}

export function confirmLeaveEditorProject(message: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.confirm(message);
}
