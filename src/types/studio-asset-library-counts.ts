import type { AssetLibraryTab } from "@/lib/studio-asset-library-filters";

/** Saved Prisma entity rows (one row per character/prop/location/world). */
export type StudioSavedEntityCounts = {
  characters: number;
  props: number;
  locations: number;
  worlds: number;
  total: number;
};

/**
 * Single source of truth for asset library totals — matches
 * `/studio/assets` registry + default filters (tab=all, no search/collection).
 */
export type StudioAssetLibraryCounts = {
  /** Registry rows visible in library (user-owned + system catalog). */
  all: number;
  userOwned: number;
  systemOwned: number;
  /** Blob history entries with origin=generated (not yet saved to an entity). */
  generatedOnly: number;
  /** Blob history entries with origin=derived (not yet saved to an entity). */
  derivedOnly: number;
  /** Reference/mouth assets linked to saved entities (accepted official refs). */
  acceptedReferences: number;
  /** Registry rows with status=draft (wizard drafts are client-only, not counted). */
  drafts: number;
  savedEntities: StudioSavedEntityCounts;
  byTab: Record<AssetLibraryTab, number>;
};
