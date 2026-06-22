import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import { resolveLegacyActionPartGroupFromNode } from "@/lib/editor-vision-hierarchy-action-mapping";

export function findHierarchyNodeByPartId(
  nodes: EditorVisionHierarchyNode[],
  partId: string | null | undefined
): EditorVisionHierarchyNode | null {
  if (!partId) {
    return null;
  }
  for (const node of nodes) {
    if (node.partId === partId || node.id === partId) {
      return node;
    }
    const child = findHierarchyNodeByPartId(node.children, partId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function findHierarchyNodeById(
  nodes: EditorVisionHierarchyNode[],
  nodeId: string | null | undefined
): EditorVisionHierarchyNode | null {
  if (!nodeId) {
    return null;
  }
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const child = findHierarchyNodeById(node.children, nodeId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function buildHierarchyPath(
  nodes: EditorVisionHierarchyNode[],
  nodeId: string | null | undefined
): string[] {
  if (!nodeId) {
    return [];
  }

  function walk(
    list: EditorVisionHierarchyNode[],
    trail: string[]
  ): string[] | null {
    for (const node of list) {
      const next = [...trail, node.label];
      if (node.id === nodeId) {
        return next;
      }
      const found = walk(node.children, next);
      if (found) {
        return found;
      }
    }
    return null;
  }

  return walk(nodes, []) ?? [];
}

export function flattenVisibleHierarchyLabels(
  nodes: EditorVisionHierarchyNode[],
  depth = 0,
  maxDepth = 4
): string[] {
  if (depth > maxDepth) {
    return [];
  }
  const labels: string[] = [];
  for (const node of nodes) {
    labels.push(node.label);
    labels.push(...flattenVisibleHierarchyLabels(node.children, depth + 1, maxDepth));
  }
  return labels;
}

export function inferPartGroupFromNode(node: EditorVisionHierarchyNode): string {
  return resolveLegacyActionPartGroupFromNode(node);
}
