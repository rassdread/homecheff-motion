/**
 * Sprint K — Vision Target Picker V2 (existing vision data only).
 */

import { buildVisibleEditorPartsTreeFromDocument } from "@/lib/build-visible-editor-parts-tree";
import { isHierarchyNodeSelectable } from "@/lib/editor-hierarchy-object-resolution";
import { resolveInstructionObjectFromHierarchyNode } from "@/lib/editor-hierarchy-object-resolution";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { objectSupportsLogoPlacement } from "@/lib/logo-placement-blueprint";
import { categorySupportsBranding } from "@/lib/editor-instruction-actions";
import {
  confidenceToTier,
  resolveVisionTargetHighlightGeometry,
} from "@/lib/vision-target-highlight";
import {
  inferVisionTargetCategory,
  normalizeVisionTargetKey,
  normalizeVisionTargetLabel,
} from "@/lib/vision-target-normalization";
import type { EditorInstructionObjectCategory, EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";
import type {
  VisionTargetNodeV2,
  VisionTargetSelection,
  VisionTargetTreeV2,
} from "@/types/vision-target-picker";

function flattenHierarchy(nodes: EditorVisionHierarchyNode[]): EditorVisionHierarchyNode[] {
  const out: EditorVisionHierarchyNode[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return out;
}

function isStructuralNode(node: EditorVisionHierarchyNode): boolean {
  return Boolean(node.truthSection || (!node.partId && node.taxonomyTab));
}

function mapCategory(category: string): EditorInstructionObjectCategory {
  const allowed: EditorInstructionObjectCategory[] = [
    "character",
    "logo",
    "text",
    "product",
    "packaging",
    "clothing",
    "tool",
    "food",
    "background",
    "environment",
    "vehicle",
    "building",
    "signage",
    "other",
  ];
  return allowed.includes(category as EditorInstructionObjectCategory)
    ? (category as EditorInstructionObjectCategory)
    : "other";
}

function buildTargetNode(
  document: EditorCanvasDocument,
  node: EditorVisionHierarchyNode,
  parentId?: string
): VisionTargetNodeV2 | null {
  if (isStructuralNode(node)) {
    return null;
  }

  const rawLabel = node.label.trim();
  const normalizedKey = normalizeVisionTargetKey(rawLabel);
  const label = normalizeVisionTargetLabel(rawLabel);
  const category = inferVisionTargetCategory(label, node.category);
  const confidence = node.confidence ?? 0.72;
  const feedObjects = listInstructionObjectsV2(document);
  const instructionObject = resolveInstructionObjectFromHierarchyNode(document, feedObjects, node);
  const geometry = resolveVisionTargetHighlightGeometry(document, {
    layerId: node.layerId ?? instructionObject.layerId,
    objectId: node.objectId,
    hierarchyNodeId: node.id,
    label,
    bounds: instructionObject.bounds,
  });

  const brandingEligible =
    objectSupportsLogoPlacement(instructionObject) || categorySupportsBranding(mapCategory(category));
  const motionEligible = brandingEligible && geometry.priority !== "bbox";
  const fusionEligible = brandingEligible;

  return {
    id: node.id,
    label,
    rawLabel,
    normalizedKey,
    category,
    confidence,
    confidenceTier: confidenceToTier(confidence),
    parentId,
    children: [],
    hierarchyNodeId: node.id,
    partId: node.partId,
    layerId: node.layerId ?? instructionObject.layerId,
    objectId: node.objectId,
    geometry,
    brandingEligible,
    motionEligible,
    fusionEligible,
    source: node.source ?? "vision_hierarchy",
    selectable: isHierarchyNodeSelectable(node),
  };
}

function attachChildren(
  document: EditorCanvasDocument,
  parent: VisionTargetNodeV2,
  hierarchyChildren: EditorVisionHierarchyNode[]
): void {
  for (const child of hierarchyChildren) {
    if (isStructuralNode(child)) {
      attachChildren(document, parent, child.children);
      continue;
    }
    const mapped = buildTargetNode(document, child, parent.id);
    if (!mapped) {
      continue;
    }
    parent.children.push(mapped);
    if (child.children.length) {
      attachChildren(document, mapped, child.children);
    }
  }
}

export function buildVisionTargetTreeFromDocument(
  document: EditorCanvasDocument
): VisionTargetTreeV2 {
  const built = buildVisibleEditorPartsTreeFromDocument(document);
  const roots: VisionTargetNodeV2[] = [];

  for (const node of built.tree) {
    if (isStructuralNode(node) && node.children.length) {
      const firstChild = node.children.find((child) => !isStructuralNode(child));
      const parentLabel = normalizeVisionTargetLabel(node.label);
      const parent: VisionTargetNodeV2 = {
        id: `group_${node.id}`,
        label: parentLabel,
        rawLabel: node.label,
        normalizedKey: normalizeVisionTargetKey(node.label),
        category: inferVisionTargetCategory(parentLabel, node.category),
        confidence: node.confidence ?? 0.7,
        confidenceTier: confidenceToTier(node.confidence ?? 0.7),
        children: [],
        hierarchyNodeId: node.id,
        brandingEligible: true,
        motionEligible: false,
        fusionEligible: true,
        source: built.debug.datasourceUsed,
        selectable: false,
      };
      attachChildren(document, parent, node.children);
      if (parent.children.length > 0) {
        roots.push(parent);
      } else if (firstChild) {
        const leaf = buildTargetNode(document, firstChild);
        if (leaf) {
          roots.push(leaf);
        }
      }
      continue;
    }

    const mapped = buildTargetNode(document, node);
    if (!mapped) {
      continue;
    }
    if (node.children.length) {
      attachChildren(document, mapped, node.children);
    }
    roots.push(mapped);
  }

  const flat = flattenSelectableTargets(roots);
  return {
    roots,
    datasource: built.debug.datasourceUsed,
    totalSelectable: flat.length,
    hasChildParts: roots.some((root) => root.children.length > 0),
  };
}

export function flattenSelectableTargets(roots: VisionTargetNodeV2[]): VisionTargetNodeV2[] {
  const out: VisionTargetNodeV2[] = [];
  const walk = (nodes: VisionTargetNodeV2[]) => {
    for (const node of nodes) {
      if (node.selectable && node.brandingEligible) {
        out.push(node);
      }
      if (node.children.length) {
        walk(node.children);
      }
    }
  };
  walk(roots);
  return out;
}

export function findVisionTargetNode(
  roots: VisionTargetNodeV2[],
  targetId: string
): VisionTargetNodeV2 | null {
  for (const root of roots) {
    if (root.id === targetId) {
      return root;
    }
    const child = findVisionTargetNode(root.children, targetId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function visionTargetToInstructionObject(
  document: EditorCanvasDocument,
  node: VisionTargetNodeV2
): EditorInstructionObjectV2 {
  if (node.hierarchyNodeId) {
    const flat = flattenHierarchy(
      buildVisibleEditorPartsTreeFromDocument(document).tree
    );
    const hierarchyNode = flat.find((entry) => entry.id === node.hierarchyNodeId);
    if (hierarchyNode) {
      return resolveInstructionObjectFromHierarchyNode(
        document,
        listInstructionObjectsV2(document),
        hierarchyNode
      );
    }
  }

  const geometry = node.geometry ?? resolveVisionTargetHighlightGeometry(document, node);
  return {
    id: node.objectId ?? node.id,
    label: node.label,
    category: mapCategory(node.category),
    confidence: node.confidence,
    description: `Vision target ${node.normalizedKey}`,
    suggestedActions: [],
    layerId: node.layerId,
    source: "semanticLayers",
    bounds: geometry.bounds,
  };
}

export function buildVisionTargetSelection(
  document: EditorCanvasDocument,
  targetIds: string[],
  roots: VisionTargetNodeV2[]
): VisionTargetSelection {
  const nodes = targetIds
    .map((id) => findVisionTargetNode(roots, id))
    .filter((node): node is VisionTargetNodeV2 => node !== null);

  return {
    targetIds,
    nodes,
    primary: nodes[0] ?? null,
  };
}

export function mergeVisionTargetSelectionObjects(
  document: EditorCanvasDocument,
  selection: VisionTargetSelection
): EditorInstructionObjectV2[] {
  return selection.nodes.map((node) => visionTargetToInstructionObject(document, node));
}
