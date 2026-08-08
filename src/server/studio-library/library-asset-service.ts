/**
 * SERVER_ONLY — S.5 canonical library asset index.
 */

import { prisma } from "@/lib/prisma";
import {
  filterLibraryAssetsByQuery,
  paginateItems,
  type StudioLibrarySearchableAsset,
} from "@/lib/studio-library-search";
import type {
  StudioLibraryAssetFamily,
  StudioLibraryAssetStatus,
  StudioLibraryOrigin,
} from "@/lib/studio-library-types";
import type { Prisma } from "@prisma/client";

export type StudioLibraryAssetRow = {
  id: string;
  ownerId: string;
  projectId: string | null;
  family: string;
  category: string;
  title: string;
  description: string;
  tagsJson: Prisma.JsonValue | null;
  origin: string;
  status: string;
  favorite: boolean;
  previewUrl: string;
  downloadUrl: string;
  storageKey: string;
  mimeType: string;
  backingStore: string;
  sourceKind: string;
  sourceId: string;
  parentAssetId: string | null;
  generationJobId: string | null;
  promptSummary: string;
  aiModel: string;
  generator: string;
  creditsSpent: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  language: string;
  aspectRatio: string;
  usageCount: number;
  metadataJson: Prisma.JsonValue | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function tagsFromJson(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string");
}

export function toSearchableLibraryAsset(row: StudioLibraryAssetRow): StudioLibrarySearchableAsset {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    family: row.family,
    category: row.category,
    tags: tagsFromJson(row.tagsJson),
    promptSummary: row.promptSummary,
    language: row.language,
    aspectRatio: row.aspectRatio,
    origin: row.origin,
    aiModel: row.aiModel,
    generator: row.generator,
    durationSeconds: row.durationSeconds,
    status: row.status,
    metadataText: row.metadataJson ? JSON.stringify(row.metadataJson) : "",
  };
}

export async function upsertLibraryAsset(input: {
  ownerId: string;
  projectId?: string | null;
  family: StudioLibraryAssetFamily;
  category?: string;
  title: string;
  description?: string;
  tags?: string[];
  origin?: StudioLibraryOrigin;
  status?: StudioLibraryAssetStatus;
  previewUrl?: string;
  downloadUrl?: string;
  storageKey?: string;
  mimeType?: string;
  backingStore?: string;
  sourceKind: string;
  sourceId: string;
  parentAssetId?: string | null;
  generationJobId?: string | null;
  promptSummary?: string;
  aiModel?: string;
  generator?: string;
  creditsSpent?: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  language?: string;
  aspectRatio?: string;
  metadata?: Record<string, unknown>;
}): Promise<StudioLibraryAssetRow> {
  const title = input.title.trim() || "Untitled asset";
  const sourceKind = input.sourceKind.trim();
  const sourceId = input.sourceId.trim();
  if (!sourceKind || !sourceId) {
    throw new Error("sourceKind and sourceId are required.");
  }

  return prisma.studioLibraryAsset.upsert({
    where: {
      ownerId_sourceKind_sourceId: {
        ownerId: input.ownerId,
        sourceKind,
        sourceId,
      },
    },
    create: {
      ownerId: input.ownerId,
      projectId: input.projectId ?? null,
      family: input.family,
      category: input.category ?? "",
      title,
      description: (input.description ?? "").trim(),
      tagsJson: (input.tags ?? undefined) as Prisma.InputJsonValue | undefined,
      origin: input.origin ?? "uploaded",
      status: input.status ?? "active",
      previewUrl: input.previewUrl ?? "",
      downloadUrl: input.downloadUrl ?? "",
      storageKey: input.storageKey ?? "",
      mimeType: input.mimeType ?? "",
      backingStore: input.backingStore ?? "blob_manifest",
      sourceKind,
      sourceId,
      parentAssetId: input.parentAssetId ?? null,
      generationJobId: input.generationJobId ?? null,
      promptSummary: input.promptSummary ?? "",
      aiModel: input.aiModel ?? "",
      generator: input.generator ?? "",
      creditsSpent: input.creditsSpent ?? 0,
      width: input.width ?? null,
      height: input.height ?? null,
      durationSeconds: input.durationSeconds ?? null,
      language: input.language ?? "",
      aspectRatio: input.aspectRatio ?? "",
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: {
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      family: input.family,
      ...(input.category != null ? { category: input.category } : {}),
      title,
      ...(input.description != null ? { description: input.description.trim() } : {}),
      ...(input.tags != null ? { tagsJson: input.tags as Prisma.InputJsonValue } : {}),
      ...(input.origin != null ? { origin: input.origin } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.previewUrl != null ? { previewUrl: input.previewUrl } : {}),
      ...(input.downloadUrl != null ? { downloadUrl: input.downloadUrl } : {}),
      ...(input.storageKey != null ? { storageKey: input.storageKey } : {}),
      ...(input.mimeType != null ? { mimeType: input.mimeType } : {}),
      ...(input.backingStore != null ? { backingStore: input.backingStore } : {}),
      ...(input.parentAssetId !== undefined ? { parentAssetId: input.parentAssetId } : {}),
      ...(input.generationJobId !== undefined ? { generationJobId: input.generationJobId } : {}),
      ...(input.promptSummary != null ? { promptSummary: input.promptSummary } : {}),
      ...(input.aiModel != null ? { aiModel: input.aiModel } : {}),
      ...(input.generator != null ? { generator: input.generator } : {}),
      ...(input.creditsSpent != null ? { creditsSpent: input.creditsSpent } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
      ...(input.language != null ? { language: input.language } : {}),
      ...(input.aspectRatio != null ? { aspectRatio: input.aspectRatio } : {}),
      ...(input.metadata != null ? { metadataJson: input.metadata as Prisma.InputJsonValue } : {}),
      deletedAt: null,
    },
  });
}

export async function getLibraryAssetForOwner(
  assetId: string,
  ownerId: string
): Promise<StudioLibraryAssetRow | null> {
  return prisma.studioLibraryAsset.findFirst({
    where: { id: assetId, ownerId, deletedAt: null },
  });
}

export async function listLibraryAssetsForOwner(input: {
  ownerId: string;
  family?: StudioLibraryAssetFamily | null;
  projectId?: string | null;
  status?: StudioLibraryAssetStatus | "all";
  favoriteOnly?: boolean;
  query?: string;
  offset?: number;
  limit?: number;
}): Promise<{
  items: StudioLibraryAssetRow[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}> {
  const status = input.status ?? "active";
  const rows = await prisma.studioLibraryAsset.findMany({
    where: {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(status !== "all" ? { status } : { status: { not: "deleted" } }),
      ...(input.family ? { family: input.family } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.favoriteOnly ? { favorite: true } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const filtered = input.query?.trim()
    ? filterLibraryAssetsByQuery(rows.map(toSearchableLibraryAsset), input.query)
        .map((s) => rows.find((r) => r.id === s.id)!)
        .filter(Boolean)
    : rows;

  const page = paginateItems(filtered, { offset: input.offset, limit: input.limit });
  return {
    items: page.items,
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
  };
}

export async function addLibraryAssetVersion(input: {
  assetId: string;
  ownerId: string;
  label?: string;
  previewUrl?: string;
  downloadUrl?: string;
  storageKey?: string;
  promptSummary?: string;
  metadata?: Record<string, unknown>;
  /** When true, tip URLs update on the head asset without overwriting prior versions. */
  promoteToHead?: boolean;
}): Promise<{ asset: StudioLibraryAssetRow; versionNumber: number } | null> {
  const asset = await getLibraryAssetForOwner(input.assetId, input.ownerId);
  if (!asset) return null;

  const last = await prisma.studioLibraryAssetVersion.findFirst({
    where: { assetId: asset.id },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;

  await prisma.studioLibraryAssetVersion.create({
    data: {
      assetId: asset.id,
      versionNumber,
      label: input.label ?? `v${versionNumber}`,
      previewUrl: input.previewUrl ?? asset.previewUrl,
      downloadUrl: input.downloadUrl ?? asset.downloadUrl,
      storageKey: input.storageKey ?? asset.storageKey,
      promptSummary: input.promptSummary ?? asset.promptSummary,
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  const updated =
    input.promoteToHead === false
      ? asset
      : await prisma.studioLibraryAsset.update({
          where: { id: asset.id },
          data: {
            ...(input.previewUrl != null ? { previewUrl: input.previewUrl } : {}),
            ...(input.downloadUrl != null ? { downloadUrl: input.downloadUrl } : {}),
            ...(input.storageKey != null ? { storageKey: input.storageKey } : {}),
            ...(input.promptSummary != null ? { promptSummary: input.promptSummary } : {}),
          },
        });

  return { asset: updated, versionNumber };
}

export async function listLibraryAssetVersions(input: {
  assetId: string;
  ownerId: string;
}) {
  const asset = await getLibraryAssetForOwner(input.assetId, input.ownerId);
  if (!asset) return null;
  const versions = await prisma.studioLibraryAssetVersion.findMany({
    where: { assetId: asset.id },
    orderBy: { versionNumber: "desc" },
  });
  return { asset, versions };
}

export async function setLibraryAssetFavorite(input: {
  assetId: string;
  ownerId: string;
  favorite: boolean;
}): Promise<StudioLibraryAssetRow | null> {
  const asset = await getLibraryAssetForOwner(input.assetId, input.ownerId);
  if (!asset) return null;
  return prisma.studioLibraryAsset.update({
    where: { id: asset.id },
    data: { favorite: input.favorite },
  });
}

export type SafeDeleteDependency = {
  kind: "collection" | "relation" | "usage" | "derived_child";
  id: string;
  label: string;
};

export async function inspectLibraryAssetDependencies(input: {
  assetId: string;
  ownerId: string;
}): Promise<{ asset: StudioLibraryAssetRow; dependencies: SafeDeleteDependency[] } | null> {
  const asset = await getLibraryAssetForOwner(input.assetId, input.ownerId);
  if (!asset) return null;

  const [members, relationsFrom, relationsTo, usage, children] = await Promise.all([
    prisma.studioAssetCollectionMember.findMany({
      where: { assetId: asset.id },
      include: { collection: { select: { id: true, name: true } } },
      take: 50,
    }),
    prisma.studioAssetRelation.findMany({
      where: { fromAssetId: asset.id },
      take: 50,
    }),
    prisma.studioAssetRelation.findMany({
      where: { toAssetId: asset.id },
      take: 50,
    }),
    prisma.studioAssetUsageEvent.findMany({
      where: { assetId: asset.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.studioLibraryAsset.findMany({
      where: { parentAssetId: asset.id, deletedAt: null },
      take: 50,
    }),
  ]);

  const dependencies: SafeDeleteDependency[] = [
    ...members.map((m) => ({
      kind: "collection" as const,
      id: m.collection.id,
      label: m.collection.name,
    })),
    ...relationsFrom.map((r) => ({
      kind: "relation" as const,
      id: r.id,
      label: `${r.relationType}→${r.toAssetId}`,
    })),
    ...relationsTo.map((r) => ({
      kind: "relation" as const,
      id: r.id,
      label: `${r.relationType}←${r.fromAssetId}`,
    })),
    ...usage.map((u) => ({
      kind: "usage" as const,
      id: u.id,
      label: `${u.entityType}:${u.entityName || u.entityId}`,
    })),
    ...children.map((c) => ({
      kind: "derived_child" as const,
      id: c.id,
      label: c.title,
    })),
  ];

  return { asset, dependencies };
}

/** Soft archive — never destroys projects. */
export async function archiveLibraryAsset(
  assetId: string,
  ownerId: string
): Promise<StudioLibraryAssetRow | null> {
  const asset = await getLibraryAssetForOwner(assetId, ownerId);
  if (!asset) return null;
  return prisma.studioLibraryAsset.update({
    where: { id: asset.id },
    data: { status: "archived", archivedAt: new Date() },
  });
}

export async function restoreLibraryAsset(
  assetId: string,
  ownerId: string
): Promise<StudioLibraryAssetRow | null> {
  const asset = await prisma.studioLibraryAsset.findFirst({
    where: { id: assetId, ownerId },
  });
  if (!asset) return null;
  return prisma.studioLibraryAsset.update({
    where: { id: asset.id },
    data: { status: "active", archivedAt: null, deletedAt: null },
  });
}

/**
 * Permanent delete only after archive + dependency review.
 * Soft-deletes by default unless `hard` is true.
 */
export async function deleteLibraryAsset(input: {
  assetId: string;
  ownerId: string;
  hard?: boolean;
  force?: boolean;
}): Promise<
  | { ok: true; mode: "soft" | "hard"; assetId: string }
  | { ok: false; code: "not_found" | "has_dependencies"; dependencies: SafeDeleteDependency[] }
> {
  const inspected = await inspectLibraryAssetDependencies({
    assetId: input.assetId,
    ownerId: input.ownerId,
  });
  if (!inspected) {
    return { ok: false, code: "not_found", dependencies: [] };
  }

  const blocking = inspected.dependencies.filter(
    (d) => d.kind === "usage" || d.kind === "derived_child"
  );
  if (blocking.length > 0 && !input.force) {
    return { ok: false, code: "has_dependencies", dependencies: inspected.dependencies };
  }

  if (input.hard) {
    await prisma.studioLibraryAsset.delete({ where: { id: inspected.asset.id } });
    return { ok: true, mode: "hard", assetId: inspected.asset.id };
  }

  await prisma.studioLibraryAsset.update({
    where: { id: inspected.asset.id },
    data: { status: "deleted", deletedAt: new Date() },
  });
  return { ok: true, mode: "soft", assetId: inspected.asset.id };
}

export async function recordLibraryAssetUsage(input: {
  assetId: string;
  ownerId: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  context?: Record<string, unknown>;
}): Promise<boolean> {
  const asset = await getLibraryAssetForOwner(input.assetId, input.ownerId);
  if (!asset) return false;
  await prisma.$transaction([
    prisma.studioAssetUsageEvent.create({
      data: {
        assetId: asset.id,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName ?? "",
        contextJson: (input.context ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    }),
    prisma.studioLibraryAsset.update({
      where: { id: asset.id },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
  return true;
}

export async function linkLibraryAssets(input: {
  ownerId: string;
  fromAssetId: string;
  toAssetId: string;
  relationType: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const [from, to] = await Promise.all([
    getLibraryAssetForOwner(input.fromAssetId, input.ownerId),
    getLibraryAssetForOwner(input.toAssetId, input.ownerId),
  ]);
  if (!from || !to) return false;
  await prisma.studioAssetRelation.upsert({
    where: {
      fromAssetId_toAssetId_relationType: {
        fromAssetId: from.id,
        toAssetId: to.id,
        relationType: input.relationType,
      },
    },
    create: {
      fromAssetId: from.id,
      toAssetId: to.id,
      relationType: input.relationType,
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: {
      metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return true;
}
