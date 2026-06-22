/** Image Instruction Studio V2 — analyze → guide → generate variant. */

import type { EditorTransformationSession } from "@/types/editor-generation-access";

export const EDITOR_INSTRUCTION_OBJECT_CATEGORIES = [
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
] as const;

export type EditorInstructionObjectCategory = (typeof EDITOR_INSTRUCTION_OBJECT_CATEGORIES)[number];

export const EDITOR_INSTRUCTION_DYNAMIC_ACTIONS = [
  "add_logo",
  "replace_logo",
  "change_color",
  "change_material",
  "remove",
  "redesign_packaging",
  "premium_packaging",
  "eco_packaging",
  "rewrite",
  "translate",
  "replace",
  "blur",
  "transparent",
  "change_clothing",
  "change_expression",
  "change_pose",
  "add_item",
  "remove_item",
  "enlarge_logo",
  "move_logo",
  "remove_logo",
  "change_style",
  "change_background",
  "duplicate",
  "detach_asset",
  "protect_part",
  "refine_selection",
  "accessory_add",
] as const;

export const EDITOR_ACCESSORY_TYPES = [
  "hat",
  "pet",
  "beanie",
  "sunglasses",
  "glasses",
  "headphones",
  "necklace",
  "jewelry",
  "custom",
] as const;

export type EditorAccessoryType = (typeof EDITOR_ACCESSORY_TYPES)[number];

export type EditorInstructionDynamicAction = (typeof EDITOR_INSTRUCTION_DYNAMIC_ACTIONS)[number];

/** @deprecated V1 object ids — use EditorInstructionObjectV2.category */
export const EDITOR_INSTRUCTION_OBJECT_IDS = [
  "character",
  "person",
  "mascot",
  "object",
  "globe",
  "logo",
  "text",
  "background",
  "style",
] as const;

export type EditorInstructionObjectId = (typeof EDITOR_INSTRUCTION_OBJECT_IDS)[number];

/** @deprecated V1 actions — use EditorInstructionDynamicAction */
export const EDITOR_INSTRUCTION_ACTIONS = [
  "remove",
  "replace",
  "change_color",
  "change_style",
  "change_background",
  "duplicate",
  "detach_asset",
] as const;

export type EditorInstructionAction = (typeof EDITOR_INSTRUCTION_ACTIONS)[number];

export const EDITOR_INSTRUCTION_OBJECT_SOURCES = [
  "instructionObjects",
  "assetProfile",
  "detectedObjects",
  "objects",
  "semanticLayers",
  "heuristic",
  "fallback",
] as const;

export type EditorInstructionObjectSource = (typeof EDITOR_INSTRUCTION_OBJECT_SOURCES)[number];

export type EditorInstructionObjectFeedMeta = {
  source: EditorInstructionObjectSource | "mixed";
  /** Cleaned editable object count (user-facing) */
  count: number;
  /** Style trait count */
  traitCount: number;
  /** Raw candidates before cleanup (admin debug) */
  rawCount: number;
  lowConfidence: boolean;
  sourcesUsed: EditorInstructionObjectSource[];
};

export type EditorInstructionObjectBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** true when bounds come from detected layer geometry */
  exact: boolean;
};

/** Structured protection contract for every edit request */
export type EditorEditProtectionPlan = {
  targetParts: string[];
  protectedParts: string[];
  lockedIdentityFeatures: string[];
  lockedBackground: boolean;
  lockedStyle: string[];
  protectedRegionBounds?: Array<{ label: string; bounds: EditorInstructionObjectBounds }>;
  targetRegionBounds?: Array<{ label: string; bounds: EditorInstructionObjectBounds }>;
};

export type EditorInstructionVariantPrecisionVerification = {
  status: "pass" | "low_precision";
  protectedRegionsChecked: number;
  protectedRegionsChanged: number;
  changedRegionLabels?: string[];
  checkedAt: string;
};

export type EditorInstructionStyleTrait = {
  id: string;
  label: string;
  source?: EditorInstructionObjectSource;
};

export type EditorInstructionObjectV2 = {
  id: string;
  label: string;
  category: EditorInstructionObjectCategory;
  confidence: number;
  description: string;
  suggestedActions: EditorInstructionDynamicAction[];
  layerId?: string;
  source?: EditorInstructionObjectSource;
  /** Analysis traits grouped onto this object (prompt metadata, not dropdown entries) */
  traits?: string[];
  bounds?: EditorInstructionObjectBounds;
};

export type EditorInstructionChangePlanItemStatus = "pending" | "applied" | "skipped";

export type EditorInstructionChangePlanItem = {
  entryType?: "object";
  id: string;
  objectId: string;
  objectLabel: string;
  objectCategory: EditorInstructionObjectCategory;
  action: EditorInstructionDynamicAction;
  instruction: string;
  replacement?: string;
  color?: string;
  customPrompt?: string;
  logoReferenceId?: string;
  styleReferenceId?: string;
  productReferenceId?: string;
  brandingPlacementHint?: string;
  strength: number;
  preserveStyle: number;
  preserveBrand: number;
  order: number;
  status: EditorInstructionChangePlanItemStatus;
  targetPartId?: string;
  targetLayerId?: string;
  estimatedCostCredits?: number;
  extractionQuality?: "mask" | "estimated_crop" | "manual";
  accessoryType?: EditorAccessoryType;
  /** Normalized edit region for the target part */
  targetBounds?: EditorInstructionObjectBounds;
  targetSource?: EditorInstructionObjectSource;
  /** Human-readable change request without protection context */
  requestedChange?: string;
  /** Parts that must not change when targetOnly is enabled */
  lockedParts?: string[];
  /** Subset of locked parts shown in UI */
  protectedParts?: string[];
  negativePrompt?: string;
  /** When true (default), only the selected part may change */
  targetOnly?: boolean;
  /** Full protection contract for this edit */
  protectionPlan?: EditorEditProtectionPlan;
};

export const EDITOR_STYLE_ATTRIBUTES = [
  "head_shape",
  "body_proportions",
  "facial_style",
  "outline_style",
  "color_palette",
  "brand_colors",
  "illustration_style",
  "silhouette",
  "visual_identity",
  "identity_markers",
  "line_weight",
] as const;

export type EditorStyleAttribute = (typeof EDITOR_STYLE_ATTRIBUTES)[number];

export const CHARACTER_OBJECT_PARTS = [
  "face",
  "eyes",
  "mouth",
  "hair",
  "head",
  "jacket",
  "shirt",
  "tie",
  "pants",
  "shoes",
  "hands",
  "held_object",
  "background",
] as const;

export type CharacterObjectPart = (typeof CHARACTER_OBJECT_PARTS)[number];

export type EditorStyleAttributeRecord = {
  id: string;
  attribute: EditorStyleAttribute;
  label: string;
  confidence: number;
  source?: EditorInstructionObjectSource;
  detectedFromAnalysis?: boolean;
};

export type EditorInstructionStyleChangePlanItem = {
  entryType: "style";
  id: string;
  styleAttribute: EditorStyleAttribute;
  action: string;
  instruction: string;
  strength: number;
  preserveStyle: boolean;
  preserveBrand: boolean;
  order: number;
  status: EditorInstructionChangePlanItemStatus;
};

export type EditorInstructionChangePlanEntry =
  | EditorInstructionChangePlanItem
  | EditorInstructionStyleChangePlanItem;

export function isStyleChangePlanEntry(
  entry: EditorInstructionChangePlanEntry
): entry is EditorInstructionStyleChangePlanItem {
  return entry.entryType === "style";
}

export function isObjectChangePlanEntry(
  entry: EditorInstructionChangePlanEntry
): entry is EditorInstructionChangePlanItem {
  return entry.entryType !== "style";
}

export const EDITOR_INSTRUCTION_OUTPUT_TARGETS = [
  "social",
  "web",
  "motion",
  "print",
] as const;

export type EditorInstructionOutputTarget = (typeof EDITOR_INSTRUCTION_OUTPUT_TARGETS)[number];

export const EDITOR_INSTRUCTION_PRINT_PRESETS = [
  "a5",
  "a4",
  "a3",
  "a2",
  "a1",
  "a0",
  "poster",
  "flyer",
  "sticker",
  "label",
  "menu_card",
  "packaging_mockup",
  "large_70x100",
  "large_100x150",
  "large_120x180",
  "custom",
] as const;

export const EDITOR_FUSION_INTENT_CATEGORIES = [
  "people_characters",
  "animals",
  "products_brands",
  "marketing_content",
  "future_identity",
] as const;

export type EditorFusionIntentCategory = (typeof EDITOR_FUSION_INTENT_CATEGORIES)[number];

export const EDITOR_FUSION_PRESERVATION_RULES = [
  "face",
  "hair",
  "hairstyle",
  "expression",
  "identity",
  "body_proportions",
  "body",
  "pose",
  "brand_colors",
  "logo",
  "illustration_style",
  "skin_tone",
  "distinctive_features",
  "brand_identity",
  "clothing",
  "product_shape",
  "building_structure",
] as const;

export type EditorFusionPreservationRule = (typeof EDITOR_FUSION_PRESERVATION_RULES)[number];

export const EDITOR_FUSION_PRESERVATION_STRENGTHS = ["low", "medium", "high", "strict"] as const;

export type EditorFusionPreservationStrength = (typeof EDITOR_FUSION_PRESERVATION_STRENGTHS)[number];

export type EditorFusionInheritedTrait = {
  id: string;
  label: string;
  group?: string;
  sourceReferenceId?: string;
  enabled: boolean;
};

export type EditorFusionPreservationSettings = {
  rules: EditorFusionPreservationRule[];
  strength: EditorFusionPreservationStrength;
  toggles: Partial<Record<EditorFusionPreservationRule, boolean>>;
};

export type EditorFusionGenerationSettings = Record<
  string,
  number | string | boolean | number[] | string[] | undefined
>;

export const EDITOR_FUSION_INTENTS = [
  "outfit_from_reference",
  "character_fusion",
  "character_upgrade",
  "human_into_mascot",
  "mascot_into_human",
  "animal_fusion",
  "animal_human_fusion",
  "pet_customization",
  "fantasy_creature",
  "product_branding",
  "product_packaging",
  "product_environment",
  "product_family",
  "ad_composition",
  "social_media_visual",
  "poster_composition",
  "campaign_variant",
  "how_will_i_look",
  "life_timeline",
  "genetic_blend",
  "future_child",
  "future_professions",
  "future_home",
  "person_outfit",
  "person_background",
  "multiple_references",
  "custom_composition",
] as const;

export type EditorFusionIntent = (typeof EDITOR_FUSION_INTENTS)[number];

/** @deprecated Use EditorFusionIntent */
export type EditorCombineIntent = EditorFusionIntent;

export const EDITOR_COMBINE_INTENTS = EDITOR_FUSION_INTENTS;

export type EditorInstructionPrintPreset = (typeof EDITOR_INSTRUCTION_PRINT_PRESETS)[number];

export type EditorInstructionPrintExportRecord = {
  id: string;
  variantId: string;
  preset: EditorInstructionPrintPreset;
  widthPx: number;
  heightPx: number;
  dpi: number;
  bleedMm: number;
  safeMarginMm: number;
  exportUrl?: string;
  format: "png" | "pdf" | "tiff";
  warnings: string[];
  qualityScore: number;
  createdAt: string;
};

export type EditorInstructionSliders = {
  preserveStyle: number;
  changeStrength: number;
  brandPreservation: number;
  creativity: number;
};

export const DEFAULT_EDITOR_INSTRUCTION_SLIDERS: EditorInstructionSliders = {
  preserveStyle: 80,
  changeStrength: 55,
  brandPreservation: 85,
  creativity: 35,
};

export type BrandReferenceAsset = {
  id: string;
  name: string;
  url: string;
  transparentBackground: boolean;
  uploadedAt: string;
};

export const EDITOR_INSTRUCTION_REFERENCE_TYPES = [
  "SOURCE_IMAGE",
  "LOGO_REFERENCE",
  "STYLE_REFERENCE",
  "PRODUCT_REFERENCE",
] as const;

export type EditorInstructionReferenceType = (typeof EDITOR_INSTRUCTION_REFERENCE_TYPES)[number];

export type EditorInstructionReference = {
  type: EditorInstructionReferenceType;
  assetId: string;
  url: string;
  label?: string;
};

export type EditorInstructionSelection = {
  objectKey: string;
  objectLabel: string;
  category: EditorInstructionObjectCategory;
  action: EditorInstructionDynamicAction;
  replacement?: string;
  color?: string;
  customPrompt?: string;
  sliders: EditorInstructionSliders;
  preserveCharacter?: boolean;
  logoReferenceId?: string;
  styleReferenceId?: string;
  productReferenceId?: string;
  brandingPlacementHint?: string;
  targetPartId?: string;
  targetLayerId?: string;
  estimatedSelection?: boolean;
  accessoryType?: EditorAccessoryType;
};

export type EditorInstructionVariantGenerationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type EditorInstructionVariantApproval = "draft" | "approved" | "archived";

export type EditorInstructionVariant = {
  id: string;
  name?: string;
  sourceImageUrl: string;
  sourceImageId: string;
  parentVariantId?: string | null;
  resultUrl?: string;
  resultStorageKey?: string;
  instruction: EditorInstructionSelection;
  /** Full multi-step plan when variant was generated from a change plan */
  changePlan?: EditorInstructionChangePlanItem[];
  references?: EditorInstructionReference[];
  prompt: string;
  provider?: string;
  model?: string;
  costEstimateUsd?: number;
  status: EditorInstructionVariantGenerationStatus;
  approvalStatus: EditorInstructionVariantApproval;
  userNote?: string;
  versionNote?: string;
  presetId?: string;
  outputTarget?: EditorInstructionOutputTarget;
  printExports?: EditorInstructionPrintExportRecord[];
  variantType?: "instruction" | "combined" | "change_plan";
  compositionPlanId?: string;
  referenceIds?: string[];
  createdAt: string;
  updatedAt: string;
  error?: string;
  /** Post-generation precision flag when protected regions may have changed */
  precisionWarning?: "low_precision" | "possible_drift";
  /** Client-side region verification after generation */
  precisionVerification?: EditorInstructionVariantPrecisionVerification;
  /** Protection contract snapshot used for this variant */
  protectionPlan?: EditorEditProtectionPlan;
};

export type EditorInstructionHandoffMeta = {
  variantId?: string;
  activeVariantUrl: string;
  instructionUsed?: string;
  versionNote?: string;
  createdAt?: string;
  usesOriginal: boolean;
  changePlan?: EditorInstructionChangePlanItem[];
  compositionPlanId?: string;
};

export const EDITOR_COMPOSITION_REFERENCE_TYPES = [
  "character",
  "logo",
  "product",
  "packaging",
  "style",
  "color",
  "background",
  "brand",
] as const;

export type EditorCompositionReferenceType = (typeof EDITOR_COMPOSITION_REFERENCE_TYPES)[number];

export const EDITOR_COMPOSITION_TARGET_ROLES = [
  "character",
  "logo",
  "product",
  "packaging",
  "style",
  "color_palette",
  "background",
  "brand",
  "text",
  "object",
  "environment",
] as const;

export type EditorCompositionTargetRole = (typeof EDITOR_COMPOSITION_TARGET_ROLES)[number];

export type EditorCompositionReference = {
  id: string;
  type: EditorCompositionReferenceType;
  name: string;
  url: string;
  uploadedAt: string;
  editableObjectLabels?: string[];
  styleTraitLabels?: string[];
};

export type EditorCompositionPlanItem = {
  id: string;
  targetRole: EditorCompositionTargetRole;
  sourceReferenceId: string;
  sourceImageUrl: string;
  sourceObjectId?: string;
  sourceObjectLabel: string;
  sourceObjectCategory?: EditorInstructionObjectCategory;
  instruction?: string;
  preserveRules: string[];
  priority: number;
  order: number;
};

export type EditorCompositionPlan = {
  id: string;
  baseImageUrl: string;
  baseVariantId?: string | null;
  items: EditorCompositionPlanItem[];
  references: EditorCompositionReference[];
  userNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorFusionPlan = {
  id: string;
  intent: EditorFusionIntent;
  category: EditorFusionIntentCategory;
  fusionStrength: number;
  preservation: EditorFusionPreservationSettings;
  inheritedTraits: EditorFusionInheritedTrait[];
  styleRules: string[];
  brandRules: string[];
  userInstructions: string;
  simulationDisclaimer?: string;
  generationSettings: EditorFusionGenerationSettings;
  baseImageUrl: string;
  baseVariantId?: string | null;
  references: EditorCompositionReference[];
  items: EditorCompositionPlanItem[];
  createdAt: string;
  updatedAt: string;
};

export const EDITOR_WORKFLOW_STAGES = [
  "analyze",
  "plan",
  "generate",
  "approve",
  "deliver",
] as const;

export type EditorWorkflowStage = (typeof EDITOR_WORKFLOW_STAGES)[number];

export type EditorWorkflowStageStatus = "pending" | "current" | "complete" | "blocked";

export const EDITOR_WORKSPACE_INTENTS = [
  "edit",
  "combine",
  "motion",
  "export",
] as const;

export type EditorWorkspaceIntent = (typeof EDITOR_WORKSPACE_INTENTS)[number];

export const EDITOR_IMAGE_PHASES = [
  "analyze",
  "parts",
  "edit",
  "style",
  "colors",
  "director",
  "variants",
  "versions",
  "approve",
] as const;

export type EditorImagePhase = (typeof EDITOR_IMAGE_PHASES)[number];

export type EditorWorkflowOrchestrationState = {
  intent: EditorWorkspaceIntent;
  activeStage: EditorWorkflowStage;
};

export type EditorInstructionStudioState = {
  /** Approved variant used for Studio/Motion — not auto-set on generate */
  activeVariantId?: string | null;
  /** UI preview selection (may be draft) */
  previewVariantId?: string | null;
  selection?: Partial<EditorInstructionSelection>;
  /** Explicit object feed override — highest priority for instruction UI */
  instructionObjects?: EditorInstructionObjectV2[];
  /** Unified object + style change plan */
  changePlan?: EditorInstructionChangePlanEntry[];
  /** AI reference composition plan */
  compositionPlan?: EditorCompositionPlan;
  /** Structured Image Fusion plan — source of truth for combine/fusion workflows */
  fusionPlan?: EditorFusionPlan;
  /** Combine / fusion workflow intent chosen before upload */
  combineIntent?: EditorFusionIntent;
  /** Last explicit creator preset chosen in Instruction Studio */
  selectedCreatorPresetId?: EditorCreatorPresetId;
  /** AI Director natural-language input */
  directorPrompt?: string;
  /** Image-editing workspace phase (Photoshop/Canva-first flow) */
  activeImagePhase?: EditorImagePhase;
  outputTarget?: EditorInstructionOutputTarget;
  workflow?: EditorWorkflowOrchestrationState;
  brandReferences?: BrandReferenceAsset[];
  styleReference?: EditorInstructionReference | null;
  productReference?: EditorInstructionReference | null;
  transformationSession?: EditorTransformationSession;
  /** Standardized post-generation asset package */
  generationPackage?: import("@/types/editor-generation-package").EditorGenerationPackage;
  /** Master HomeCheff .hc project container id */
  hcProjectId?: string;
  /** When true (default), variant generation edits only the selected part */
  targetOnlyEdit?: boolean;
  /** Next generation uses maximum part protection */
  strongerProtection?: boolean;
  /** Opens legacy dual-composer workspace for advanced fusion */
  advancedFusionCompose?: boolean;
  /** Universal reference role intake metadata from start flow */
  referenceIntake?: {
    roleAssignments?: Array<{
      roleId: string;
      role: string;
      instanceId?: string;
      instanceCount?: number;
      url?: string;
      name?: string;
      friendlyName?: string;
      metadata?: import("@/types/editor-reference-metadata").EditorReferenceMetadata;
    }>;
    outputMode?: "single" | "variations" | "sequence";
    stepCount?: number;
    variationCount?: number;
    motionHandoff?: boolean;
    motionDurationSec?: number;
    motionMetadata?: Record<string, string>;
  };
  /** Fusion Intelligence Layer — blueprint + render payload built from premium analysis. */
  fusionIntelligence?: import("@/types/editor-fusion-intelligence").FusionIntelligenceState;
};

export type EditorCreatorPresetId = "chef" | "garden" | "designer";

export type EditorCreatorPreset = {
  id: EditorCreatorPresetId;
  labelKey: string;
  descriptionKey: string;
  variants: Array<{
    id: string;
    labelKey: string;
    promptSuffix: string;
    action?: EditorInstructionDynamicAction;
  }>;
};
