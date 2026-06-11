import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorInstructionHandoffMeta } from "@/types/editor-instruction-studio";

export function resolveEditorInstructionHandoff(
  document: EditorCanvasDocument
): EditorInstructionHandoffMeta {
  const approved = activeApprovedVariant(document);
  if (approved?.resultUrl) {
    return {
      variantId: approved.id,
      activeVariantUrl: approved.resultUrl,
      instructionUsed: approved.prompt,
      versionNote: approved.versionNote ?? approved.name,
      createdAt: approved.createdAt,
      usesOriginal: false,
    };
  }
  return {
    activeVariantUrl: document.backgroundUrl,
    usesOriginal: true,
  };
}

export function buildEditorHandoffQuery(document: EditorCanvasDocument): string {
  const handoff = resolveEditorInstructionHandoff(document);
  const params = new URLSearchParams({
    editorSession: document.sessionId,
  });
  if (handoff.variantId) {
    params.set("editorVariantId", handoff.variantId);
  }
  if (!handoff.usesOriginal) {
    params.set("editorActiveVariant", "1");
  }
  return params.toString();
}

export function editorHandoffStudioUrl(document: EditorCanvasDocument): string {
  return `/studio/storyboards/new?${buildEditorHandoffQuery(document)}`;
}

export function editorHandoffMotionUrl(document: EditorCanvasDocument): string {
  return `/animate/instant?${buildEditorHandoffQuery(document)}`;
}
