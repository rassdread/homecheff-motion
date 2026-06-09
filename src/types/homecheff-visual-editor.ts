/**
 * Universal Visual Editor foundation — object manipulation, body designer, placement canvas.
 * Semantic/canvas contracts only; no render pipeline.
 */

import type { AssetReferencePlacement } from "@/types/studio-asset-generation-workbench";

export const EDITOR_OBJECT_OPERATIONS = [
  "move",
  "scale",
  "rotate",
  "replace",
  "delete",
  "duplicate",
  "visibility",
  "lock",
  "rename",
  "reset",
] as const;

export type EditorObjectOperation = (typeof EDITOR_OBJECT_OPERATIONS)[number];

export const EDITOR_SOURCE_KINDS = [
  "upload",
  "generated",
  "derived",
  "canonical",
  "product_photo",
  "logo",
  "character",
] as const;

export type EditorSourceKind = (typeof EDITOR_SOURCE_KINDS)[number];

export type EditorCanvasTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type EditorCanvasObject = {
  id: string;
  label: string;
  sourceKind: EditorSourceKind;
  assetId: string | null;
  storageKey: string;
  previewUrl: string;
  transform: EditorCanvasTransform;
  locked: boolean;
  visible: boolean;
  parentObjectId?: string;
};

export const CHARACTER_BODY_STYLIZATION_PRESETS = [
  "realistic",
  "stylized",
  "mascot",
  "hero",
  "cute",
  "cartoon",
  "custom",
] as const;

export type CharacterBodyStylizationPreset = (typeof CHARACTER_BODY_STYLIZATION_PRESETS)[number];

export type CharacterBodyDesignerParams = {
  headScale: number;
  eyeScale: number;
  shoulderWidth: number;
  armThickness: number;
  waistWidth: number;
  legLength: number;
  handSize: number;
  footSize: number;
  height: number;
  stylizationPreset: CharacterBodyStylizationPreset;
  stylizationCustom?: string;
};

export const DEFAULT_CHARACTER_BODY_DESIGNER_PARAMS: CharacterBodyDesignerParams = {
  headScale: 1,
  eyeScale: 1,
  shoulderWidth: 1,
  armThickness: 1,
  waistWidth: 1,
  legLength: 1,
  handSize: 1,
  footSize: 1,
  height: 1,
  stylizationPreset: "stylized",
};

export type PlacementCanvasItem = AssetReferencePlacement & {
  canvasTransform: EditorCanvasTransform;
  linkedObjectId?: string;
  canvasLocked: boolean;
};

export type VisualEditorSession = {
  sessionId: string;
  sourceAssetId: string | null;
  objects: EditorCanvasObject[];
  placements: PlacementCanvasItem[];
  bodyDesigner?: CharacterBodyDesignerParams;
  compositionGraphRootId?: string;
};

export const EDITOR_WORKFLOW_STEP_IDS = [
  "upload",
  "vision",
  "object_detection",
  "visual_editor",
  "review",
  "save_asset",
] as const;

export type EditorWorkflowStepId = (typeof EDITOR_WORKFLOW_STEP_IDS)[number];
