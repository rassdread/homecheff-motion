/** Shared JSON shapes for S.5 library APIs. */

import type { StudioCreativeProjectRow } from "@/server/studio-library/creative-project-service";
import type { StudioLibraryAssetRow } from "@/server/studio-library/library-asset-service";
import { toSearchableLibraryAsset } from "@/server/studio-library/library-asset-service";

export function serializeCreativeProject(row: StudioCreativeProjectRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    status: row.status,
    pinned: row.pinned,
    favorite: row.favorite,
    storyboardId: row.storyboardId,
    animationProjectId: row.animationProjectId,
    homeCheffProjectId: row.homeCheffProjectId,
    editorCanvasProjectId: row.editorCanvasProjectId,
    coverAssetId: row.coverAssetId,
    tags: Array.isArray(row.tagsJson) ? row.tagsJson : [],
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeLibraryAsset(row: StudioLibraryAssetRow) {
  const searchable = toSearchableLibraryAsset(row);
  return {
    id: row.id,
    ownerId: row.ownerId,
    projectId: row.projectId,
    family: row.family,
    category: row.category,
    title: row.title,
    description: row.description,
    tags: searchable.tags ?? [],
    origin: row.origin,
    status: row.status,
    favorite: row.favorite,
    previewUrl: row.previewUrl || null,
    downloadUrl: row.downloadUrl || null,
    storageKey: row.storageKey || null,
    mimeType: row.mimeType || null,
    backingStore: row.backingStore,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    parentAssetId: row.parentAssetId,
    generationJobId: row.generationJobId,
    promptSummary: row.promptSummary || null,
    aiModel: row.aiModel || null,
    generator: row.generator || null,
    creditsSpent: row.creditsSpent,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    language: row.language || null,
    aspectRatio: row.aspectRatio || null,
    usageCount: row.usageCount,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
