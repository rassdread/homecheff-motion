/** Universal reference-image vision analysis for asset wizard & derivation. */

export type AssetVisionObjectType =
  | "character"
  | "mascot"
  | "human"
  | "animal"
  | "food_item"
  | "product"
  | "packaging"
  | "vehicle"
  | "tool"
  | "building"
  | "location"
  | "environment"
  | "logo"
  | "brand_asset"
  | "illustration"
  | "ui_asset"
  | "unknown";

export type AssetVisionColorRole = "primary" | "secondary" | "accent" | "other";

export type AssetVisionColor = {
  label: string;
  hex?: string;
  role?: AssetVisionColorRole;
};

/** Raw JSON shape returned by OpenAI Vision for asset references. */
export type AssetReferenceVisionJson = {
  objectType?: string;
  visualStyle?: string;
  colors?: Array<{ label?: string; hex?: string; role?: string }>;
  shapeLanguage?: string[] | string;
  keyFeatures?: string[] | string;
  brandIdentity?: string;
  materialHints?: string;
  environmentHints?: string;
  architectureHints?: string;
  moodHints?: string;
  logoSymbolism?: string;
  suggestedPreserve?: string[] | string;
  suggestedChange?: string[] | string;
  suggestedForbidden?: string[] | string;
  confidence?: number;
  safetyNotes?: string[] | string;
  assetFamily?: string;
  characterLineage?: string;
  brandRecognitionConfidence?: number;
  faceStructure?: string;
  outlineStyle?: string;
  proportions?: string;
  silhouette?: string;
  accessoryPattern?: string;
};

export type AssetVisionAnalysis = {
  objectType: AssetVisionObjectType;
  objectTypeLabel: string;
  visualStyle: string;
  colors: AssetVisionColor[];
  shapeLanguage: string[];
  keyFeatures: string[];
  brandIdentity: string;
  materialHints: string;
  environmentHints: string;
  suggestedPreserve: string[];
  suggestedChange: string[];
  suggestedForbidden: string[];
  confidence: number;
  safetyNotes: string[];
  /** e.g. HomeCheff Mascots */
  assetFamily: string;
  /** e.g. Primary Mascot, Brand Variant */
  characterLineage: string;
  brandRecognitionConfidence: number;
  identityFingerprint: import("@/types/studio-asset-identity-preservation").AssetIdentityFingerprint;
};
