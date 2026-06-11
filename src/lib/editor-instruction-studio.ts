import {
  defaultActionForCategory,
} from "@/lib/editor-instruction-actions";
import {
  defaultSelectionForObject,
  findInstructionObjectV2,
  listInstructionObjectsV2,
} from "@/lib/editor-instruction-object-v2";
import type { EditorCanvasDocument, EditorWorkspaceMode } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionSelection,
  EditorInstructionSliders,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

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
  document?: EditorCanvasDocument
): EditorInstructionSelection {
  const objects = document ? listInstructionObjectsV2(document) : [];
  const first = objects[0];
  if (first) {
    return {
      ...defaultSelectionForObject(first),
      sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      preserveCharacter: true,
      action: first.suggestedActions[0] ?? defaultActionForCategory(first.category),
    };
  }
  return {
    objectKey: "obj_main",
    objectLabel: "Main subject",
    category: "other" as EditorInstructionObjectCategory,
    action: defaultActionForCategory("other"),
    sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
    preserveCharacter: true,
  };
}

export function mergeInstructionSelection(
  document: EditorCanvasDocument,
  current: Partial<EditorInstructionSelection> | undefined,
  patch: Partial<EditorInstructionSelection>
): EditorInstructionSelection {
  const base = defaultInstructionSelection(document);
  const merged = {
    ...base,
    ...current,
    ...patch,
    sliders: {
      ...base.sliders,
      ...current?.sliders,
      ...patch.sliders,
    } as EditorInstructionSliders,
  };

  if (patch.objectKey && document) {
    const obj = findInstructionObjectV2(document, patch.objectKey);
    if (obj) {
      merged.objectLabel = obj.label;
      merged.category = obj.category;
      if (!patch.action) {
        merged.action = obj.suggestedActions[0] ?? defaultActionForCategory(obj.category);
      }
    }
  }

  return merged;
}
