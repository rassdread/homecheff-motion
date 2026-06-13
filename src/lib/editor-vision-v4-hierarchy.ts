/**
 * Editor Vision V4 — hierarchical analysis tree from ONNX + vision + part hierarchies.
 * Uses the same detection backbone as /api/editor/detect (RT-DETR via resolveObjectDetections).
 */

import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorSemanticLayer,
  EditorVisionHierarchyCategory,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function node(
  input: Omit<EditorVisionHierarchyNode, "children"> & { children?: EditorVisionHierarchyNode[] }
): EditorVisionHierarchyNode {
  return {
    ...input,
    children: input.children ?? [],
  };
}

function partCategoryToHierarchyCategory(partCategory: string): EditorVisionHierarchyCategory {
  const lower = partCategory.toLowerCase();
  if (lower.includes("face") || lower.includes("head") || lower.includes("hair") || lower.includes("eye") || lower.includes("mouth") || lower.includes("nose")) {
    return "face";
  }
  if (lower.includes("cloth") || lower.includes("tie") || lower.includes("shoe") || lower.includes("jacket") || lower.includes("shirt") || lower.includes("pant")) {
    return "clothing";
  }
  if (lower.includes("logo") || lower.includes("text") || lower.includes("brand")) {
    return "branding";
  }
  return "objects";
}

function objectCategoryToNodeCategory(category: string, label: string): EditorVisionHierarchyCategory {
  const lower = `${category} ${label}`.toLowerCase();
  if (lower.includes("background")) return "background";
  if (lower.includes("logo") || lower.includes("text") || lower.includes("brand")) return "branding";
  if (lower.includes("style") || lower.includes("palette") || lower.includes("illustration")) return "style";
  return "objects";
}

function buildPartSubtree(part: EditorObjectPart, objectId: string): EditorVisionHierarchyNode {
  const category = partCategoryToHierarchyCategory(part.partCategory);
  return node({
    id: part.id,
    label: part.label,
    category,
    partId: part.id,
    objectId,
    bbox: part.bbox,
    editable: true,
    estimated: part.estimatedBounds,
    children: [],
  });
}

function nestPartsUnderRoot(
  root: EditorVisionHierarchyNode,
  parts: EditorObjectPart[],
  objectId: string
): EditorVisionHierarchyNode {
  const partNodes = new Map(parts.map((p) => [p.id, buildPartSubtree(p, objectId)]));
  const roots: EditorVisionHierarchyNode[] = [];

  for (const part of parts) {
    const partNode = partNodes.get(part.id)!;
    if (part.parentPartId && partNodes.has(part.parentPartId)) {
      partNodes.get(part.parentPartId)!.children.push(partNode);
    } else {
      roots.push(partNode);
    }
  }

  return { ...root, children: roots };
}

function buildObjectBranch(
  object: EditorObject,
  layer: EditorCanvasLayer | undefined,
  hierarchy: EditorObjectHierarchy | undefined
): EditorVisionHierarchyNode {
  const root = node({
    id: `obj_${object.id}`,
    label: object.label,
    category: objectCategoryToNodeCategory(object.category, object.label),
    layerId: object.layerId,
    objectId: object.id,
    bbox: object.bbox,
    editable: object.category !== "background",
    estimated: layer?.metadata?.estimatedBounds ?? true,
    children: [],
  });

  if (hierarchy && hierarchy.parts.length > 0) {
    return nestPartsUnderRoot(root, hierarchy.parts, object.id);
  }

  if (layer?.children?.length) {
    return {
      ...root,
      children: layer.children.map((childId) =>
        node({
          id: `child_${childId}`,
          label: childId,
          category: "objects",
          layerId: childId,
          objectId: object.id,
          editable: true,
          estimated: true,
        })
      ),
    };
  }

  return root;
}

function buildStyleBranch(vision?: AssetVisionAnalysis): EditorVisionHierarchyNode | null {
  if (!vision) return null;
  const children: EditorVisionHierarchyNode[] = [];

  if (vision.visualStyle) {
    children.push(
      node({
        id: "style_visual",
        label: vision.visualStyle,
        category: "style",
        editable: false,
      })
    );
  }
  for (const color of vision.colors.slice(0, 6)) {
    const label = color.label ?? color.hex ?? "color";
    children.push(
      node({
        id: `style_color_${label}`,
        label,
        category: "style",
        editable: false,
      })
    );
  }
  for (const feature of vision.shapeLanguage.slice(0, 4)) {
    children.push(
      node({
        id: `style_shape_${feature}`,
        label: feature,
        category: "style",
        editable: false,
      })
    );
  }
  if (vision.brandIdentity) {
    children.push(
      node({
        id: "style_brand_identity",
        label: vision.brandIdentity,
        category: "branding",
        editable: false,
      })
    );
  }

  if (children.length === 0) return null;

  return node({
    id: "style_root",
    label: "Style",
    category: "style",
    editable: false,
    children,
  });
}

function buildBackgroundBranch(
  layer: EditorCanvasLayer | undefined
): EditorVisionHierarchyNode {
  return node({
    id: "background_root",
    label: "Background",
    category: "background",
    layerId: layer?.id ?? "background",
    objectId: layer?.id,
    bbox: layer?.bounds ?? { x: 0, y: 0, width: 1, height: 1 },
    editable: true,
    children: [
      node({ id: "bg_color", label: "Color", category: "background", editable: true }),
      node({ id: "bg_lighting", label: "Lighting", category: "background", editable: true }),
    ],
  });
}

export function buildEditorVisionHierarchy(input: {
  objects: EditorObject[];
  layers: EditorCanvasLayer[];
  semanticLayers?: EditorSemanticLayer[];
  objectHierarchies?: Record<string, EditorObjectHierarchy>;
  vision?: AssetVisionAnalysis;
}): EditorVisionHierarchyNode[] {
  const layerById = new Map(input.layers.map((l) => [l.id, l]));
  const tree: EditorVisionHierarchyNode[] = [];

  const objectNodes = input.objects
    .filter((o) => o.category !== "background")
    .map((object) =>
      buildObjectBranch(
        object,
        layerById.get(object.layerId),
        input.objectHierarchies?.[object.id]
      )
    );

  if (objectNodes.length > 0) {
    tree.push(
      node({
        id: "objects_root",
        label: "Objects",
        category: "objects",
        editable: false,
        children: objectNodes,
      })
    );
  }

  const styleBranch = buildStyleBranch(input.vision);
  if (styleBranch) {
    tree.push(styleBranch);
  }

  const bgLayer = input.layers.find((l) => l.layerType === "background");
  tree.push(buildBackgroundBranch(bgLayer));

  return tree;
}

export function flattenEditableVisionNodes(
  nodes: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  const out: EditorVisionHierarchyNode[] = [];
  function walk(n: EditorVisionHierarchyNode) {
    if (n.editable && (n.layerId || n.partId)) {
      out.push(n);
    }
    for (const child of n.children) {
      walk(child);
    }
  }
  for (const root of nodes) {
    walk(root);
  }
  return out;
}

export function findVisionHierarchyNode(
  nodes: EditorVisionHierarchyNode[],
  nodeId: string
): EditorVisionHierarchyNode | null {
  for (const root of nodes) {
    if (root.id === nodeId) return root;
    const stack = [...root.children];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.id === nodeId) return current;
      stack.push(...current.children);
    }
  }
  return null;
}
