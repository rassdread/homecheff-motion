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
  "replicate_sam3",
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
  "onnx_detector",
  "semantic_record",
  "fingerprint",
  "manual",
  "generated",
  "composition_graph",
  "segment_prompt",
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
  bootstrapRegion?: boolean;
  rawFeature?: string;
  /** True when layer was created from EditorClickSegmentPrompt segmentation. */
  promptCreatedSubLayer?: boolean;
  segmentPrompt?: string;
  parentLayerId?: string;
  /** Admin debug — last segmentation provider that produced the mask. */
  lastSegmentProvider?: string;
  lastSegmentPredictionId?: string;
  lastSegmentRuntimeMs?: number;
  /** Vision V6 — part provenance for admin/debug. */
  visionPartSource?: EditorVisionPartSource;
  partCategory?: EditorPartCategory;
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
/** Controllable part categories for hierarchical object editing (Editor Vision V4). */
export const EDITOR_PART_CATEGORIES = [
  "root",
  "head",
  "face",
  "hair",
  "torso",
  "left_arm",
  "right_arm",
  "left_hand",
  "right_hand",
  "legs",
  "clothing",
  "accessory",
  "logo",
  "globe",
  "tie",
  "prop",
  "eyes",
  "mouth",
  "jacket",
  "shirt",
  "pants",
  "shoes",
  "arms",
  "hands",
  "shadow",
  "outline",
] as const;

export type EditorPartCategory = (typeof EDITOR_PART_CATEGORIES)[number];

export const EDITOR_OBJECT_ANIMATION_PROFILES = [
  "none",
  "float",
  "rotate",
  "pulse",
  "wave",
  "follow_path",
  "orbit",
  "bounce",
] as const;

export type EditorObjectAnimationProfile = (typeof EDITOR_OBJECT_ANIMATION_PROFILES)[number];

export const EDITOR_PART_ANIMATION_PROFILES = [
  "none",
  "nod",
  "wave",
  "spin",
  "rotate",
  "bob",
  "sway",
] as const;

export type EditorPartAnimationProfile = (typeof EDITOR_PART_ANIMATION_PROFILES)[number];

export const EDITOR_CHARACTER_EXPRESSIONS = [
  "neutral",
  "happy",
  "focused",
  "surprised",
  "confident",
] as const;

export type EditorCharacterExpression = (typeof EDITOR_CHARACTER_EXPRESSIONS)[number];

/** A controllable sub-part of an editor object (arm, face, logo, globe, etc.). */
export type EditorObjectPart = {
  id: string;
  label: string;
  partCategory: EditorPartCategory;
  parentPartId?: string;
  childPartIds: string[];
  bbox: EditorCanvasBounds;
  polygon?: EditorShapePoint[];
  mask?: string;
  maskStorageKey?: string;
  cutoutUrl?: string;
  confidence: number;
  visible: boolean;
  locked: boolean;
  transform: EditorCanvasTransform;
  animationProfile: EditorPartAnimationProfile;
  expression?: EditorCharacterExpression;
  estimatedBounds?: boolean;
};

export type EditorVisionPartSource =
  | "rtdetr"
  | "openai_vision"
  | "estimated"
  | "manual"
  | "taxonomy_fallback"
  | "creative";

export type EditorVisionTruthTier = "vision" | "estimated" | "creative" | "debug";

export type EditorVisionTruthSection = "detected" | "estimated" | "creative" | "debug";

export type EditorVisionHierarchyCategory =
  | "objects"
  | "face"
  | "clothing"
  | "branding"
  | "style"
  | "background";

export type EditorVisionHierarchyNode = {
  id: string;
  label: string;
  category: EditorVisionHierarchyCategory;
  layerId?: string;
  partId?: string;
  objectId?: string;
  bbox?: EditorCanvasBounds;
  editable: boolean;
  estimated?: boolean;
  /** Vision V6 — where this node came from. */
  source?: EditorVisionPartSource;
  /** Vision Truth Mode — user-facing tier (Vision / Estimated / Creative). */
  truthTier?: EditorVisionTruthTier;
  /** Vision Truth Mode — section header (Detected / Estimated / Creative). */
  truthSection?: EditorVisionTruthSection;
  confidence?: number;
  locked?: boolean;
  taxonomyTab?: string;
  /** User taxonomy — parent category when this node is a sub-group (e.g. Gezicht under Personage). */
  taxonomyParentTab?: string;
  /** Legacy copilot/instruction part group (eyes, outfit, accessories, …). */
  actionPartGroup?: string;
  /** Vision Evidence Audit V2 — why this part was detected / rejected (admin debug). */
  detectionExplanation?: import("@/types/editor-vision-evidence").VisionPartDetectionExplanation;
  children: EditorVisionHierarchyNode[];
};

export type EditorVisionV6LayerSource = {
  layerId: string;
  label: string;
  source: EditorVisionPartSource;
  estimated: boolean;
};

export type EditorAnalysisIsolationScope = {
  assetId: string;
  projectId: string;
  analysisId: string;
  sessionId: string;
  backgroundUrl: string;
};

export type EditorVisionV6Meta = {
  illustrationAnalysis: boolean;
  rtdetrCount: number;
  visionPartCount: number;
  mergedLayerCount: number;
  openAiPartsUsed: boolean;
  layerSources: EditorVisionV6LayerSource[];
  /** Resolved fallback taxonomy type for hierarchy UI tabs. */
  taxonomyType?: "mascot" | "human" | "animal";
  /** Hard isolation — analysis belongs to this asset/project only. */
  isolationScope?: EditorAnalysisIsolationScope;
  /** Vision Evidence Audit V2 — trust score + accessory audit + per-part decisions. */
  evidenceAudit?: import("@/types/editor-vision-evidence").EditorVisionEvidenceAuditMeta;
  /** Persisted merged illustration parts — source of truth for visible parts tree. */
  mergedAnalysisParts?: import("@/types/editor-illustration-parts").IllustrationPartSpec[];
  /** basic = RT-DETR/local only; premium = Vision Parts API + Style DNA completed. */
  analysisTier?: "basic" | "premium";
  premiumAnalysisCompletedAt?: string;
  /** Credit + provider cost summary for the latest premium analysis run. */
  premiumAnalysisBilling?: import("@/lib/editor-premium-vision-credits").PremiumVisionAnalysisBillingLog;
};

export type EditorObjectHierarchy = {
  rootObjectId: string;
  rootLayerId: string;
  rootLabel: string;
  parts: EditorObjectPart[];
};

export type EditorHierarchicalSelectionState = {
  mode: "object" | "part";
  rootObjectId: string | null;
  selectedPartId: string | null;
};

export type EditorPartLibraryAsset = {
  id: string;
  label: string;
  partCategory: EditorPartCategory;
  parentObjectLabel: string;
  parentObjectId: string;
  parentLayerId: string;
  assetType: "part" | "logo" | "cutout";
  cutoutUrl?: string;
  maskUrl?: string;
  maskStorageKey?: string;
  boundingBox: EditorCanvasBounds;
  animationProfile?: EditorPartAnimationProfile;
  createdAt: string;
  extractionMeta?: {
    sourceSessionId: string;
    sourceImageUrl: string;
    sourcePartId?: string;
    sourcePartLabel: string;
    assetType: "character_part" | "prop" | "logo" | "background" | "style_reference";
    extractionQuality: "mask" | "estimated_crop" | "manual";
  };
};

export type EditorStudioMotionHandoff = {
  sessionId: string;
  hierarchies: EditorObjectHierarchy[];
  transforms: Record<string, EditorCanvasTransform>;
  animationProfiles: Record<string, EditorObjectAnimationProfile | EditorPartAnimationProfile>;
  expressions: Record<string, EditorCharacterExpression>;
  partLibraryAssets: EditorPartLibraryAsset[];
  cutoutAssets: EditorCutoutAsset[];
  motionPreparations: EditorMotionPreparation[];
};

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
  /** Controllable sub-parts when object supports part hierarchy. */
  parts?: EditorObjectPart[];
  partCategory?: EditorPartCategory;
  rootObjectId?: string;
  animationProfile?: EditorObjectAnimationProfile;
  expression?: EditorCharacterExpression;
  /** Non-destructive local transform offset for object/part control. */
  localTransform?: EditorCanvasTransform;
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
  maskUrl?: string;
  polygon?: EditorShapePoint[];
  depthHint: number;
  motionRegion: EditorCanvasBounds;
  animationRegion?: EditorCanvasBounds;
  safeAnimationBounds: EditorCanvasBounds;
  ready: boolean;
};

export type EditorCutoutAsset = {
  id: string;
  objectId: string;
  layerId: string;
  label: string;
  cutoutUrl: string;
  maskUrl?: string;
  maskStorageKey?: string;
  polygon?: EditorShapePoint[];
  boundingBox: EditorCanvasBounds;
  createdAt: string;
};

export const EDITOR_MASK_EDIT_JOB_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;

export type EditorMaskEditJobStatus = (typeof EDITOR_MASK_EDIT_JOB_STATUSES)[number];

export type EditorMaskEditJob = {
  id: string;
  layerId: string;
  operation: "remove" | "replace";
  status: EditorMaskEditJobStatus;
  progress: number;
  message?: string;
  resultUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorVisionMetricsSnapshot = {
  detectionCount: number;
  maskCount: number;
  segmentationSuccessRate: number;
  averageSegmentationMs: number;
  openAiEditSuccessRate: number;
  failedObjectEdits: number;
  onnxDetectionCount?: number;
  hybridMergeCount?: number;
  lastDetectionAt?: string | null;
  lastDetectionCount?: number;
  lastInferenceMs?: number | null;
  lastInferenceError?: string | null;
  lastInferenceSource?: "onnx" | "vision" | "hybrid" | null;
  updatedAt: string;
};

export type EditorDetectionMeta = {
  source: "onnx" | "vision" | "hybrid" | "brand_sheet" | "onnx_only" | "heuristic";
  /** Unified detection backbone (Editor Vision V5). */
  backend?: "video-worker" | "local" | "fallback" | "unavailable";
  status?: "active" | "fallback" | "unavailable";
  detectorKind?: string;
  count: number;
  onnxAvailable: boolean;
  bootstrapAttempted?: boolean;
  noObjectsFound?: boolean;
  inferenceMs?: number;
  lastDetectedAt?: string;
  userMessageKey?: string;
};

/** Editor workspace modes — instruction studio is the default product surface. */
export const EDITOR_WORKSPACE_MODES = [
  "instruction_studio",
  "photo_edit",
  "compose",
  "quick_motion",
  "export",
] as const;

export type EditorWorkspaceMode = (typeof EDITOR_WORKSPACE_MODES)[number];

export const EDITOR_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
] as const;

export type EditorBlendMode = (typeof EDITOR_BLEND_MODES)[number];

/** Imported cutout layer dropped from source into target composition. */
export type EditorImportedLayer = {
  id: string;
  label: string;
  sourceAssetId: string | null;
  sourceImageUrl: string;
  sourceStorageKey?: string;
  maskUrl?: string;
  cutoutUrl?: string;
  maskStorageKey?: string;
  transform: EditorCanvasTransform;
  zIndex: number;
  blendMode: EditorBlendMode;
  opacity: number;
  shadow: boolean;
  softEdge: number;
  locked: boolean;
  visible: boolean;
  flippedX: boolean;
  flippedY: boolean;
  matchLighting: boolean;
  matchColor: boolean;
  createdAt: string;
};

export type EditorDualComposerState = {
  sourceImageUrl?: string;
  sourceStorageKey?: string;
  sourceAssetId?: string | null;
  sourceName?: string;
  targetSessionId: string;
  active: boolean;
};

export const EDITOR_QUICK_MOTION_PRESETS = [
  "float",
  "pulse",
  "rotate",
  "bounce",
  "reveal",
  "orbit",
  "wiggle",
  "logo_pop",
  "globe_spin",
] as const;

export type EditorQuickMotionPreset = (typeof EDITOR_QUICK_MOTION_PRESETS)[number];

export const EDITOR_QUICK_MOTION_FORMATS = ["gif", "webp", "mp4"] as const;

export type EditorQuickMotionFormat = (typeof EDITOR_QUICK_MOTION_FORMATS)[number];

export type EditorQuickMotionConfig = {
  preset: EditorQuickMotionPreset;
  format: EditorQuickMotionFormat;
  durationSec: number;
  loop: boolean;
  fps: number;
  width: number;
  height: number;
  transparentBackground: boolean;
  quality: number;
  targetLayerId?: string;
  targetImportedLayerId?: string;
};

export const EDITOR_EXPORT_PROFILES = [
  "motion_ready",
  "production_ready",
  "print_ready",
] as const;

export type EditorExportProfileId = (typeof EDITOR_EXPORT_PROFILES)[number];

export const EDITOR_PRINT_DPI_OPTIONS = [150, 300, 600] as const;

export type EditorPrintDpi = (typeof EDITOR_PRINT_DPI_OPTIONS)[number];

export const EDITOR_PRINT_UNITS = ["px", "cm", "mm", "inch"] as const;

export type EditorPrintUnit = (typeof EDITOR_PRINT_UNITS)[number];

export const EDITOR_PRINT_SIZE_PRESETS = [
  "a4",
  "a3",
  "a2",
  "a1",
  "square_poster",
  "instagram_poster",
  "custom",
] as const;

export type EditorPrintSizePreset = (typeof EDITOR_PRINT_SIZE_PRESETS)[number];

export type EditorPrintExportSettings = {
  dpi: EditorPrintDpi;
  unit: EditorPrintUnit;
  preset: EditorPrintSizePreset;
  width: number;
  height: number;
  bleedMm: number;
  safeMarginMm: number;
  formats: Array<"png" | "jpg" | "pdf" | "svg">;
  retinaScale: 1 | 2 | 3;
};

export type EditorProductionExportSettings = {
  formats: Array<"png" | "jpg" | "webp" | "svg" | "pdf">;
  transparentBackground: boolean;
  retinaScale: 1 | 2 | 3;
  quality: number;
  width: number;
  height: number;
};

export type EditorExportSettings = {
  profile: EditorExportProfileId;
  production?: EditorProductionExportSettings;
  print?: EditorPrintExportSettings;
};

export const EDITOR_LIBRARY_EXPORT_CATEGORIES = [
  "edited_image",
  "composition",
  "cutout",
  "gif",
  "motion_ready",
  "print_ready",
] as const;

export type EditorLibraryExportCategory = (typeof EDITOR_LIBRARY_EXPORT_CATEGORIES)[number];

export type EditorLibraryExportRecord = {
  id: string;
  category: EditorLibraryExportCategory;
  label: string;
  url?: string;
  format?: string;
  profile?: EditorExportProfileId;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type EditorPosterUpscaleStatus = "good" | "acceptable" | "needs_upscale" | "unavailable";

export type EditorPosterUpscaleAssessment = {
  status: EditorPosterUpscaleStatus;
  sourceWidth: number;
  sourceHeight: number;
  requiredWidth: number;
  requiredHeight: number;
  messageKey: string;
  providerAvailable: boolean;
};

/** Editor V6 productivity — quick actions, previews, templates. */
export const EDITOR_V6_QUICK_ACTIONS = [
  "replace",
  "remove",
  "cutout",
  "save",
  "animate",
  "duplicate",
] as const;

export type EditorV6QuickAction = (typeof EDITOR_V6_QUICK_ACTIONS)[number];

export const EDITOR_V6_MOTION_PREVIEW_PRESETS = [
  "float",
  "rotate",
  "pulse",
  "bounce",
  "orbit",
  "reveal",
  "wave",
] as const;

export type EditorV6MotionPreviewPreset = (typeof EDITOR_V6_MOTION_PREVIEW_PRESETS)[number];

export const EDITOR_POSTER_TEMPLATES = [
  "a4",
  "a3",
  "a2",
  "a1",
  "instagram",
  "flyer",
  "menu",
  "event",
  "restaurant",
  "marketplace",
] as const;

export type EditorPosterTemplate = (typeof EDITOR_POSTER_TEMPLATES)[number];

export const EDITOR_SOCIAL_PRESETS = [
  "instagram_post",
  "instagram_story",
  "tiktok_cover",
  "youtube_thumbnail",
  "facebook_post",
  "linkedin_post",
  "x_post",
  "pinterest",
] as const;

export type EditorSocialPreset = (typeof EDITOR_SOCIAL_PRESETS)[number];

export const EDITOR_BRAND_KIT_ITEM_KINDS = [
  "logo",
  "color",
  "font",
  "gradient",
  "background",
  "mascot",
] as const;

export type EditorBrandKitItemKind = (typeof EDITOR_BRAND_KIT_ITEM_KINDS)[number];

export type EditorBrandKitItem = {
  id: string;
  kind: EditorBrandKitItemKind;
  label: string;
  value: string;
  previewUrl?: string;
};

export type EditorMagicReplacePreview = {
  layerId: string;
  prompt?: string;
  replacementImageUrl?: string;
  ready: boolean;
  messageKey: string;
};

export const EDITOR_BACKGROUND_TOOL_IDS = [
  "remove",
  "blur",
  "replace",
  "expand",
  "transparent_export",
  "sky",
  "gradient",
  "brand_background",
] as const;

export type EditorBackgroundToolId = (typeof EDITOR_BACKGROUND_TOOL_IDS)[number];

export const EDITOR_ALIGNMENT_ACTIONS = [
  "center",
  "left",
  "right",
  "top",
  "bottom",
  "distribute_h",
  "distribute_v",
] as const;

export type EditorAlignmentAction = (typeof EDITOR_ALIGNMENT_ACTIONS)[number];

export type EditorV6ProductivityState = {
  motionPreviewPreset?: EditorV6MotionPreviewPreset;
  motionPreviewLayerId?: string;
  posterTemplate?: EditorPosterTemplate;
  socialPreset?: EditorSocialPreset;
  magicReplacePreview?: EditorMagicReplacePreview;
  showAlignmentGuides?: boolean;
};

/** Editor V7 — AI command bar, intent plans, skills, history. */
export const EDITOR_V7_COMMAND_ACTION_TYPES = [
  "detect_object",
  "magic_replace",
  "background_remove",
  "background_tool",
  "remove_object",
  "poster_template",
  "social_preset",
  "motion_ready",
  "quick_motion_gif",
  "print_export",
  "logo_placement",
  "brand_kit",
  "cutout",
  "animate",
  "align",
  "translate_text",
  "improve_composition",
  "preserve_object",
  "studio_story",
  "publish_social",
] as const;

export type EditorV7CommandActionType = (typeof EDITOR_V7_COMMAND_ACTION_TYPES)[number];

export const EDITOR_V7_SKILLS = [
  "restaurant_poster",
  "marketplace_product",
  "motion_ready_asset",
  "logo_placement",
  "background_cleanup",
  "social_media_post",
  "menu_design",
  "print_ready_export",
] as const;

export type EditorV7SkillId = (typeof EDITOR_V7_SKILLS)[number];

export type EditorV7CommandPlanStep = {
  id: string;
  actionType: EditorV7CommandActionType;
  labelKey: string;
  objectLayerId?: string;
  objectLabel?: string;
  params?: Record<string, string>;
  preserveLabels?: string[];
  status: "pending" | "done" | "skipped";
};

export type EditorV7CommandPlan = {
  id: string;
  prompt: string;
  steps: EditorV7CommandPlanStep[];
  skillId?: EditorV7SkillId;
  createdAt: string;
};

export type EditorV7CommandHistoryEntry = {
  id: string;
  prompt: string;
  planId: string;
  appliedAt: string;
  status: "applied" | "undone" | "failed";
};

export type EditorV7ContextualSuggestion = {
  id: string;
  labelKey: string;
  prompt: string;
};

export type EditorV7AssistantState = {
  activePlan?: EditorV7CommandPlan;
  previewMode?: boolean;
  history: EditorV7CommandHistoryEntry[];
  historyCursor: number;
  sidebarCollapsed?: boolean;
};

export type EditorStudioHandoffScore = {
  score: number;
  labelKey: string;
  checks: Array<{ id: string; ok: boolean; labelKey: string }>;
  warnings: Array<{ id: string; labelKey: string }>;
};

export type EditorCanvasDocument = {
  sessionId: string;
  name: string;
  sourceKind: EditorSourceKind;
  sourceAssetId: string | null;
  backgroundUrl: string;
  backgroundStorageKey?: string;
  workflowStep: EditorWorkflowStepId;
  workspaceMode?: EditorWorkspaceMode;
  composerState?: EditorDualComposerState;
  importedLayers?: EditorImportedLayer[];
  quickMotionConfig?: EditorQuickMotionConfig;
  exportSettings?: EditorExportSettings;
  libraryExports?: EditorLibraryExportRecord[];
  objects: EditorCanvasLayer[];
  placements: PlacementCanvasItem[];
  bodyDesigner?: CharacterBodyDesignerParams;
  visionAnalysisHash?: string;
  /** Base image URL used for the last successful vision/detection bootstrap. */
  analyzedBackgroundUrl?: string;
  semanticLayers?: EditorSemanticLayer[];
  layerOperations?: EditorLayerOperationAudit[];
  /** All detected objects from vision/analysis — not only the selected one. */
  detectedObjects?: EditorObject[];
  textLayers?: EditorTextLayer[];
  nonDestructive?: EditorNonDestructiveState;
  history?: EditorHistoryState;
  motionPreparations?: EditorMotionPreparation[];
  cutoutAssets?: EditorCutoutAsset[];
  editJobs?: EditorMaskEditJob[];
  visionMetrics?: EditorVisionMetricsSnapshot;
  detectionMeta?: EditorDetectionMeta;
  /** OpenAI/vision analysis from bootstrap (style, colors, features). */
  visionAnalysis?: import("@/types/studio-asset-vision-analysis").AssetVisionAnalysis;
  /** Part hierarchies keyed by root EditorObject id. */
  objectHierarchies?: Record<string, EditorObjectHierarchy>;
  /** Vision V4 expandable analysis tree (objects, face, clothing, branding, style). */
  visionHierarchy?: EditorVisionHierarchyNode[];
  /** Vision V6 illustration part analysis diagnostics. */
  visionV6Meta?: EditorVisionV6Meta;
  partLibraryAssets?: EditorPartLibraryAsset[];
  hierarchicalSelection?: EditorHierarchicalSelectionState;
  studioMotionHandoff?: EditorStudioMotionHandoff;
  productivityState?: EditorV6ProductivityState;
  assistantState?: EditorV7AssistantState;
  /** Post-upload flow: edit | combine | motion_prepare | export */
  editorFlowMode?: "edit" | "combine" | "motion_prepare" | "export";
  /** Hard asset/project isolation for vision analysis. */
  isolationScope?: EditorAnalysisIsolationScope;
  /** Vision analysis run tracking — prevents flicker / stale hierarchy. */
  visionAnalysisRun?: import("@/lib/editor-vision-analysis-run").EditorVisionAnalysisRunMeta;
  /** local = browser-only; server = opened from cloud; synced = confirmed on server. */
  projectOrigin?: import("@/lib/editor-project-origin").EditorProjectOrigin;
  /** HomeCheff asset intelligence — recommendations, routing, readiness. */
  assetProfile?: import("@/types/editor-asset-profile").EditorAssetProfile;
  /** Instruction studio generated variants — original image is never replaced in-place. */
  instructionVariants?: import("@/types/editor-instruction-studio").EditorInstructionVariant[];
  instructionStudioState?: import("@/types/editor-instruction-studio").EditorInstructionStudioState;
  /** Detected / canonical style attributes (not editable objects) */
  styleAttributes?: import("@/types/editor-instruction-studio").EditorStyleAttributeRecord[];
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
