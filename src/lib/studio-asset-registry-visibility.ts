import type { StudioAsset } from "@/types/studio-media-asset";

/** Ensure user entities and generated refs carry explicit user_owned visibility. */
export function stampUserOwnedRegistryAssets(assets: StudioAsset[], userId: string): StudioAsset[] {
  return assets.map((asset) => {
    if (asset.owner === "system") {
      return asset;
    }
    if (asset.owner === userId) {
      return {
        ...asset,
        visibility: "user_owned",
        source: asset.source === "imported" ? "imported" : "user",
      };
    }
    return asset;
  });
}

export function isUserGeneratedStorageKey(storageKey: string | null | undefined, userId: string): boolean {
  const key = storageKey?.trim() ?? "";
  if (!key) {
    return false;
  }
  return key.startsWith(`studio/${userId}/`);
}
