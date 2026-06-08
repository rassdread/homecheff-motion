import { buildStudioAssetRegistry } from "@/lib/studio-media-asset-registry";
import { userOwnedAssetsOnly } from "@/lib/studio-asset-library-filters";
import { computeStudioAssetLibraryCounts } from "@/lib/studio-asset-library-counts";
import { listUserGeneratedReferences } from "@/server/studio/list-user-generated-references";
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
};

export async function loadUserStudioAssetRegistry(
  viewer: Pick<SessionUser, "id" | "role">,
  options?: {
    favoriteIds?: string[];
    recentAssetIds?: string[];
  }
): Promise<UserStudioAssetRegistrySnapshot> {
  const [characters, locations, props, worlds, history] = await Promise.all([
    listStudioCharacters(viewer),
    listStudioLocations(viewer),
    listStudioProps(viewer),
    listStudioWorldProfiles(viewer),
    listUserGeneratedReferences({ userId: viewer.id, limit: 50 }),
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

  const registry = userOwnedAssetsOnly(
    buildStudioAssetRegistry({
      characters,
      locations,
      props,
      worlds,
      generatedReferences: generatedRefs,
      includeSystemCatalog: true,
      userId: viewer.id,
    }),
    viewer.id
  );

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

  return { registry, libraryCounts };
}
