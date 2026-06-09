import { prisma } from "@/lib/prisma";
import { semanticRecordUsesPlacementSource } from "@/lib/studio-asset-reference-placement";
import {
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromLocation,
  extractAssetSemanticRecordFromProp,
} from "@/lib/studio-asset-semantic-record";
import { ASSET_SEMANTIC_MARKER } from "@/types/studio-asset-semantic-record";
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

  const [placementCharacters, placementProps, placementLocations] = await Promise.all([
    prisma.studioCharacter.findMany({
      where: { ownerId: params.userId, referenceNotes: { contains: ASSET_SEMANTIC_MARKER } },
      select: { id: true, name: true, referenceNotes: true },
    }),
    prisma.studioProp.findMany({
      where: { ownerId: params.userId, continuityNotes: { contains: ASSET_SEMANTIC_MARKER } },
      select: { id: true, name: true, continuityNotes: true },
    }),
    prisma.studioLocation.findMany({
      where: { ownerId: params.userId, continuityNotes: { contains: ASSET_SEMANTIC_MARKER } },
      select: { id: true, name: true, continuityNotes: true },
    }),
  ]);

  const placementSource = { assetId: params.assetId, storageKey: params.storageKey };
  for (const character of placementCharacters) {
    const record = extractAssetSemanticRecordFromCharacter(character);
    if (semanticRecordUsesPlacementSource(record, placementSource)) {
      pushRef(refs, {
        entityType: "character",
        entityId: character.id,
        entityName: character.name,
        href: `/studio/characters/${encodeURIComponent(character.id)}`,
      });
    }
  }
  for (const prop of placementProps) {
    const record = extractAssetSemanticRecordFromProp(prop);
    if (semanticRecordUsesPlacementSource(record, placementSource)) {
      pushRef(refs, {
        entityType: "prop",
        entityId: prop.id,
        entityName: prop.name,
        href: `/studio/props/${encodeURIComponent(prop.id)}`,
      });
    }
  }
  for (const location of placementLocations) {
    const record = extractAssetSemanticRecordFromLocation(location);
    if (semanticRecordUsesPlacementSource(record, placementSource)) {
      pushRef(refs, {
        entityType: "location",
        entityId: location.id,
        entityName: location.name,
        href: `/studio/locations/${encodeURIComponent(location.id)}`,
      });
    }
  }

  return {
    assetId: params.assetId,
    usageCount: refs.length,
    refs,
  };
}
