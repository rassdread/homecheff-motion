/**
 * SHARED_PURE — locate a user audio library asset by id (no I/O).
 */

import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export function findUserAudioLibraryAsset(
  assets: UserAudioLibraryAsset[],
  assetId: string | null | undefined
): UserAudioLibraryAsset | null {
  const id = assetId?.trim();
  if (!id) {
    return null;
  }
  return assets.find((a) => a.id === id) ?? null;
}
