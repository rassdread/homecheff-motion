import type { AssetCreateEntryPath } from "@/types/studio-asset-creation";

/** Legacy `existing_asset` entry redirects to derive-from-reference flow. */
export function normalizeAssetCreateEntryPath(path: AssetCreateEntryPath): AssetCreateEntryPath {
  if (path === "existing_asset") {
    return "derive_from_reference";
  }
  return path;
}
