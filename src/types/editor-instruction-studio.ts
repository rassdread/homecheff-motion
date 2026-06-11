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
  /** Cleaned user-facing object count */
  count: number;
  /** Raw candidates before cleanup (admin debug) */
  rawCount: number;
  lowConfidence: boolean;
  sourcesUsed: EditorInstructionObjectSource[];
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
  /** Analysis traits grouped onto this object (e.g. body proportions on Character) */
  traits?: string[];
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
};

export type EditorInstructionStudioState = {
  /** Approved variant used for Studio/Motion — not auto-set on generate */
  activeVariantId?: string | null;
  /** UI preview selection (may be draft) */
  previewVariantId?: string | null;
  selection?: Partial<EditorInstructionSelection>;
  /** Explicit object feed override — highest priority for instruction UI */
  instructionObjects?: EditorInstructionObjectV2[];
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
