import { getStudioAudioAsset, parseAssetIdList } from "@/lib/studio-audio-asset-library";
import type { AudioAssetCategory } from "@/types/studio-audio-asset-director";

export function isValidAudioAssetId(id: string, category?: AudioAssetCategory): boolean {
  const asset = getStudioAudioAsset(id);
  if (!asset) {
    return false;
  }
  return category ? asset.category === category : true;
}

export function normalizeAssetOverrideList(
  value: string,
  category: AudioAssetCategory
): string {
  const ids = parseAssetIdList(value).filter((id) => isValidAudioAssetId(id, category));
  return ids.join(",");
}
