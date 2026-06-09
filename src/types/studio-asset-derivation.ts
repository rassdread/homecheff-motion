/** Reference-derived asset flow — style DNA + transformation (no schema). */

import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type AssetDerivationSourceType =
  | "library_asset"
  | "upload"
  | "canonical_reference"
  | "generated_reference";

export type AssetDerivationSource = {
  sourceType: AssetDerivationSourceType;
  sourceKind: StudioAssetKind;
  assetId: string | null;
  assetName: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  canonicalRole?: string;
};

export type AssetStyleDna = {
  visualStyle: string;
  colorTheme: string;
  shapeLanguage: string;
  outfitHints: string;
  brandIdentity: string;
  mascotTraits: string;
  confidence: number;
};

export type AssetDerivationPreview = {
  sourceLabel: string;
  targetLabel: string;
  preserves: string[];
  changes: string[];
};

export type AssetDerivationSourceListItem = {
  sourceType: AssetDerivationSourceType;
  kind: StudioAssetKind;
  assetId: string;
  name: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  thumbnailUrl: string;
  canonicalRole?: string;
  identityAssetType?: string;
  isCanonicalCharacterBase?: boolean;
};

export type AssetDerivationRoiSummary = {
  derivedAssetCount: number;
  visionCallCount: number;
  generationCallCount: number;
  acceptedCount: number;
  acceptanceRatePercent: number;
  avgCostUsd: number;
  avgTimeSavedMinutes: number;
  bySourceKind: Record<string, number>;
  byTargetKind: Record<string, number>;
  topSourceAssets: Array<{ assetId: string; name: string; kind: string; derivationCount: number }>;
};
