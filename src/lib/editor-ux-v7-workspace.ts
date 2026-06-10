import type { EditorCanvasDocument, EditorWorkspaceMode } from "@/types/homecheff-visual-editor";

function flowMode(document: EditorCanvasDocument): EditorCanvasDocument["editorFlowMode"] {
  return document.editorFlowMode ?? "edit";
}

export function modeShowsComposePanels(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  if (document && flowMode(document) !== "combine") {
    return false;
  }
  return mode === "compose";
}

export function modeShowsGifExportPanel(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return mode === "export" && document?.editorFlowMode === "export";
}

export function modeShowsExportHub(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return mode === "export" && (document?.editorFlowMode === "export" || !document?.editorFlowMode);
}

export function modeShowsExportAdvancedPanels(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return mode === "export" && (document?.editorFlowMode === "export" || !document?.editorFlowMode);
}

export function modeShowsMotionPreparePanels(document: EditorCanvasDocument): boolean {
  return document.editorFlowMode === "motion_prepare";
}

export function modeShowsPhotoEditObjectPanels(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  if (document?.editorFlowMode === "export" || document?.editorFlowMode === "combine") {
    return false;
  }
  return mode === "photo_edit" || mode === "compose";
}

export function modeShowsLibraryPanels(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return modeShowsComposePanels(mode, document);
}

export function modeShowsBrandKit(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return modeShowsComposePanels(mode, document);
}

export function modeShowsMotionPreviewBar(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  if (document && flowMode(document) === "motion_prepare") {
    return true;
  }
  return mode === "quick_motion";
}

export function modeShowsAlignmentTools(mode: EditorWorkspaceMode, document?: EditorCanvasDocument): boolean {
  return modeShowsExportAdvancedPanels(mode, document);
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
