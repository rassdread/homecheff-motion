import type { AssetLifecycleManifestFields } from "@/types/studio-asset-lifecycle";
import type { StudioAsset } from "@/types/studio-media-asset";

export function isManifestLifecycleHidden(record: AssetLifecycleManifestFields): boolean {
  if (record.deletedAt) {
    return true;
  }
  if (record.lifecycleStatus === "removed") {
    return true;
  }
  if (record.hideFromLibrary || record.lifecycleStatus === "hidden") {
    return true;
  }
  return false;
}

export function isManifestLifecycleArchived(record: AssetLifecycleManifestFields): boolean {
  return record.lifecycleStatus === "archived" || Boolean(record.archivedAt);
}

export function isRegistryAssetHiddenFromLibrary(asset: StudioAsset): boolean {
  if (asset.status === "archived") {
    return true;
  }
  const lc = asset.lifecycle;
  if (!lc) {
    return false;
  }
  if (lc.deletedAt || lc.lifecycleStatus === "removed") {
    return true;
  }
  if (lc.hideFromLibrary || lc.lifecycleStatus === "hidden") {
    return true;
  }
  if (lc.lifecycleStatus === "archived" || lc.archivedAt) {
    return true;
  }
  return false;
}

export function filterVisibleRegistryAssets(
  assets: StudioAsset[],
  options: { showHidden?: boolean; showArchived?: boolean; isAdmin?: boolean }
): StudioAsset[] {
  const showHidden = Boolean(options.showHidden && options.isAdmin);
  const showArchived = Boolean(options.showArchived && options.isAdmin);
  return assets.filter((asset) => {
    if (!asset.lifecycle && asset.status !== "archived") {
      return true;
    }
    if (asset.lifecycle?.deletedAt || asset.lifecycle?.lifecycleStatus === "removed") {
      return showHidden;
    }
    if (asset.status === "archived" || asset.lifecycle?.lifecycleStatus === "archived") {
      return showArchived;
    }
    if (asset.lifecycle?.hideFromLibrary || asset.lifecycle?.lifecycleStatus === "hidden") {
      return showHidden;
    }
    return true;
  });
}
