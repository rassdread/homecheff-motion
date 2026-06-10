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
  opacity?: number;
  zIndex?: number;
  exactnessMode?: EditorPlacementExactnessMode;
  visible?: boolean;
  targetLabel?: string;
  customTarget?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  createdAt?: string;
  updatedAt?: string;
};

export const EDITOR_PLACEMENT_EXACTNESS_MODES = [
  "prompt_only",
  "image_reference",
  "pixel_overlay",
  "hybrid",
] as const;

export type EditorPlacementExactnessMode = (typeof EDITOR_PLACEMENT_EXACTNESS_MODES)[number];

/** Full editor placement canvas model (alias of extended PlacementCanvasItem). */
export type EditorPlacementItem = PlacementCanvasItem & {
  opacity: number;
  zIndex: number;
  exactnessMode: EditorPlacementExactnessMode;
  visible: boolean;
  targetLabel: string;
  customTarget: boolean;
};

export type EditorCanvasBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const EDITOR_SELECTION_MODES = ["mask", "polygon", "box", "manual"] as const;

export type EditorSelectionMode = (typeof EDITOR_SELECTION_MODES)[number];

export const EDITOR_SEGMENTATION_SOURCES = [
  "vision_estimate",
  "heuristic",
  "rembg",
  "sam2",
  "manual",
] as const;

export type EditorSegmentationSource = (typeof EDITOR_SEGMENTATION_SOURCES)[number];

/** Normalized point on the canvas image (0–1). */
export type EditorShapePoint = {
  x: number;
  y: number;
};

/**
 * Optional shape data for precise object selection beyond bounding boxes.
 * `boundingBox` mirrors layer `bounds` in image-normalized coordinates.
 */
export type EditorObjectShape = {
  selectionMode: EditorSelectionMode;
  boundingBox: EditorCanvasBounds;
  polygon?: EditorShapePoint[];
  maskUrl?: string;
  maskStorageKey?: string;
  /** Compact mask payload (e.g. base64 PNG) when URL is not persisted. */
  maskData?: string;
  alphaMask?: boolean;
  segmentationSource?: EditorSegmentationSource;
  confidence?: number;
  editableShape?: boolean;
  cutoutUrl?: string;
};

export const EDITOR_SEMANTIC_LAYER_CATEGORIES = [
  "character",
  "body",
  "face",
  "clothing",
  "accessory",
  "logo",
  "product",
  "package",
  "label",
  "prop",
  "environment",
  "background",
  "text",
  "brand_element",
  "unknown",
] as const;

export type EditorSemanticLayerCategory = (typeof EDITOR_SEMANTIC_LAYER_CATEGORIES)[number];

export const EDITOR_SEMANTIC_LAYER_SOURCES = [
  "vision",
  "semantic_record",
  "fingerprint",
  "manual",
  "generated",
  "composition_graph",
] as const;

export type EditorSemanticLayerSource = (typeof EDITOR_SEMANTIC_LAYER_SOURCES)[number];

export type EditorIdentityRelevance =
  | "identity_marker"
  | "protected_brand_element"
  | "editable_accessory"
  | "removable_object"
  | "placement_target"
  | "none";

export type EditorSemanticLayerMetadata = {
  estimatedBounds?: boolean;
  approximateSelection?: boolean;
  selectionMode?: EditorSelectionMode;
  identityRelevance?: EditorIdentityRelevance;
  taxonomyKey?: string;
  rawFeature?: string;
};

export type EditorSemanticLayer = {
  id: string;
  label: string;
  type: string;
  category: EditorSemanticLayerCategory;
  bounds: EditorCanvasBounds;
  confidence: number;
  visible: boolean;
  locked: boolean;
  editable: boolean;
  source: EditorSemanticLayerSource;
  parentId?: string;
  children: string[];
  metadata?: EditorSemanticLayerMetadata;
};

export type EditorLayerActionEligibility = Record<EditorObjectOperation, boolean>;

export type EditorLayerOperationAudit = {
  layerId: string;
  operation: EditorObjectOperation;
  at: string;
};

export type EditorCanvasLayer = EditorCanvasObject & {
  bounds: EditorCanvasBounds;
  layerType: "background" | "semantic" | "placement" | "overlay";
  confidence?: number;
  semanticType?: string;
  category?: EditorSemanticLayerCategory;
  layerSource?: EditorSemanticLayerSource;
  editable?: boolean;
  children?: string[];
  metadata?: EditorSemanticLayerMetadata;
  /** Precise selection shape — preferred over bounds-only when present. */
  selectionShape?: EditorObjectShape;
};

/** High-level object categories for multi-object detection (Editor Vision V2). */
export const EDITOR_OBJECT_CATEGORIES = [
  "person",
  "face",
  "mascot",
  "logo",
  "text",
  "product",
  "clothing",
  "animal",
  "food",
  "vehicle",
  "screen",
  "foreground",
  "background",
  "prop",
  "unknown",
] as const;

export type EditorObjectCategory = (typeof EDITOR_OBJECT_CATEGORIES)[number];

/**
 * Unified detected object model — every analysis result becomes a stored EditorObject.
 * Maps 1:1 with canvas layers but carries explicit geometry for picking and editing.
 */
export type EditorObject = {
  id: string;
  label: string;
  confidence: number;
  mask?: string;
  maskStorageKey?: string;
  polygon?: EditorShapePoint[];
  bbox: EditorCanvasBounds;
  category: EditorObjectCategory;
  zIndex: number;
  parentId?: string;
  layerId: string;
  visible: boolean;
  locked: boolean;
};

export const EDITOR_HISTORY_ACTION_TYPES = [
  "move",
  "resize",
  "replace",
  "remove",
  "animate",
  "background_remove",
  "visibility",
  "lock",
  "rename",
  "reorder",
  "duplicate",
] as const;

export type EditorHistoryActionType = (typeof EDITOR_HISTORY_ACTION_TYPES)[number];

export type EditorHistoryEntry = {
  id: string;
  action: EditorHistoryActionType;
  layerId?: string;
  label: string;
  at: string;
  reversible: boolean;
};

export type EditorHistoryState = {
  past: EditorCanvasDocument[];
  future: EditorCanvasDocument[];
  timeline: EditorHistoryEntry[];
};

/** Per-layer non-destructive edit state — original image is never overwritten. */
export type EditorNonDestructiveLayerState = {
  layerId: string;
  originalPreviewUrl: string;
  originalStorageKey?: string;
  maskUrl?: string;
  cutoutUrl?: string;
  transform: EditorCanvasTransform;
  actions: EditorHistoryEntry[];
};

export type EditorNonDestructiveState = {
  backgroundOriginalUrl: string;
  backgroundOriginalStorageKey?: string;
  layers: Record<string, EditorNonDestructiveLayerState>;
};

/** Editable text layer detected separately from visual objects. */
export type EditorTextLayer = {
  id: string;
  content: string;
  bbox: EditorCanvasBounds;
  mask?: string;
  language?: string;
  confidence: number;
  layerId?: string;
  fontFamily?: string;
  visible: boolean;
  locked: boolean;
};

/** Motion preparation artifacts per object. */
export type EditorMotionPreparation = {
  objectId: string;
  layerId: string;
  cutoutUrl?: string;
  depthHint: number;
  motionRegion: EditorCanvasBounds;
  safeAnimationBounds: EditorCanvasBounds;
  ready: boolean;
};

export type EditorCanvasDocument = {
  sessionId: string;
  name: string;
  sourceKind: EditorSourceKind;
  sourceAssetId: string | null;
  backgroundUrl: string;
  backgroundStorageKey?: string;
  workflowStep: EditorWorkflowStepId;
  objects: EditorCanvasLayer[];
  placements: PlacementCanvasItem[];
  bodyDesigner?: CharacterBodyDesignerParams;
  visionAnalysisHash?: string;
  semanticLayers?: EditorSemanticLayer[];
  layerOperations?: EditorLayerOperationAudit[];
  /** All detected objects from vision/analysis — not only the selected one. */
  detectedObjects?: EditorObject[];
  textLayers?: EditorTextLayer[];
  nonDestructive?: EditorNonDestructiveState;
  history?: EditorHistoryState;
  motionPreparations?: EditorMotionPreparation[];
  status: "editing" | "draft_saved";
  updatedAt: string;
  createdAt: string;
};

export type VisualEditorSession = {
  sessionId: string;
  sourceAssetId: string | null;
  backgroundUrl?: string;
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
