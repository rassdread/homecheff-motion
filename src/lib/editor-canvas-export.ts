import { buildEditorCompositionGraphFromDocument } from "@/lib/editor-composition-graph";
import { extractEditorSemanticLayers } from "@/lib/editor-canvas-layers";
import { editorPlacementToReferencePlacement } from "@/lib/editor-placement-canvas";
import type { EditorCanvasDocument, EditorSemanticLayer } from "@/types/homecheff-visual-editor";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { CompositionGraphNode } from "@/types/studio-asset-generation-workbench";

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
  semanticLayers: EditorSemanticLayer[];
  editorObjects: EditorCanvasDocument["objects"];
  compositionGraph: CompositionGraphNode[];
  layerOperations: EditorCanvasDocument["layerOperations"];
  referencePlacements: EditorCanvasDocument["placements"];
  placementCount: number;
};

export function buildEditorSavePayload(document: EditorCanvasDocument): EditorSavePayload {
  const editableLayers = document.objects.filter((o) => o.layerType !== "background" && o.visible);
  const semanticLayers = document.semanticLayers ?? extractEditorSemanticLayers(document.objects);
  const referencePlacements = document.placements.map((p) => editorPlacementToReferencePlacement(p as import("@/types/homecheff-visual-editor").EditorPlacementItem));
  const compositionGraph = buildEditorCompositionGraphFromDocument(document);

  const layerSummary = editableLayers
    .map(
      (l) =>
        `${l.label} (${l.category ?? "unknown"}) @ ${Math.round(l.transform.x * 100)}%,${Math.round(l.transform.y * 100)}%`
    )
    .join("; ");
  const placementSummary = document.placements
    .map((p) => `${p.sourceName} → ${p.targetLabel ?? "custom"}`)
    .join("; ");
  const compositionSummary = [layerSummary, placementSummary].filter(Boolean).join(" | ");

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
      keyFeatures: semanticLayers.filter((l) => l.type !== "background").map((l) => l.label),
      preserveRules: semanticLayers
        .filter((l) => l.metadata?.identityRelevance === "identity_marker")
        .map((l) => l.label),
      referencePlacements,
    },
    compositionSummary,
    objectCount: editableLayers.length,
    downloadableHint: document.backgroundUrl,
    semanticLayers,
    editorObjects: document.objects,
    compositionGraph,
    layerOperations: document.layerOperations ?? [],
    referencePlacements,
    placementCount: document.placements.length,
  };
}

/** Placeholder for composition graph linkage when placements exist on document */
export function buildEditorCompositionPromptBlock(document: EditorCanvasDocument): string {
  const payload = buildEditorSavePayload(document);
  if (payload.compositionGraph.length === 0) {
    return "";
  }
  return `Composition nodes: ${payload.compositionGraph.map((n) => n.label).join(" → ")}`;
}
