/**
 * Resolves V6 hierarchy nodes to actionable instruction objects (incl. virtual layers).
 */

import { actionsForInstructionCategory } from "@/lib/editor-instruction-actions";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";
import type {
  EditorCanvasDocument,
  EditorSemanticLayer,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

const PART_CATEGORY_MAP: Record<string, EditorInstructionObjectCategory> = {
  head: "character",
  face: "character",
  eyes: "character",
  mouth: "character",
  hands: "character",
  shoes: "character",
  jacket: "clothing",
  tie: "clothing",
  shirt: "clothing",
  globe: "product",
  logo: "logo",
  background: "background",
  shadow: "background",
  prop: "product",
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function inferCategoryFromLabel(
  label: string,
  nodeCategory?: EditorVisionHierarchyNode["category"]
): EditorInstructionObjectCategory {
  const text = label.toLowerCase();
  if (nodeCategory === "background" || /background|backdrop|shadow/.test(text)) {
    return "background";
  }
  if (nodeCategory === "style") {
    return "other";
  }
  if (/logo|brand/.test(text)) {
    return "logo";
  }
  if (/\bglobe\b|\bearth\b|\bworld\b|prop/.test(text)) {
    return "product";
  }
  if (/tie|jacket|shirt|shoe|hand|coat|apron|clothing/.test(text)) {
    return /shoe|tie|jacket|shirt|coat|apron/.test(text) ? "clothing" : "character";
  }
  if (/head|eye|mouth|face|mascot|character|person/.test(text)) {
    return "character";
  }
  for (const [token, category] of Object.entries(PART_CATEGORY_MAP)) {
    if (text.includes(token)) {
      return category;
    }
  }
  return "other";
}

function findSemanticLayer(
  document: EditorCanvasDocument,
  node: EditorVisionHierarchyNode
): EditorSemanticLayer | undefined {
  if (node.layerId) {
    const byId = document.semanticLayers?.find((l) => l.id === node.layerId);
    if (byId) {
      return byId;
    }
  }
  const labelKey = node.label.toLowerCase().trim();
  return document.semanticLayers?.find(
    (l) => l.label?.toLowerCase().trim() === labelKey
  );
}

function resolvePartFromHierarchy(
  document: EditorCanvasDocument,
  node: EditorVisionHierarchyNode
): { bbox?: { x: number; y: number; width: number; height: number }; partCategory?: string } | null {
  if (!node.partId || !node.objectId) {
    return null;
  }
  const hierarchy = document.objectHierarchies?.[node.objectId];
  const part = hierarchy?.parts.find((p) => p.id === node.partId);
  if (!part) {
    return null;
  }
  return { bbox: part.bbox, partCategory: part.partCategory };
}

export function isHierarchyNodeSelectable(node: EditorVisionHierarchyNode): boolean {
  if (node.category === "style") {
    return true;
  }
  if (node.editable) {
    return true;
  }
  return Boolean(node.layerId || node.partId || node.bbox);
}

export function flattenSelectableHierarchyNodes(
  nodes: EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  const result: EditorVisionHierarchyNode[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (isHierarchyNodeSelectable(node)) {
        result.push(node);
      }
      walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

export function buildVirtualInstructionObjectFromNode(
  document: EditorCanvasDocument,
  node: EditorVisionHierarchyNode,
  index = 0
): EditorInstructionObjectV2 {
  const semantic = findSemanticLayer(document, node);
  const partInfo = resolvePartFromHierarchy(document, node);
  const category = inferCategoryFromLabel(node.label, node.category);
  const layerId = node.layerId ?? semantic?.id;
  const slug = slugify(node.label) || "part";
  const boundsSource = node.bbox ?? semantic?.bounds ?? partInfo?.bbox;
  const bounds = boundsSource
    ? {
        x: boundsSource.x,
        y: boundsSource.y,
        width: boundsSource.width,
        height: boundsSource.height,
        exact: !node.estimated && !(semantic?.metadata?.estimatedBounds ?? false),
      }
    : undefined;

  const obj: EditorInstructionObjectV2 = {
    id: `obj_v6_${slug}_${index}`,
    label: node.label,
    category,
    confidence: node.confidence ?? semantic?.confidence ?? 0.72,
    description: `${node.label} (${category})`,
    suggestedActions: actionsForInstructionCategory(category),
    layerId,
    source: "semanticLayers",
    bounds,
  };
  const resolved = resolveInstructionObjectBounds(obj, document);
  return { ...obj, bounds: resolved };
}

export function resolveInstructionObjectFromHierarchyNode(
  document: EditorCanvasDocument,
  feedObjects: EditorInstructionObjectV2[],
  node: EditorVisionHierarchyNode
): EditorInstructionObjectV2 {
  if (node.layerId) {
    const byLayer = feedObjects.find((o) => o.layerId === node.layerId);
    if (byLayer) {
      return byLayer;
    }
  }
  if (node.partId && node.objectId) {
    const hierarchy = document.objectHierarchies?.[node.objectId];
    const part = hierarchy?.parts.find((p) => p.id === node.partId);
    if (part) {
      const byPartLabel = feedObjects.find(
        (o) => o.label.toLowerCase() === (part.label ?? node.label).toLowerCase()
      );
      if (byPartLabel) {
        return byPartLabel;
      }
    }
  }
  const byLabel = feedObjects.find(
    (o) => o.label.toLowerCase().trim() === node.label.toLowerCase().trim()
  );
  if (byLabel) {
    return byLabel;
  }
  const partial = feedObjects.find((o) => {
    const a = o.label.toLowerCase();
    const b = node.label.toLowerCase();
    return a.includes(b) || b.includes(a);
  });
  if (partial) {
    return partial;
  }
  return buildVirtualInstructionObjectFromNode(document, node, feedObjects.length);
}

export function styleAttributeFromHierarchyNode(
  node: EditorVisionHierarchyNode
): import("@/types/editor-instruction-studio").EditorStyleAttribute {
  const label = node.label.toLowerCase();
  if (/color|palette|kleur/.test(label)) {
    return "color_palette";
  }
  if (/brand/.test(label)) {
    return "brand_colors";
  }
  if (/outline|line/.test(label)) {
    return "outline_style";
  }
  if (/silhouette/.test(label)) {
    return "silhouette";
  }
  if (/illustration|visual style|stijl/.test(label)) {
    return "illustration_style";
  }
  return "color_palette";
}

export function selectionPatchFromHierarchyNode(
  document: EditorCanvasDocument,
  node: EditorVisionHierarchyNode,
  object: EditorInstructionObjectV2
): {
  objectKey: string;
  objectLabel: string;
  category: EditorInstructionObjectCategory;
  targetPartId?: string;
  targetLayerId?: string;
  estimatedSelection?: boolean;
} {
  return {
    objectKey: object.id,
    objectLabel: object.label,
    category: object.category,
    targetPartId: node.partId,
    targetLayerId: node.layerId ?? object.layerId,
    estimatedSelection: Boolean(node.estimated || !object.bounds?.exact),
  };
}
