/** Universal Asset Generation Workbench — structured options, placement & composition. */

export const CHARACTER_STYLE_CARD_IDS = [
  "flat_vector",
  "brand_2_5d",
  "brand_3d_mascot",
  "mobile_game",
  "stylized_cartoon",
  "storybook",
  "custom",
] as const;

export type CharacterStyleCardId = (typeof CHARACTER_STYLE_CARD_IDS)[number];

export type CharacterStyleCardConfig = {
  id: CharacterStyleCardId;
  labelKey: string;
  descriptionKey: string;
  bestForKey: string;
  identityRetentionPercent: number;
  animationFlexibilityPercent: number;
  complexity: "low" | "medium" | "high";
  wireframe: "circle_head" | "rounded_mascot" | "blocky_3d" | "game_sprite" | "storybook" | "custom";
};

export const REFERENCE_PLACEMENT_TYPES = [
  "logo",
  "icon",
  "badge",
  "label",
  "sticker",
  "patch",
  "print",
  "pattern",
  "photo",
  "poster",
] as const;

export type ReferencePlacementType = (typeof REFERENCE_PLACEMENT_TYPES)[number];

export const REFERENCE_PLACEMENT_TARGETS = [
  "chest",
  "back",
  "sleeve",
  "hat_front",
  "apron_center",
  "packaging_front",
  "object_surface",
  "background_poster",
  "custom",
] as const;

export type ReferencePlacementTarget = (typeof REFERENCE_PLACEMENT_TARGETS)[number];

export const REFERENCE_PLACEMENT_SIZES = ["small", "medium", "large", "exact"] as const;
export type ReferencePlacementSize = (typeof REFERENCE_PLACEMENT_SIZES)[number];

export const REFERENCE_PLACEMENT_IMPORTANCE = [
  "optional",
  "best_effort",
  "high_priority",
  "required",
  "exact",
] as const;

export type ReferencePlacementImportance = (typeof REFERENCE_PLACEMENT_IMPORTANCE)[number];

export type ReferencePlacementObjectTarget = {
  objectId: string;
  objectLabel: string;
  objectKind: "character" | "prop" | "packaging" | "clothing" | "background" | "other";
};

export type AssetReferencePlacement = {
  id: string;
  assetId: string | null;
  storageKey: string;
  previewUrl: string;
  sourceName: string;
  placementType: ReferencePlacementType;
  placementTarget: ReferencePlacementTarget;
  placementTargetCustom?: string;
  size: ReferencePlacementSize;
  importance: ReferencePlacementImportance;
  objectTarget?: ReferencePlacementObjectTarget;
  locked?: boolean;
};

export type DynamicAccessoryAction = "keep" | "remove" | "replace" | "identity_marker";

export type DynamicAccessoryItem = {
  id: string;
  label: string;
  source: "keyFeatures" | "accessoryPattern" | "vision" | "semantic";
  action: DynamicAccessoryAction;
  confidence: number;
};

export const SEMANTIC_LAYER_IDS = [
  "character",
  "clothing",
  "placement_assets",
  "environment",
  "background",
  "brand_elements",
] as const;

export type SemanticLayerId = (typeof SEMANTIC_LAYER_IDS)[number];

export type SemanticLayerState = {
  id: SemanticLayerId;
  locked: boolean;
  hidden: boolean;
  replaceable: boolean;
};

export type CompositionGraphNode = {
  id: string;
  label: string;
  kind: "character" | "clothing" | "placement" | "prop" | "packaging" | "background";
  children: CompositionGraphNode[];
  placementId?: string;
};

export type PlacementSuggestion = {
  id: string;
  messageKey: string;
  placementType: ReferencePlacementType;
  suggestedTarget: ReferencePlacementTarget;
  confidence: number;
};

export type AnimationPreparationSuggestion = {
  actionId: string;
  recommended: boolean;
  confidence: number;
  reasonKey: string;
};

export type PlacementQaItem = {
  placementId: string;
  label: string;
  status: "pass" | "warning" | "fail";
  messageKey: string;
};

export type PlacementQaResult = {
  placementAccuracy: number;
  brandAccuracy: number;
  referenceAccuracy: number;
  items: PlacementQaItem[];
};

export const GENERATION_PROGRESS_STEP_IDS = [
  "analyze_source",
  "apply_identity_profile",
  "process_construction",
  "load_placements",
  "build_prompt",
  "generate_image",
  "variant_qa",
  "save_asset",
] as const;

export type GenerationProgressStepId = (typeof GENERATION_PROGRESS_STEP_IDS)[number];
