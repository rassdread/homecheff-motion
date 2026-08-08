/**
 * SERVER_ONLY — S.5 universal favorites.
 */

import { prisma } from "@/lib/prisma";
import type { StudioFavoriteTargetKind } from "@/lib/studio-library-types";
import { setLibraryAssetFavorite } from "@/server/studio-library/library-asset-service";
import { updateCreativeProject } from "@/server/studio-library/creative-project-service";

export async function setFavorite(input: {
  ownerId: string;
  targetKind: StudioFavoriteTargetKind;
  targetId: string;
  favorite: boolean;
}): Promise<{ ok: true } | { ok: false; code: "invalid_target" }> {
  const targetId = input.targetId.trim();
  if (!targetId) return { ok: false, code: "invalid_target" };

  if (input.favorite) {
    await prisma.studioFavorite.upsert({
      where: {
        ownerId_targetKind_targetId: {
          ownerId: input.ownerId,
          targetKind: input.targetKind,
          targetId,
        },
      },
      create: {
        ownerId: input.ownerId,
        targetKind: input.targetKind,
        targetId,
      },
      update: {},
    });
  } else {
    await prisma.studioFavorite.deleteMany({
      where: {
        ownerId: input.ownerId,
        targetKind: input.targetKind,
        targetId,
      },
    });
  }

  // Mirror denormalized flags on primary entities when applicable.
  if (input.targetKind === "asset") {
    await setLibraryAssetFavorite({
      assetId: targetId,
      ownerId: input.ownerId,
      favorite: input.favorite,
    });
  }
  if (input.targetKind === "project") {
    await updateCreativeProject({
      projectId: targetId,
      ownerId: input.ownerId,
      favorite: input.favorite,
    });
  }
  if (input.targetKind === "brand_kit") {
    await prisma.studioBrandKit.updateMany({
      where: { id: targetId, ownerId: input.ownerId },
      data: { favorite: input.favorite },
    });
  }
  if (input.targetKind === "prompt_preset") {
    await prisma.studioPromptPreset.updateMany({
      where: { id: targetId, ownerId: input.ownerId },
      data: { favorite: input.favorite },
    });
  }

  return { ok: true };
}

export async function listFavoritesForOwner(ownerId: string, limit = 100) {
  return prisma.studioFavorite.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, limit)),
  });
}
