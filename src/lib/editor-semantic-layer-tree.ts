import { buildEditorLayerTreeNodes, type EditorLayerTreeNode } from "@/lib/editor-layer-tree-build";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorSemanticLayerTree = {
  rootLabel: string;
  nodes: EditorLayerTreeNode[];
};

/** Human-first semantic tree: Image → Background / Mascot / Logo / … */
export function buildEditorSemanticLayerTree(layers: EditorCanvasLayer[]): EditorSemanticLayerTree {
  const background = layers.find((l) => l.layerType === "background");
  const nodes = buildEditorLayerTreeNodes(layers);
  return {
    rootLabel: "Image",
    nodes: background
      ? [{ layer: background, children: nodes }]
      : nodes,
  };
}

export function reorderEditorLayers(
  layers: EditorCanvasLayer[],
  layerId: string,
  direction: "up" | "down"
): EditorCanvasLayer[] {
  const semantic = layers.filter((l) => l.layerType !== "background");
  const background = layers.filter((l) => l.layerType === "background");
  const index = semantic.findIndex((l) => l.id === layerId);
  if (index < 0) {
    return layers;
  }
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= semantic.length) {
    return layers;
  }
  const next = [...semantic];
  const temp = next[index]!;
  next[index] = next[swapIndex]!;
  next[swapIndex] = temp;
  return [...background, ...next];
}

export function renameEditorLayer(
  layers: EditorCanvasLayer[],
  layerId: string,
  label: string
): EditorCanvasLayer[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return layers;
  }
  return layers.map((layer) =>
    layer.id === layerId
      ? { ...layer, label: trimmed, layerSource: "manual" as const }
      : layer
  );
}

export function layerZIndexFromOrder(layers: EditorCanvasLayer[], layerId: string): number {
  const semantic = layers.filter((l) => l.layerType !== "background");
  const index = semantic.findIndex((l) => l.id === layerId);
  return index < 0 ? 0 : index + 1;
}

export function flattenSemanticTreeNodes(nodes: EditorLayerTreeNode[]): EditorCanvasLayer[] {
  const result: EditorCanvasLayer[] = [];
  const walk = (list: EditorLayerTreeNode[]) => {
    for (const node of list) {
      if (node.layer.layerType !== "background") {
        result.push(node.layer);
      }
      walk(node.children);
    }
  };
  walk(nodes);
  return result;
}
