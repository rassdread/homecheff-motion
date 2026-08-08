/**
 * SERVER_ONLY — S.5 collections (logical grouping; never duplicates files).
 */

import { prisma } from "@/lib/prisma";
import { getLibraryAssetForOwner } from "@/server/studio-library/library-asset-service";

export async function createAssetCollection(input: {
  ownerId: string;
  name: string;
  description?: string;
  labelKey?: string;
  projectId?: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Collection name is required.");
  return prisma.studioAssetCollection.create({
    data: {
      ownerId: input.ownerId,
      name,
      description: (input.description ?? "").trim(),
      labelKey: input.labelKey ?? "",
      projectId: input.projectId ?? null,
    },
  });
}

export async function listAssetCollectionsForOwner(ownerId: string, limit = 40) {
  return prisma.studioAssetCollection.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      members: {
        select: { assetId: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function addAssetToCollection(input: {
  ownerId: string;
  collectionId: string;
  assetId: string;
  sortOrder?: number;
}): Promise<{ ok: true } | { ok: false; code: "not_found" }> {
  const [collection, asset] = await Promise.all([
    prisma.studioAssetCollection.findFirst({
      where: { id: input.collectionId, ownerId: input.ownerId },
    }),
    getLibraryAssetForOwner(input.assetId, input.ownerId),
  ]);
  if (!collection || !asset) return { ok: false, code: "not_found" };

  await prisma.studioAssetCollectionMember.upsert({
    where: {
      collectionId_assetId: {
        collectionId: collection.id,
        assetId: asset.id,
      },
    },
    create: {
      collectionId: collection.id,
      assetId: asset.id,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return { ok: true };
}

export async function removeAssetFromCollection(input: {
  ownerId: string;
  collectionId: string;
  assetId: string;
}): Promise<boolean> {
  const collection = await prisma.studioAssetCollection.findFirst({
    where: { id: input.collectionId, ownerId: input.ownerId },
  });
  if (!collection) return false;
  await prisma.studioAssetCollectionMember.deleteMany({
    where: { collectionId: collection.id, assetId: input.assetId },
  });
  return true;
}
