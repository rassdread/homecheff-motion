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
};

export type AssetSemanticRecordKind = "character" | "prop" | "location" | "world";
