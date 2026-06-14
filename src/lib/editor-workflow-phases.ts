import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import type { EditorImagePhase } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const EDITOR_MOTION_MENU_ITEMS = [
  "camera",
  "movement",
  "voice",
  "music",
  "sound_effects",
  "text",
  "subtitles",
  "render",
] as const;

export type EditorMotionMenuItem = (typeof EDITOR_MOTION_MENU_ITEMS)[number];

export function hasEditorImageAnalysis(document: EditorCanvasDocument): boolean {
  return (
    Boolean(document.detectedObjects?.length) ||
    Boolean(document.semanticLayers?.length) ||
    Boolean(document.assetProfile) ||
    Boolean(document.visionHierarchy?.length)
  );
}

export function isMotionWorkspaceUnlocked(document: EditorCanvasDocument): boolean {
  return Boolean(activeApprovedVariant(document));
}

export function resolveDefaultEditorImagePhase(document: EditorCanvasDocument): EditorImagePhase {
  if ((document.visionHierarchy?.length ?? 0) > 0) {
    return "parts";
  }
  if (hasEditorImageAnalysis(document)) {
    return "edit";
  }
  return "analyze";
}

export function resolveEditorImagePhase(document: EditorCanvasDocument): EditorImagePhase {
  const stored = document.instructionStudioState?.activeImagePhase;
  if (stored) {
    return stored;
  }
  return resolveDefaultEditorImagePhase(document);
}

export function patchEditorImagePhase(
  document: EditorCanvasDocument,
  phase: EditorImagePhase
): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      activeImagePhase: phase,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function editorPhaseShowsSection(
  phase: EditorImagePhase,
  section:
    | "analysis"
    | "parts"
    | "objectEdit"
    | "style"
    | "changePlan"
    | "variants"
    | "versions"
    | "approve"
): boolean {
  switch (phase) {
    case "analyze":
      return section === "analysis" || section === "parts";
    case "parts":
      return section === "parts";
    case "edit":
    case "director":
      return section === "parts" || section === "objectEdit" || section === "changePlan";
    case "style":
      return section === "style" || section === "objectEdit" || section === "changePlan";
    case "colors":
      return section === "style" || section === "objectEdit";
    case "variants":
      return section === "variants" || section === "changePlan";
    case "versions":
      return section === "versions" || section === "variants";
    case "approve":
      return section === "approve" || section === "versions";
    default:
      return true;
  }
}
