import { updateImportedLayer } from "@/lib/editor-imported-layers";
import type { EditorCanvasDocument, EditorCanvasTransform, EditorImportedLayer } from "@/types/homecheff-visual-editor";

export type CompositingOperation =
  | "move"
  | "scale"
  | "rotate"
  | "duplicate"
  | "delete"
  | "flip_h"
  | "flip_v"
  | "opacity"
  | "shadow"
  | "soft_edge"
  | "match_lighting"
  | "match_color"
  | "bring_front"
  | "send_back";

export function applyCompositingOperation(
  document: EditorCanvasDocument,
  layerId: string,
  operation: CompositingOperation,
  value?: number | Partial<EditorCanvasTransform>
): EditorCanvasDocument {
  const layer = document.importedLayers?.find((l) => l.id === layerId);
  if (!layer) {
    return document;
  }

  switch (operation) {
    case "move":
    case "scale":
    case "rotate":
      return updateImportedLayer(document, layerId, {
        transform: { ...layer.transform, ...(value as Partial<EditorCanvasTransform>) },
      });
    case "duplicate": {
      const copy: EditorImportedLayer = {
        ...layer,
        id: `${layer.id}_copy_${Date.now()}`,
        label: `${layer.label} Copy`,
        transform: {
          ...layer.transform,
          x: Math.min(0.95, layer.transform.x + 0.04),
          y: Math.min(0.95, layer.transform.y + 0.04),
        },
        zIndex: (document.importedLayers?.length ?? 0) + 10,
        createdAt: new Date().toISOString(),
      };
      return {
        ...document,
        importedLayers: [...(document.importedLayers ?? []), copy],
        updatedAt: new Date().toISOString(),
      };
    }
    case "delete":
      return {
        ...document,
        importedLayers: (document.importedLayers ?? []).filter((l) => l.id !== layerId),
        updatedAt: new Date().toISOString(),
      };
    case "flip_h":
      return updateImportedLayer(document, layerId, { flippedX: !layer.flippedX });
    case "flip_v":
      return updateImportedLayer(document, layerId, { flippedY: !layer.flippedY });
    case "opacity":
      return updateImportedLayer(document, layerId, { opacity: typeof value === "number" ? value : layer.opacity });
    case "shadow":
      return updateImportedLayer(document, layerId, { shadow: !layer.shadow });
    case "soft_edge":
      return updateImportedLayer(document, layerId, {
        softEdge: typeof value === "number" ? value : Math.min(1, layer.softEdge + 0.1),
      });
    case "match_lighting":
      return updateImportedLayer(document, layerId, { matchLighting: !layer.matchLighting });
    case "match_color":
      return updateImportedLayer(document, layerId, { matchColor: !layer.matchColor });
    case "bring_front": {
      const maxZ = Math.max(...(document.importedLayers ?? []).map((l) => l.zIndex), 0);
      return updateImportedLayer(document, layerId, { zIndex: maxZ + 1 });
    }
    case "send_back": {
      const minZ = Math.min(...(document.importedLayers ?? []).map((l) => l.zIndex), 10);
      return updateImportedLayer(document, layerId, { zIndex: minZ - 1 });
    }
    default:
      return document;
  }
}

export const HUMAN_COMPOSITING_LABELS: Record<CompositingOperation, string> = {
  move: "Move",
  scale: "Resize",
  rotate: "Rotate",
  duplicate: "Duplicate",
  delete: "Remove",
  flip_h: "Flip horizontal",
  flip_v: "Flip vertical",
  opacity: "Opacity",
  shadow: "Shadow",
  soft_edge: "Soft edge",
  match_lighting: "Match lighting",
  match_color: "Match color",
  bring_front: "Bring to front",
  send_back: "Send to back",
};
