import type { StudioAsset, StudioAssetCategory, StudioAssetOrigin } from "@/types/studio-media-asset";

export type AssetLibraryViewMode = "grid" | "list";

export type AssetLibrarySort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc" | "recent";

export type AssetLibraryOriginFilter = "all" | StudioAssetOrigin;

export type AssetLibraryTab =
  | "all"
  | "character"
  | "location"
  | "prop"
  | "world"
  | "reference_image"
  | "voice"
  | "music"
  | "sound"
  | "brand_asset"
  | "generated"
  | "derived"
  | "favorites"
  | "recent";

export const ASSET_LIBRARY_USER_COLLECTIONS = [
  { id: "favorites", labelKey: "studio.mediaAsset.collection.favorites" },
  { id: "recent", labelKey: "studio.mediaAsset.collection.recent" },
  { id: "generated", labelKey: "studio.mediaAsset.collection.generated" },
  { id: "uploaded", labelKey: "studio.mediaAsset.collection.uploaded" },
  { id: "derived", labelKey: "studio.mediaAsset.collection.derived" },
] as const;

export function matchesAssetLibraryTab(asset: StudioAsset, tab: AssetLibraryTab): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "favorites") {
    return Boolean(asset.isFavorite);
  }
  if (tab === "recent") {
    return Boolean(asset.lastUsedAt);
  }
  if (tab === "generated") {
    return asset.origin === "generated";
  }
  if (tab === "derived") {
    return asset.origin === "derived";
  }
  if (tab === "world") {
    return asset.sourceRef.entityType === "world";
  }
  if (tab === "sound") {
    return asset.category === "ambience" || asset.category === "sound_effect" || asset.category === "mouth_asset";
  }
  if (tab === "reference_image") {
    return asset.category === "reference_image" || asset.category === "mouth_asset";
  }
  return asset.category === tab;
}

export function filterAssetsByOrigin(
  assets: StudioAsset[],
  origin: AssetLibraryOriginFilter
): StudioAsset[] {
  if (origin === "all") {
    return assets;
  }
  return assets.filter((a) => a.origin === origin);
}

export function filterAssetsByCollectionPreset(
  assets: StudioAsset[],
  collectionId: string,
  favoriteIds: Set<string>,
  recentIds: Set<string>
): StudioAsset[] {
  if (!collectionId) {
    return assets;
  }
  if (collectionId === "favorites") {
    return assets.filter((a) => favoriteIds.has(a.id) || a.isFavorite);
  }
  if (collectionId === "recent") {
    return assets.filter((a) => recentIds.has(a.id) || a.lastUsedAt);
  }
  if (collectionId === "generated") {
    return assets.filter((a) => a.origin === "generated");
  }
  if (collectionId === "uploaded") {
    return assets.filter((a) => a.origin === "uploaded" || a.origin === "manual");
  }
  if (collectionId === "derived") {
    return assets.filter((a) => a.origin === "derived");
  }
  return assets.filter((a) => a.collectionIds.includes(collectionId));
}

export function sortStudioAssets(assets: StudioAsset[], sort: AssetLibrarySort): StudioAsset[] {
  const copy = [...assets];
  copy.sort((a, b) => {
    if (sort === "recent") {
      const aRecent = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const bRecent = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      if (bRecent !== aRecent) {
        return bRecent - aRecent;
      }
    }
    if (sort === "name_asc") {
      return a.name.localeCompare(b.name);
    }
    if (sort === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    if (sort === "updated_asc") {
      return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
    }
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  return copy;
}

export function searchStudioAssets(assets: StudioAsset[], query: string): StudioAsset[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return assets;
  }
  return assets.filter((asset) => {
    const hay = [
      asset.name,
      asset.description,
      asset.promptSummary ?? "",
      ...asset.tags,
      asset.sourceRef.entityId,
      asset.generationId ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function applyAssetLibraryPreferences(
  assets: StudioAsset[],
  params: {
    favoriteIds: string[];
    recentAssetIds: string[];
  }
): StudioAsset[] {
  const favoriteSet = new Set(params.favoriteIds);
  const recentMap = new Map(
    params.recentAssetIds.map((id, index) => [id, params.recentAssetIds.length - index])
  );
  return assets.map((asset) => ({
    ...asset,
    isFavorite: favoriteSet.has(asset.id) || asset.isFavorite,
    lastUsedAt:
      asset.lastUsedAt ??
      (recentMap.has(asset.id)
        ? new Date(Date.now() - (recentMap.get(asset.id)! - 1) * 1000).toISOString()
        : null),
  }));
}

export function userOwnedAssetsOnly(assets: StudioAsset[], userId: string): StudioAsset[] {
  return assets.filter((a) => a.owner === userId || a.owner === "system");
}

export function categoryLabelKey(category: StudioAssetCategory | "world"): string {
  if (category === "world") {
    return "studio.mediaAsset.tab.world";
  }
  return `studio.mediaAsset.tab.${category}`;
}
