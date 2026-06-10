import type { EditorWorkspaceMode } from "@/types/homecheff-visual-editor";

export type EditorUserIntent =
  | "edit_photo"
  | "combine_images"
  | "make_gif"
  | "prepare_motion"
  | "export_print";

export const EDITOR_INTENT_TO_MODE: Record<EditorUserIntent, EditorWorkspaceMode> = {
  edit_photo: "photo_edit",
  combine_images: "compose",
  make_gif: "quick_motion",
  prepare_motion: "export",
  export_print: "export",
};

export const EDITOR_MODE_LABEL_KEYS: Record<EditorWorkspaceMode, string> = {
  photo_edit: "editor.v5.mode.photoEdit",
  compose: "editor.v5.mode.compose",
  quick_motion: "editor.v5.mode.quickMotion",
  export: "editor.v5.mode.export",
};

export function resolveWorkspaceModeFromIntent(intent: EditorUserIntent): EditorWorkspaceMode {
  return EDITOR_INTENT_TO_MODE[intent];
}

export function defaultExportProfileForMode(mode: EditorWorkspaceMode): "motion_ready" | "production_ready" | "print_ready" {
  switch (mode) {
    case "quick_motion":
    case "export":
      return "motion_ready";
    case "compose":
      return "production_ready";
    default:
      return "production_ready";
  }
}

export function modeShowsComposer(mode: EditorWorkspaceMode): boolean {
  return mode === "compose";
}

export function modeShowsQuickMotion(mode: EditorWorkspaceMode): boolean {
  return mode === "quick_motion";
}

/** @deprecated Use modeShowsExportHub from editor-ux-v7-workspace */
export function modeShowsExportPanel(mode: EditorWorkspaceMode): boolean {
  return mode === "export";
}
