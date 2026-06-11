import type { EditorCanvasDocument, EditorWorkspaceMode } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionObjectId,
  EditorInstructionSelection,
  EditorInstructionSliders,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

/** Default product mode after pivot — instruction-first, not live pixel editing. */
export const DEFAULT_EDITOR_WORKSPACE_MODE: EditorWorkspaceMode = "instruction_studio";

export function resolveEditorWorkspaceMode(
  document: Pick<EditorCanvasDocument, "workspaceMode">
): EditorWorkspaceMode {
  return document.workspaceMode ?? DEFAULT_EDITOR_WORKSPACE_MODE;
}

export function isInstructionStudioMode(mode: EditorWorkspaceMode): boolean {
  return mode === "instruction_studio";
}

export function isLegacyCanvasEditorDocument(document: EditorCanvasDocument): boolean {
  if (document.workspaceMode && document.workspaceMode !== "instruction_studio") {
    return true;
  }
  if ((document.placements?.length ?? 0) > 0) {
    return true;
  }
  if ((document.importedLayers?.length ?? 0) > 0) {
    return true;
  }
  if (document.composerState?.active) {
    return true;
  }
  const nonBg = document.objects.filter((o) => o.layerType !== "background");
  const hasPreciseMask = nonBg.some(
    (o) => (o.selectionShape?.polygon?.length ?? 0) >= 4 || Boolean(o.selectionShape?.maskUrl)
  );
  if (hasPreciseMask && nonBg.length > 1) {
    return true;
  }
  return false;
}

export function instructionStudioShowsLiveSelectionTools(mode: EditorWorkspaceMode): boolean {
  return !isInstructionStudioMode(mode);
}

export function defaultInstructionSelection(
  objectId: EditorInstructionObjectId = "object",
  objectLabel = "object"
): EditorInstructionSelection {
  return {
    objectId,
    objectLabel,
    action: "replace",
    sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
    preserveCharacter: true,
  };
}

export function mergeInstructionSelection(
  current: Partial<EditorInstructionSelection> | undefined,
  patch: Partial<EditorInstructionSelection>
): EditorInstructionSelection {
  const base = defaultInstructionSelection();
  return {
    ...base,
    ...current,
    ...patch,
    sliders: {
      ...base.sliders,
      ...current?.sliders,
      ...patch.sliders,
    } as EditorInstructionSliders,
  };
}
