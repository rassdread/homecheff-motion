import { assembleUserStudioAssetRegistry } from "@/lib/assemble-user-studio-asset-registry";
import { computeStudioAssetLibraryCounts } from "@/lib/studio-asset-library-counts";
import { buildUserVoiceLibrary } from "@/lib/studio-user-voice-library";
import { listUserGeneratedReferences } from "@/server/studio/list-user-generated-references";
import { getOwnerAudioLibrary } from "@/server/studio/studio-user-audio-library-service";
import { listUserLibraryUploads } from "@/server/studio/studio-user-upload-library-blob";
import { listStudioCharacters } from "@/server/studio/studio-character-service";
import { listStudioLocations } from "@/server/studio/studio-location-service";
import { listStudioProps } from "@/server/studio/studio-prop-service";
import { listStudioWorldProfiles } from "@/server/studio/studio-world-profile-service";
import type { SessionUser } from "@/server/auth/session";
import type { StudioAssetLibraryCounts } from "@/types/studio-asset-library-counts";
import type { StudioAsset } from "@/types/studio-media-asset";

export type UserStudioAssetRegistrySnapshot = {
  registry: StudioAsset[];
  libraryCounts: StudioAssetLibraryCounts;
  systemAssetCount: number;
};

export async function loadUserStudioAssetRegistry(
  viewer: Pick<SessionUser, "id" | "role">,
  options?: {
    favoriteIds?: string[];
    recentAssetIds?: string[];
    showSystemAssets?: boolean;
  }
): Promise<UserStudioAssetRegistrySnapshot> {
  const isAdmin = viewer.role === "admin";

  const [characters, locations, props, worlds, history, userUploads, userAudio, voiceLibrary] =
    await Promise.all([
      listStudioCharacters(viewer),
      listStudioLocations(viewer),
      listStudioProps(viewer),
      listStudioWorldProfiles(viewer),
      listUserGeneratedReferences({ userId: viewer.id, limit: 50 }),
      listUserLibraryUploads(viewer.id),
      getOwnerAudioLibrary(viewer.id),
      buildUserVoiceLibrary(viewer.id),
    ]);

  const generatedRefs = history
    .filter((item) => item.referenceImageUrl)
    .map((item) => ({
      generationId: item.generationId,
      kind: item.kind,
      createdAt: item.createdAt,
      promptSummary: item.promptSummary,
      referenceImageUrl: item.referenceImageUrl!,
      referenceStorageKey: item.referenceStorageKey,
      thumbnailUrl: item.thumbnailUrl,
      sourceAssetName: item.sourceAssetName,
      origin: item.origin,
      ownerId: viewer.id,
    }));

  const registry = assembleUserStudioAssetRegistry({
    userId: viewer.id,
    characters,
    locations,
    props,
    worlds,
    generatedReferences: generatedRefs,
    userUploads,
    userAudioAssets: userAudio,
    userVoiceClones: voiceLibrary.voices,
    isAdmin,
    showSystemAssets: options?.showSystemAssets,
  });

  const systemRegistry = options?.showSystemAssets && isAdmin
    ? assembleUserStudioAssetRegistry({
        userId: viewer.id,
        characters,
        locations,
        props,
        worlds,
        generatedReferences: generatedRefs,
        userUploads,
        userAudioAssets: userAudio,
        userVoiceClones: voiceLibrary.voices,
        isAdmin: true,
        showSystemAssets: true,
      })
    : registry;

  const libraryCounts = computeStudioAssetLibraryCounts(registry, {
    userId: viewer.id,
    favoriteIds: options?.favoriteIds,
    recentAssetIds: options?.recentAssetIds,
    savedEntities: {
      characters: characters.length,
      props: props.length,
      locations: locations.length,
      worlds: worlds.length,
    },
  });

  const systemAssetCount = systemRegistry.length - registry.length;

  return { registry, libraryCounts, systemAssetCount };
}
