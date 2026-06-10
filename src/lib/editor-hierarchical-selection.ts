import { maskHitTest, pickTopEditorObjectAtPoint, polygonHitTest, bboxHitTest } from "@/lib/editor-object-picking";
import type {
  EditorHierarchicalSelectionState,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
  EditorShapePoint,
} from "@/types/homecheff-visual-editor";

export type HierarchicalPickResult = {
  rootObject: EditorObject;
  part: EditorObjectPart | null;
  mode: "object" | "part";
};

export function createDefaultHierarchicalSelection(): EditorHierarchicalSelectionState {
  return { mode: "object", rootObjectId: null, selectedPartId: null };
}

export function enterPartSelectionMode(
  state: EditorHierarchicalSelectionState,
  rootObjectId: string
): EditorHierarchicalSelectionState {
  return { mode: "part", rootObjectId, selectedPartId: null };
}

export function exitPartSelectionMode(
  state: EditorHierarchicalSelectionState
): EditorHierarchicalSelectionState {
  return { mode: "object", rootObjectId: null, selectedPartId: null };
}

function partHitTest(point: EditorShapePoint, part: EditorObjectPart): boolean {
  if (part.mask) {
    const pseudo: EditorObject = {
      id: part.id,
      layerId: part.id,
      label: part.label,
      confidence: part.confidence,
      mask: part.mask,
      polygon: part.polygon,
      bbox: part.bbox,
      category: "unknown",
      zIndex: 0,
      visible: part.visible,
      locked: part.locked,
    };
    if (maskHitTest(point, pseudo)) return true;
  }
  if (part.polygon?.length) {
    const pseudo: EditorObject = {
      id: part.id,
      layerId: part.id,
      label: part.label,
      confidence: part.confidence,
      polygon: part.polygon,
      bbox: part.bbox,
      category: "unknown",
      zIndex: 0,
      visible: part.visible,
      locked: part.locked,
    };
    if (polygonHitTest(point, pseudo)) return true;
  }
  const pseudo: EditorObject = {
    id: part.id,
    layerId: part.id,
    label: part.label,
    confidence: part.confidence,
    bbox: part.bbox,
    category: "unknown",
    zIndex: 0,
    visible: part.visible,
    locked: part.locked,
  };
  return bboxHitTest(point, pseudo);
}

export function pickPartAtPoint(
  point: EditorShapePoint,
  hierarchy: EditorObjectHierarchy
): EditorObjectPart | null {
  const visible = hierarchy.parts.filter((p) => p.visible);
  const hits = visible.filter((p) => partHitTest(point, p));
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.bbox.width * a.bbox.height - b.bbox.width * b.bbox.height);
  return hits[0] ?? null;
}

export function hoverPartsAtPoint(
  point: EditorShapePoint,
  hierarchy: EditorObjectHierarchy
): EditorObjectPart[] {
  return hierarchy.parts.filter((p) => p.visible && partHitTest(point, p));
}

/**
 * Two-phase picking:
 * - object mode: select root object
 * - part mode (after root selected): select part within root
 */
export function pickHierarchicalAtPoint(
  point: EditorShapePoint,
  objects: EditorObject[],
  hierarchies: Record<string, EditorObjectHierarchy>,
  selection: EditorHierarchicalSelectionState
): HierarchicalPickResult | null {
  if (selection.mode === "part" && selection.rootObjectId) {
    const root = objects.find((o) => o.id === selection.rootObjectId);
    const hierarchy = hierarchies[selection.rootObjectId];
    if (root && hierarchy) {
      const part = pickPartAtPoint(point, hierarchy);
      return { rootObject: root, part, mode: "part" };
    }
  }

  const hit = pickTopEditorObjectAtPoint(point, objects);
  if (!hit) return null;
  return { rootObject: hit.object, part: null, mode: "object" };
}

export function resolveHierarchicalSelectionLabel(
  result: HierarchicalPickResult | null
): string | null {
  if (!result) return null;
  if (result.part) return result.part.label;
  return result.rootObject.label;
}

export function shouldEnterPartModeOnReselect(
  selection: EditorHierarchicalSelectionState,
  rootObjectId: string
): boolean {
  return selection.mode === "object" && selection.rootObjectId === rootObjectId;
}

export function updateSelectionAfterPick(
  selection: EditorHierarchicalSelectionState,
  result: HierarchicalPickResult
): EditorHierarchicalSelectionState {
  if (result.mode === "object") {
    if (selection.rootObjectId === result.rootObject.id && selection.mode === "object") {
      return enterPartSelectionMode(selection, result.rootObject.id);
    }
    return { mode: "object", rootObjectId: result.rootObject.id, selectedPartId: null };
  }
  return {
    mode: "part",
    rootObjectId: result.rootObject.id,
    selectedPartId: result.part?.id ?? null,
  };
}
