import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const EDITOR_PROJECT_STORAGE_KEY = "hc-editor-canvas-sessions-v1";

export function editorProjectHasUnsavedVisualChanges(document: EditorCanvasDocument): boolean {
  return (
    document.status !== "draft_saved" ||
    Boolean(document.importedLayers?.length) ||
    Boolean(document.placements.length) ||
    Boolean(document.cutoutAssets?.length)
  );
}

export function confirmLeaveEditorProject(message: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.confirm(message);
}
