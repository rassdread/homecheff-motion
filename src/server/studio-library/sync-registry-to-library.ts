/**
 * SERVER_ONLY — Index virtual StudioAsset registry rows into canonical library.
 * Domain entities remain SoT; this makes them discoverable in one library.
 */

import type { StudioAsset, StudioAssetCategory } from "@/types/studio-media-asset";
import type { StudioLibraryAssetFamily } from "@/lib/studio-library-types";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";

function familyForCategory(category: StudioAssetCategory): StudioLibraryAssetFamily {
  switch (category) {
    case "character":
      return "character";
    case "location":
      return "location";
    case "prop":
      return "prop";
    case "voice":
      return "voice";
    case "music":
      return "music";
    case "ambience":
    case "sound_effect":
      return "sfx";
    case "reference_image":
    case "mouth_asset":
      return "image";
    case "brand_asset":
      return "brand";
    default:
      return "other";
  }
}

export async function syncStudioAssetsIntoLibrary(input: {
  ownerId: string;
  assets: StudioAsset[];
  limit?: number;
}): Promise<{ upserted: number; errors: number }> {
  const limit = Math.min(200, Math.max(1, input.limit ?? 100));
  let upserted = 0;
  let errors = 0;

  for (const asset of input.assets.slice(0, limit)) {
    if (asset.visibility === "system_hidden" || asset.visibility === "placeholder") {
      continue;
    }
    try {
      const sourceKind = asset.sourceRef.entityType;
      const sourceId = asset.sourceRef.entityId || asset.id;
      await upsertLibraryAsset({
        ownerId: input.ownerId,
        family: familyForCategory(asset.category),
        category: asset.category,
        title: asset.name,
        description: asset.description,
        tags: asset.tags,
        origin: asset.origin ?? (asset.source === "system" ? "system" : "manual"),
        status: asset.status === "archived" ? "archived" : asset.status === "draft" ? "draft" : "active",
        previewUrl: asset.previewUrl ?? "",
        downloadUrl: asset.downloadUrl ?? asset.previewUrl ?? "",
        storageKey: asset.storageKey ?? "",
        backingStore: "prisma_entity",
        sourceKind,
        sourceId,
        promptSummary: asset.promptSummary ?? "",
        generationJobId: asset.generationId ?? null,
        metadata: {
          registryAssetId: asset.id,
          visibility: asset.visibility,
        },
      });
      upserted += 1;
    } catch {
      errors += 1;
    }
  }

  return { upserted, errors };
}
