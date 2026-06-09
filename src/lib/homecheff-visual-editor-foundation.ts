import type { CompositionGraphNode } from "@/types/studio-asset-generation-workbench";
import type { AssetReferencePlacement } from "@/types/studio-asset-generation-workbench";
import {
  DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS,
  EDITOR_OBJECT_OPERATIONS,
  type CharacterBodyDesignerParams,
  type EditorCanvasObject,
  type EditorCanvasTransform,
  type EditorObjectOperation,
  type PlacementCanvasItem,
  type VisualEditorSession,
} from "@/types/homecheff-visual-editor";

export { EDITOR_OBJECT_OPERATIONS, DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS };

export function createDefaultCanvasTransform(): EditorCanvasTransform {
  return { x: 0.5, y: 0.5, scale: 1, rotation: 0 };
}

export function applyEditorObjectOperation(
  object: EditorCanvasObject,
  operation: EditorObjectOperation,
  patch?: Partial<EditorCanvasObject>
): EditorCanvasObject {
  switch (operation) {
    case "visibility":
      return { ...object, visible: !object.visible };
    case "lock":
      return { ...object, locked: !object.locked };
    case "reset":
      return { ...object, transform: createDefaultCanvasTransform(), locked: false, visible: true };
    case "delete":
      return { ...object, visible: false };
    case "duplicate":
      return {
        ...object,
        id: `${object.id}_copy_${Date.now()}`,
        label: `${object.label} (copy)`,
        transform: { ...object.transform, x: object.transform.x + 0.05 },
      };
    default:
      return { ...object, ...patch };
  }
}

export function placementToCanvasItem(placement: AssetReferencePlacement): PlacementCanvasItem {
  return {
    ...placement,
    canvasTransform: createDefaultCanvasTransform(),
    canvasLocked:
      placement.locked === true ||
      placement.importance === "exact" ||
      placement.importance === "required",
    linkedObjectId: placement.objectTarget?.objectId,
  };
}

export function buildPlacementCanvasFromPlacements(
  placements: AssetReferencePlacement[]
): PlacementCanvasItem[] {
  return placements.map(placementToCanvasItem);
}

export function compositionGraphToCanvasTree(root: CompositionGraphNode): string[] {
  const lines: string[] = [];
  const walk = (node: CompositionGraphNode, indent: number) => {
    lines.push(`${" ".repeat(indent)}${node.label}`);
    for (const child of node.children) {
      walk(child, indent + 2);
    }
  };
  walk(root, 0);
  return lines;
}

export function buildBodyDesignerPromptBlock(params: CharacterBodyDesignerParams): string {
  const preset =
    params.stylizationPreset === "custom" && params.stylizationCustom
      ? params.stylizationCustom
      : params.stylizationPreset;
  return [
    "Character body design:",
    `head scale ${params.headScale}, eye scale ${params.eyeScale},`,
    `shoulders ${params.shoulderWidth}, arms ${params.armThickness}, waist ${params.waistWidth},`,
    `legs ${params.legLength}, hands ${params.handSize}, feet ${params.footSize}, height ${params.height}.`,
    `Stylization: ${preset}.`,
  ].join(" ");
}

export function createEmptyVisualEditorSession(sourceAssetId: string | null = null): VisualEditorSession {
  return {
    sessionId: crypto.randomUUID(),
    sourceAssetId,
    objects: [],
    placements: [],
    bodyDesigner: { ...DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS },
  };
}
