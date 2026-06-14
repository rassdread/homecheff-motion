import { defaultActionForCategory } from "@/lib/editor-instruction-actions";
import {
  buildInstructionObjectsFromDocument,
  type InstructionObjectFeedResult,
} from "@/lib/editor-instruction-object-feed";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionObjectFeedMeta,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";

export {
  buildInstructionObjectsFromDocument,
  buildGlobeManHeuristicObjects,
  isGlobeManMascotImage,
  isStyleTrait,
  cleanRawObjectFeed,
  dedupeAndMergeObjects,
  dedupeV6SemanticObjects,
  normalizeDisplayLabel,
  type InstructionObjectFeedResult,
} from "@/lib/editor-instruction-object-feed";

export {
  buildVirtualInstructionObjectFromNode,
  flattenSelectableHierarchyNodes,
  isHierarchyNodeSelectable,
  resolveInstructionObjectFromHierarchyNode,
  selectionPatchFromHierarchyNode,
  styleAttributeFromHierarchyNode,
} from "@/lib/editor-hierarchy-object-resolution";

export function getInstructionObjectFeed(document: EditorCanvasDocument): InstructionObjectFeedResult {
  return buildInstructionObjectsFromDocument(document);
}

export function getInstructionObjectFeedMeta(document: EditorCanvasDocument): EditorInstructionObjectFeedMeta {
  return buildInstructionObjectsFromDocument(document).meta;
}

export function listInstructionObjectsV2(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return buildInstructionObjectsFromDocument(document).editableObjects;
}

export function findInstructionObjectV2(
  document: EditorCanvasDocument,
  objectKey: string
): EditorInstructionObjectV2 | undefined {
  return listInstructionObjectsV2(document).find((o) => o.id === objectKey);
}

export function defaultSelectionForObject(obj: EditorInstructionObjectV2) {
  return {
    objectKey: obj.id,
    objectLabel: obj.label,
    category: obj.category,
    action: obj.suggestedActions[0] ?? defaultActionForCategory(obj.category),
  };
}
