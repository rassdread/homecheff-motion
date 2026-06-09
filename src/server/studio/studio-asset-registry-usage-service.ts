import { prisma } from "@/lib/prisma";
import type { AssetRegistryUsageRef, AssetRegistryUsageReport } from "@/types/studio-asset-lifecycle";
import type { StudioAssetKind } from "@/types/studio-asset-lifecycle";

function pushRef(refs: AssetRegistryUsageRef[], ref: AssetRegistryUsageRef) {
  if (!refs.some((r) => r.entityType === ref.entityType && r.entityId === ref.entityId)) {
    refs.push(ref);
  }
}

export async function getRegistryAssetUsage(params: {
  userId: string;
  assetKind: StudioAssetKind;
  assetId: string;
  storageKey?: string | null;
  generationId?: string | null;
}): Promise<AssetRegistryUsageReport> {
  const refs: AssetRegistryUsageRef[] = [];
  const storageKey = params.storageKey?.trim() ?? "";
  const generationId = params.generationId?.trim() ?? "";

  if (storageKey || generationId) {
    const [characters, props, locations] = await Promise.all([
      prisma.studioCharacter.findMany({
        where: {
          ownerId: params.userId,
          OR: [
            ...(storageKey ? [{ referenceStorageKey: storageKey }] : []),
            ...(storageKey ? [{ referenceImageUrl: { contains: storageKey.split("/").pop() ?? "" } }] : []),
          ],
        },
        select: { id: true, name: true },
      }),
      prisma.studioProp.findMany({
        where: {
          ownerId: params.userId,
          ...(storageKey ? { referenceStorageKey: storageKey } : {}),
        },
        select: { id: true, name: true },
      }),
      prisma.studioLocation.findMany({
        where: {
          ownerId: params.userId,
          ...(storageKey ? { referenceStorageKey: storageKey } : {}),
        },
        select: { id: true, name: true },
      }),
    ]);

    for (const c of characters) {
      pushRef(refs, {
        entityType: "character",
        entityId: c.id,
        entityName: c.name,
        href: `/studio/characters/${encodeURIComponent(c.id)}`,
      });
    }
    for (const p of props) {
      pushRef(refs, {
        entityType: "prop",
        entityId: p.id,
        entityName: p.name,
        href: `/studio/props/${encodeURIComponent(p.id)}`,
      });
    }
    for (const l of locations) {
      pushRef(refs, {
        entityType: "location",
        entityId: l.id,
        entityName: l.name,
        href: `/studio/locations/${encodeURIComponent(l.id)}`,
      });
    }
  }

  if (params.assetKind === "character" || params.assetKind === "prop" ||
      params.assetKind === "location" || params.assetKind === "world") {
    const entityId = params.assetId.includes(":")
      ? params.assetId.split(":").pop()!
      : params.assetId;
    const { getAssetStoryUsage } = await import("@/server/studio/studio-asset-story-usage");
    const kind = params.assetKind === "world" ? "world" : params.assetKind;
    const nameRow = await (async () => {
      if (kind === "character") {
        return prisma.studioCharacter.findFirst({ where: { id: entityId, ownerId: params.userId }, select: { name: true } });
      }
      if (kind === "prop") {
        return prisma.studioProp.findFirst({ where: { id: entityId, ownerId: params.userId }, select: { name: true } });
      }
      if (kind === "location") {
        return prisma.studioLocation.findFirst({ where: { id: entityId, ownerId: params.userId }, select: { name: true } });
      }
      return prisma.studioWorldProfile.findFirst({ where: { id: entityId, ownerId: params.userId }, select: { name: true } });
    })();
    if (nameRow?.name) {
      const usage = await getAssetStoryUsage(kind, entityId, nameRow.name);
      for (const sb of usage.storyboards) {
        pushRef(refs, {
          entityType: "storyboard",
          entityId: sb.storyboardId,
          entityName: sb.storyboardTitle,
          href: sb.href,
        });
      }
    }
  }

  return {
    assetId: params.assetId,
    usageCount: refs.length,
    refs,
  };
}
