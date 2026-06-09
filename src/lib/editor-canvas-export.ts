import { buildCompositionGraphFromDraft } from "@/lib/studio-asset-composition-graph";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";

export type EditorSavePayload = {
  sessionId: string;
  name: string;
  backgroundUrl: string;
  backgroundStorageKey?: string;
  sourceAssetId: string | null;
  semanticRecordPatch: Partial<AssetSemanticRecord>;
  compositionSummary: string;
  objectCount: number;
  downloadableHint: string;
};

export function buildEditorSavePayload(document: EditorCanvasDocument): EditorSavePayload {
  const editableLayers = document.objects.filter((o) => o.layerType !== "background" && o.visible);
  const compositionSummary = editableLayers.map((l) => `${l.label} @ ${Math.round(l.transform.x * 100)}%,${Math.round(l.transform.y * 100)}%`).join("; ");

  return {
    sessionId: document.sessionId,
    name: document.name,
    backgroundUrl: document.backgroundUrl,
    backgroundStorageKey: document.backgroundStorageKey,
    sourceAssetId: document.sourceAssetId,
    semanticRecordPatch: {
      version: 1,
      continuityNotes: `Editor canvas session ${document.sessionId}`,
      changeRules: editableLayers.map((l) => l.label),
    },
    compositionSummary,
    objectCount: editableLayers.length,
    downloadableHint: document.backgroundUrl,
  };
}

/** Placeholder for composition graph linkage when placements exist on document */
export function buildEditorCompositionPromptBlock(document: EditorCanvasDocument): string {
  if (document.placements.length === 0) {
    return "";
  }
  const draftLike = {
    referencePlacements: document.placements,
    name: document.name,
    sourceReferenceName: document.name,
  } as unknown as Parameters<typeof buildCompositionGraphFromDraft>[0];
  const graph = buildCompositionGraphFromDraft(draftLike);
  return graph.length ? `Composition nodes: ${graph.map((n) => n.label).join(" → ")}` : "";
}
