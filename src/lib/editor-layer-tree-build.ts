import type {
  EditorCanvasLayer,
  EditorSemanticLayerCategory,
} from "@/types/homecheff-visual-editor";

export type EditorLayerTreeNode = {
  layer: EditorCanvasLayer;
  children: EditorLayerTreeNode[];
};

export type EditorLayerTreeGroup = {
  category: EditorSemanticLayerCategory;
  nodes: EditorLayerTreeNode[];
};

const CATEGORY_ORDER: EditorSemanticLayerCategory[] = [
  "character",
  "body",
  "face",
  "clothing",
  "accessory",
  "product",
  "package",
  "label",
  "logo",
  "prop",
  "environment",
  "text",
  "brand_element",
  "background",
  "unknown",
];

function buildNodeMap(layers: EditorCanvasLayer[]): Map<string, EditorLayerTreeNode> {
  const map = new Map<string, EditorLayerTreeNode>();
  for (const layer of layers) {
    if (layer.layerType === "background") {
      continue;
    }
    map.set(layer.id, { layer, children: [] });
  }
  return map;
}

export function buildEditorLayerTreeNodes(layers: EditorCanvasLayer[]): EditorLayerTreeNode[] {
  const map = buildNodeMap(layers);
  const roots: EditorLayerTreeNode[] = [];

  for (const node of map.values()) {
    const parentId = node.layer.parentObjectId;
    const parent = parentId ? map.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function groupEditorLayerTree(layers: EditorCanvasLayer[]): EditorLayerTreeGroup[] {
  const roots = buildEditorLayerTreeNodes(layers);
  const byCategory = new Map<EditorSemanticLayerCategory, EditorLayerTreeNode[]>();

  for (const node of roots) {
    const category = node.layer.category ?? "unknown";
    const list = byCategory.get(category) ?? [];
    list.push(node);
    byCategory.set(category, list);
  }

  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    nodes: byCategory.get(category) ?? [],
  }));
}

export function findEditorLayerTreeNode(
  layers: EditorCanvasLayer[],
  layerId: string
): EditorLayerTreeNode | null {
  const walk = (nodes: EditorLayerTreeNode[]): EditorLayerTreeNode | null => {
    for (const node of nodes) {
      if (node.layer.id === layerId) {
        return node;
      }
      const child = walk(node.children);
      if (child) {
        return child;
      }
    }
    return null;
  };
  return walk(buildEditorLayerTreeNodes(layers));
}
