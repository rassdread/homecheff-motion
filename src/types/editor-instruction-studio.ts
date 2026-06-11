/** Image Instruction Studio V2 — analyze → guide → generate variant. */

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
] as const;

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
};

export const EDITOR_INSTRUCTION_OUTPUT_TARGETS = [
  "social",
  "web",
  "motion",
  "print",
] as const;

export type EditorInstructionOutputTarget = (typeof EDITOR_INSTRUCTION_OUTPUT_TARGETS)[number];

export const EDITOR_INSTRUCTION_PRINT_PRESETS = [
  "a4",
  "a5",
  "a3",
  "poster",
  "flyer",
  "sticker",
  "label",
  "menu_card",
  "packaging_mockup",
] as const;

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
  customPrompt?: string;
  sliders: EditorInstructionSliders;
  preserveCharacter?: boolean;
  logoReferenceId?: string;
  styleReferenceId?: string;
  productReferenceId?: string;
  brandingPlacementHint?: string;
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
  /** Multi-step edits queued before variant generation */
  changePlan?: EditorInstructionChangePlanItem[];
  /** AI reference composition plan */
  compositionPlan?: EditorCompositionPlan;
  /** AI Director natural-language input */
  directorPrompt?: string;
  outputTarget?: EditorInstructionOutputTarget;
  workflow?: EditorWorkflowOrchestrationState;
  brandReferences?: BrandReferenceAsset[];
  styleReference?: EditorInstructionReference | null;
  productReference?: EditorInstructionReference | null;
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
