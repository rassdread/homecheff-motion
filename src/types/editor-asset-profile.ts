import type { EditorLibraryExportCategory } from "@/types/homecheff-visual-editor";

export const EDITOR_ASSET_TYPES = [
  "character",
  "mascot",
  "logo",
  "product",
  "food",
  "plant",
  "garden_asset",
  "poster",
  "flyer",
  "photo",
  "scene",
  "background",
  "object_collection",
  "text_design",
  "motion_asset",
  "brand_asset",
] as const;

export type EditorAssetType = (typeof EDITOR_ASSET_TYPES)[number];

export type EditorAssetRecommendationId =
  | "motion_ready"
  | "make_transparent"
  | "add_to_studio"
  | "save_as_mascot"
  | "add_to_brand_kit"
  | "transparent_logo"
  | "use_in_motion"
  | "print_export"
  | "social_export"
  | "duplicate_format"
  | "marketplace_listing"
  | "restaurant_poster"
  | "social_content"
  | "save_to_library"
  | "remove_background"
  | "create_cutout"
  | "add_homecheff_logo";

export type EditorAssetRecommendation = {
  id: EditorAssetRecommendationId;
  labelKey: string;
  reasonKey: string;
  prompt?: string;
};

export type EditorEcosystemDestination =
  | "brand_kit"
  | "library_characters"
  | "library_logos"
  | "motion_assets"
  | "print_assets"
  | "marketplace_assets"
  | "studio_assets"
  | "library_food"
  | "library_garden"
  | "library_design"
  | "library_motion"
  | "library_posters";

export type EditorMotionReadinessReport = {
  score: number;
  labelKey: string;
  explanations: string[];
  checks: Array<{ labelKey: string; ok: boolean }>;
};

export type EditorStudioReadinessReport = {
  score: number;
  labelKey: string;
  usages: Array<{ labelKey: string; fit: "good" | "partial" | "low" }>;
  recommendedUsageKey: string;
};

export type EditorLibraryIntelligence = {
  autoCategory: EditorLibraryExportCategory;
  sectionKey: string;
  destination: EditorEcosystemDestination;
};

export type EditorAssetVariantPreset = {
  id: string;
  labelKey: string;
};

export type EditorAssetVariantGroup = {
  groupId: string;
  baseLabel: string;
  variants: EditorAssetVariantPreset[];
};

export type StudioAssetIntentKind =
  | "character"
  | "location"
  | "scene"
  | "world"
  | "prop"
  | "brand_element";

export type StudioAssetIntent = {
  kind: StudioAssetIntentKind;
  labelKey: string;
  referenceUrls: string[];
  editorSessionId: string;
};

export type EditorAssetProfile = {
  assetType: EditorAssetType;
  confidence: number;
  humanSummaryKey: string;
  recommendedActions: EditorAssetRecommendation[];
  recommendedExports: Array<"png" | "jpg" | "webp" | "print" | "motion_manifest">;
  recommendedStudioUse: EditorStudioReadinessReport;
  recommendedMotionUse: EditorMotionReadinessReport;
  recommendedDestination: EditorEcosystemDestination;
  libraryIntelligence: EditorLibraryIntelligence;
  variantGroup?: EditorAssetVariantGroup;
  studioIntent: StudioAssetIntent;
  analyzedAt: string;
};
