import type { EditorCanvasDocument, EditorWorkspaceMode } from "@/types/homecheff-visual-editor";

/** Active workspace tab is the source of truth for panel visibility. */
export function modeShowsInstructionStudio(mode: EditorWorkspaceMode): boolean {
  return mode === "instruction_studio";
}

export function modeShowsComposePanels(mode: EditorWorkspaceMode): boolean {
  return mode === "compose";
}

export function modeShowsQuickMotionPanel(mode: EditorWorkspaceMode): boolean {
  return mode === "quick_motion";
}

/** @deprecated Use modeShowsQuickMotionPanel — GIF tools live on the quick_motion tab. */
export function modeShowsGifExportPanel(mode: EditorWorkspaceMode): boolean {
  return modeShowsQuickMotionPanel(mode);
}

export function modeShowsExportHub(mode: EditorWorkspaceMode): boolean {
  return mode === "export";
}

export function modeShowsExportAdvancedPanels(mode: EditorWorkspaceMode): boolean {
  return mode === "export";
}

/** Extra panels when user chose Motion voorbereiden at open (any tab). */
export function modeShowsMotionPreparePanels(document: EditorCanvasDocument): boolean {
  return document.editorFlowMode === "motion_prepare";
}

export function modeShowsPhotoEditObjectPanels(mode: EditorWorkspaceMode): boolean {
  return mode === "photo_edit";
}

export function modeShowsLiveCanvasSelection(mode: EditorWorkspaceMode): boolean {
  return mode === "photo_edit" || mode === "compose";
}

export function modeShowsLibraryPanels(mode: EditorWorkspaceMode): boolean {
  return modeShowsComposePanels(mode);
}

export function modeShowsBrandKit(mode: EditorWorkspaceMode): boolean {
  return modeShowsComposePanels(mode);
}

export function modeShowsMotionPreviewBar(
  mode: EditorWorkspaceMode,
  document?: EditorCanvasDocument
): boolean {
  if (document?.editorFlowMode === "motion_prepare") {
    return true;
  }
  return mode === "quick_motion";
}

export function modeShowsAlignmentTools(mode: EditorWorkspaceMode): boolean {
  return modeShowsExportAdvancedPanels(mode);
}

export function workspaceModeForNoSelectionAction(
  action: "edit_photo" | "add_object" | "background" | "gif" | "export"
): EditorWorkspaceMode | null {
  switch (action) {
    case "edit_photo":
      return "photo_edit";
    case "add_object":
      return "compose";
    case "background":
      return "photo_edit";
    case "gif":
      return "quick_motion";
    case "export":
      return "export";
    default:
      return null;
  }
}
