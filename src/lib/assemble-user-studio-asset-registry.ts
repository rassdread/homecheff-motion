import { stampUserOwnedRegistryAssets } from "@/lib/studio-asset-registry-visibility";
import { assignCollectionsToAssets } from "@/lib/studio-media-asset-collections";
import { buildStudioAssetRegistry } from "@/lib/studio-media-asset-registry";
import { filterUserLibraryAssets } from "@/lib/studio-asset-visibility";
import {
  buildUserAudioLibraryRegistryAssets,
  buildUserUploadRegistryAssets,
  buildUserVoiceCloneRegistryAssets,
} from "@/lib/studio-user-asset-registry-extensions";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { UserLibraryUploadRecord } from "@/types/studio-user-upload-library";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";
import type { StudioAsset } from "@/types/studio-media-asset";

export function assembleUserStudioAssetRegistry(params: {
  userId: string;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  generatedReferences?: Array<{
    generationId: string;
    kind: string;
    createdAt: string;
    promptSummary: string;
    referenceImageUrl: string;
    referenceStorageKey: string | null;
    thumbnailUrl: string | null;
    sourceAssetName: string | null;
    sourceAssetId?: string | null;
    origin: "generated" | "derived";
    ownerId: string;
  }>;
  userUploads?: UserLibraryUploadRecord[];
  userAudioAssets?: UserAudioLibraryAsset[];
  userVoiceClones?: UserVoiceLibraryEntry[];
  isAdmin?: boolean;
  showSystemAssets?: boolean;
}): StudioAsset[] {
  const seenUploadKeys = new Set<string>();
  const uniqueUploads = (params.userUploads ?? []).filter((u) => {
    if (seenUploadKeys.has(u.storageKey)) {
      return false;
    }
    seenUploadKeys.add(u.storageKey);
    return true;
  });

  const base = buildStudioAssetRegistry({
    characters: params.characters,
    locations: params.locations,
    props: params.props,
    worlds: params.worlds,
    generatedReferences: params.generatedReferences,
    includeSystemCatalog: Boolean(params.showSystemAssets && params.isAdmin),
    userId: params.userId,
  });

  const extended = stampUserOwnedRegistryAssets(
    assignCollectionsToAssets([
      ...base,
      ...buildUserUploadRegistryAssets(uniqueUploads, params.userId),
      ...buildUserAudioLibraryRegistryAssets(params.userAudioAssets ?? [], params.userId),
      ...buildUserVoiceCloneRegistryAssets(params.userVoiceClones ?? [], params.userId),
    ]),
    params.userId
  );

  return filterUserLibraryAssets(extended, {
    userId: params.userId,
    isAdmin: params.isAdmin,
    showSystemAssets: params.showSystemAssets,
  });
}
