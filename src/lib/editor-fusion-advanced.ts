import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function isAdvancedFusionComposeParam(searchParams?: {
  advanced?: string | null;
  get?: (key: string) => string | null;
}): boolean {
  if (!searchParams) {
    return false;
  }
  if (typeof searchParams.get === "function") {
    return searchParams.get("advanced") === "1";
  }
  return searchParams.advanced === "1";
}

/** Legacy dual-composer workspace — only for explicit advanced fusion. */
export function shouldShowLegacyComposeWorkspace(
  document: EditorCanvasDocument,
  advancedParam = false
): boolean {
  if (document.instructionStudioState?.advancedFusionCompose) {
    return true;
  }
  if (advancedParam) {
    return true;
  }
  if (document.editorFlowMode === "combine") {
    return false;
  }
  return document.workspaceMode === "compose";
}

export function shouldOfferAdvancedFusionCompose(document: EditorCanvasDocument): boolean {
  return document.editorFlowMode === "combine" && document.workspaceMode === "instruction_studio";
}

export function enableAdvancedFusionCompose(document: EditorCanvasDocument): EditorCanvasDocument {
  return {
    ...document,
    workspaceMode: "compose",
    instructionStudioState: {
      ...document.instructionStudioState,
      advancedFusionCompose: true,
      workflow: {
        intent: "combine",
        activeStage: document.instructionStudioState?.workflow?.activeStage ?? "generate",
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildAdvancedFusionComposeHref(sessionId: string): string {
  const params = new URLSearchParams({ session: sessionId, advanced: "1" });
  return `/editor?${params.toString()}`;
}
