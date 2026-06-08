import {
  applyAssetLibraryPreferences,
  applyAssetLibraryFilters,
  matchesAssetLibraryTab,
  type AssetLibraryTab,
} from "@/lib/studio-asset-library-filters";
import type { StudioAssetLibraryCounts, StudioSavedEntityCounts } from "@/types/studio-asset-library-counts";
import type { StudioAsset } from "@/types/studio-media-asset";

const LIBRARY_TABS: AssetLibraryTab[] = [
  "all",
  "favorites",
  "recent",
  "character",
  "prop",
  "location",
  "world",
  "reference_image",
  "generated",
  "derived",
  "voice",
  "music",
  "sound",
];

/** Wizard blob reference not yet accepted onto a saved entity. */
export function isBlobGeneratedReferenceAsset(asset: StudioAsset): boolean {
  return asset.id.startsWith("reference_image:gen_");
}

/** Reference image or mouth asset saved on a character/prop/location entity. */
export function isAcceptedReferenceAsset(asset: StudioAsset): boolean {
  if (asset.category !== "reference_image" && asset.category !== "mouth_asset") {
    return false;
  }
  return !isBlobGeneratedReferenceAsset(asset);
}

export function isUserOwnedRegistryAsset(asset: StudioAsset, userId: string): boolean {
  return asset.owner === userId;
}

export function isSystemOwnedRegistryAsset(asset: StudioAsset): boolean {
  return asset.owner === "system";
}

export function computeStudioAssetLibraryCounts(
  registry: StudioAsset[],
  params: {
    userId: string;
    favoriteIds?: string[];
    recentAssetIds?: string[];
    savedEntities?: Omit<StudioSavedEntityCounts, "total">;
  }
): StudioAssetLibraryCounts {
  const favoriteIds = params.favoriteIds ?? [];
  const recentAssetIds = params.recentAssetIds ?? [];
  const withPrefs = applyAssetLibraryPreferences(registry, { favoriteIds, recentAssetIds });

  const byTab = {} as Record<AssetLibraryTab, number>;
  for (const tab of LIBRARY_TABS) {
    byTab[tab] = applyAssetLibraryFilters(withPrefs, {
      tab,
      collectionId: "",
      originFilter: "all",
      query: "",
      sort: "updated_desc",
      favoriteIds,
      recentAssetIds,
    }).length;
  }

  const savedEntitiesInput = params.savedEntities ?? {
    characters: 0,
    props: 0,
    locations: 0,
    worlds: 0,
  };
  const savedEntities: StudioSavedEntityCounts = {
    ...savedEntitiesInput,
    total:
      savedEntitiesInput.characters +
      savedEntitiesInput.props +
      savedEntitiesInput.locations +
      savedEntitiesInput.worlds,
  };

  return {
    all: withPrefs.filter((a) => matchesAssetLibraryTab(a, "all")).length,
    userOwned: withPrefs.filter((a) => isUserOwnedRegistryAsset(a, params.userId)).length,
    systemOwned: withPrefs.filter((a) => isSystemOwnedRegistryAsset(a)).length,
    generatedOnly: withPrefs.filter((a) => a.origin === "generated" && isBlobGeneratedReferenceAsset(a)).length,
    derivedOnly: withPrefs.filter((a) => a.origin === "derived" && isBlobGeneratedReferenceAsset(a)).length,
    acceptedReferences: withPrefs.filter((a) => isAcceptedReferenceAsset(a)).length,
    drafts: withPrefs.filter((a) => a.status === "draft").length,
    savedEntities,
    byTab,
  };
}
