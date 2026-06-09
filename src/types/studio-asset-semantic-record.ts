/** Canonical semantic record for Studio assets — persisted in existing DB text fields. */

export const ASSET_SEMANTIC_RECORD_VERSION = 1 as const;
export const ASSET_SEMANTIC_MARKER = "[studio:semantic:v1]";

export type AssetSemanticColor = {
  label: string;
  hex?: string;
};

export type AssetSemanticRecord = {
  version: typeof ASSET_SEMANTIC_RECORD_VERSION;
  visionSummary?: string;
  objectType?: string;
  visualStyle?: string;
  shapeDna?: string[];
  brandIdentity?: string;
  primaryColors?: AssetSemanticColor[];
  keyFeatures?: string[];
  preserveRules?: string[];
  changeRules?: string[];
  forbiddenRules?: string[];
  visualKeywords?: string[];
  appearanceMemory?: string;
  continuityNotes?: string;
  referenceIdentity?: string;
  worldContext?: string;
  roleContext?: string;
  updatedAt?: string;
  /** Semantic family grouping — e.g. HomeCheff Mascots */
  assetFamily?: string;
  /** Parent asset in library when derived from existing asset */
  parentAssetId?: string;
  /** Immediate derivation source asset id */
  derivedFromAssetId?: string;
  /** Compact identity fingerprint for variant fidelity */
  identityFingerprint?: import("@/types/studio-asset-identity-preservation").AssetIdentityFingerprint;
  /** Post-generation fidelity score when saved from transform flow */
  variantFidelityOverall?: number;
  /** Human-readable source name when derived from upload/library without asset id */
  sourceReferenceName?: string;
  /** Universal identity profile asset type (character, logo, packaging, …) */
  identityAssetType?: string;
  /** Identity preservation profile level */
  identityProfile?: import("@/types/studio-asset-identity-profile").IdentityProfileLevel;
  /** Human-readable identity importance (flexible, balanced, important, critical) */
  identityImportance?: string;
  /** Animation-ready character construction profile */
  characterConstructionProfile?: import("@/types/studio-asset-animation-readiness").CharacterConstructionProfile;
  /** 0–100 animation readiness score */
  animationReadinessScore?: number;
  /** Selected preparation actions (remove background, standard pose, …) */
  animationPreparationActions?: string[];
};

export type AssetSemanticRecordKind = "character" | "prop" | "location" | "world";
