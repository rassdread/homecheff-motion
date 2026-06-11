import { ensureFusionPlan } from "@/lib/editor-fusion-plan";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument, EditorWorkspaceMode } from "@/types/homecheff-visual-editor";

export const EDITOR_POST_UPLOAD_MODES = ["edit", "combine", "motion_prepare", "export"] as const;

export type EditorPostUploadMode = (typeof EDITOR_POST_UPLOAD_MODES)[number];

export const EDITOR_POST_UPLOAD_LABEL_KEYS: Record<EditorPostUploadMode, string> = {
  edit: "editor.startFlow.mode.edit",
  combine: "editor.startFlow.mode.combine",
  motion_prepare: "editor.startFlow.mode.motionPrepare",
  export: "editor.startFlow.mode.export",
};

export const EDITOR_POST_UPLOAD_HINT_KEYS: Record<EditorPostUploadMode, string> = {
  edit: "editor.startFlow.mode.editHint",
  combine: "editor.startFlow.mode.combineHint",
  motion_prepare: "editor.startFlow.mode.motionPrepareHint",
  export: "editor.startFlow.mode.exportHint",
};

export function workspaceModeForPostUpload(mode: EditorPostUploadMode): EditorWorkspaceMode {
  switch (mode) {
    case "combine":
      return "compose";
    case "export":
      return "export";
    case "motion_prepare":
      return "instruction_studio";
    case "edit":
    default:
      return "instruction_studio";
  }
}

export function applyPostUploadMode(
  document: EditorCanvasDocument,
  mode: EditorPostUploadMode,
  options?: { combineIntent?: EditorFusionIntent }
): EditorCanvasDocument {
  const workspaceMode = workspaceModeForPostUpload(mode);
  let next: EditorCanvasDocument = {
    ...document,
    editorFlowMode: mode,
    workspaceMode,
    updatedAt: new Date().toISOString(),
  };
  if (options?.combineIntent) {
    next = {
      ...next,
      instructionStudioState: {
        ...next.instructionStudioState,
        combineIntent: options.combineIntent,
      },
    };
    if (mode === "combine") {
      next = ensureFusionPlan(next, options.combineIntent);
    }
  }
  if (mode === "export") {
    next = {
      ...next,
      exportSettings: { ...next.exportSettings, profile: "production_ready" },
    };
  }
  if (mode === "motion_prepare") {
    next = {
      ...next,
      exportSettings: { ...next.exportSettings, profile: "motion_ready" },
    };
  }
  return next;
}

export function startScreenPrimaryOptions(): Array<"workflow" | "upload" | "library"> {
  return ["workflow", "upload", "library"];
}

export function editorV3WorkflowChooserModes(): EditorPostUploadMode[] {
  return [...EDITOR_POST_UPLOAD_MODES];
}

export function isPreImageStartIntentHidden(intent: string): boolean {
  return ["make_gif", "export_print", "prepare_motion", "combine_images"].includes(intent);
}
