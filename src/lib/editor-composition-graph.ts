import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import type { CompositionGraphNode } from "@/types/studio-asset-generation-workbench";

function mapCategoryToGraphKind(
  layer: EditorCanvasLayer | undefined
): CompositionGraphNode["kind"] {
  if (!layer) {
    return "prop";
  }
  if (layer.category === "clothing" || layer.category === "accessory") {
    return "clothing";
  }
  if (layer.category === "product" || layer.category === "package" || layer.category === "label") {
    return "packaging";
  }
  if (layer.category === "background" || layer.category === "environment") {
    return "background";
  }
  if (layer.category === "character" || layer.category === "body" || layer.category === "face") {
    return "character";
  }
  return "prop";
}

export function buildEditorCompositionGraphFromDocument(
  document: EditorCanvasDocument
): CompositionGraphNode[] {
  if (document.placements.length === 0) {
    return [];
  }

  const root: CompositionGraphNode = {
    id: "editor-root",
    label: document.name,
    kind: "character",
    children: [],
  };

  const targetNodes = new Map<string, CompositionGraphNode>();

  for (const placement of document.placements) {
    const placementNode: CompositionGraphNode = {
      id: placement.id,
      label: placement.sourceName || placement.placementType,
      kind: "placement",
      children: [],
      placementId: placement.id,
    };

    const targetLayer = document.objects.find((o) => o.id === placement.linkedObjectId);
    const targetKey = targetLayer?.id ?? "custom";
    let targetNode = targetNodes.get(targetKey);
    if (!targetNode) {
      targetNode = {
        id: `target-${targetKey}`,
        label: placement.targetLabel || targetLayer?.label || "Custom area",
        kind: mapCategoryToGraphKind(targetLayer),
        children: [],
      };
      targetNodes.set(targetKey, targetNode);
      root.children.push(targetNode);
    }
    targetNode.children.push(placementNode);
  }

  return [root];
}

export function formatEditorCompositionGraphPreview(document: EditorCanvasDocument): string[] {
  const graph = buildEditorCompositionGraphFromDocument(document);
  const lines: string[] = [];
  const walk = (node: CompositionGraphNode, depth: number) => {
    lines.push(`${"  ".repeat(depth)}${node.label}`);
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };
  for (const node of graph) {
    walk(node, 0);
  }
  return lines;
}
