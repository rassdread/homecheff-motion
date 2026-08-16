import { randomUUID } from "node:crypto";
import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  LibraryConsistencyManifest,
  LibraryConsistencyRecord,
} from "@/types/library-consistency";

const MAX_RECORDS = 500;

/** SP.2D-F: short in-process cache so home/assistant/browse share one blob fetch per warm instance. */
const MANIFEST_CACHE_TTL_MS = 8_000;
const manifestCache = new Map<string, { at: number; data: LibraryConsistencyManifest }>();

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/library-consistency/manifest.json`;
}

function emptyManifest(ownerId: string): LibraryConsistencyManifest {
  return { version: 1, ownerId, updatedAt: new Date().toISOString(), records: [] };
}

export function invalidateLibraryConsistencyManifestCache(ownerId?: string): void {
  if (ownerId) {
    manifestCache.delete(ownerId);
    return;
  }
  manifestCache.clear();
}

export async function readLibraryConsistencyManifest(
  ownerId: string
): Promise<LibraryConsistencyManifest> {
  const cached = manifestCache.get(ownerId);
  if (cached && Date.now() - cached.at < MANIFEST_CACHE_TTL_MS) {
    return cached.data;
  }

  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    const empty = emptyManifest(ownerId);
    manifestCache.set(ownerId, { at: Date.now(), data: empty });
    return empty;
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const empty = emptyManifest(ownerId);
      manifestCache.set(ownerId, { at: Date.now(), data: empty });
      return empty;
    }
    const raw = (await res.json()) as LibraryConsistencyManifest;
    if (raw?.version !== 1 || !Array.isArray(raw.records)) {
      const empty = emptyManifest(ownerId);
      manifestCache.set(ownerId, { at: Date.now(), data: empty });
      return empty;
    }
    const data: LibraryConsistencyManifest = {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      records: raw.records
        .filter((r) => r && typeof r.id === "string")
        .map((r) => ({
          ...r,
          updatedAt: r.updatedAt ?? r.createdAt ?? new Date().toISOString(),
          assetType: r.assetType ?? r.generationType,
          workflow: r.workflow ?? null,
          usedInModules: r.usedInModules ?? (r.sourceModule ? [r.sourceModule] : ["studio"]),
        })),
    };
    manifestCache.set(ownerId, { at: Date.now(), data });
    return data;
  } catch {
    const empty = emptyManifest(ownerId);
    manifestCache.set(ownerId, { at: Date.now(), data: empty });
    return empty;
  }
}

async function writeManifest(manifest: LibraryConsistencyManifest): Promise<void> {
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "library_consistency_manifest",
    },
  });
  invalidateLibraryConsistencyManifestCache(manifest.ownerId);
}

export async function upsertLibraryConsistencyRecord(
  record: Omit<LibraryConsistencyRecord, "id" | "createdAt" | "updatedAt" | "status"> & {
    id?: string;
    createdAt?: string;
  }
): Promise<LibraryConsistencyRecord> {
  const manifest = await readLibraryConsistencyManifest(record.ownerId);
  const existingIdx = manifest.records.findIndex(
    (r) => r.storageKey === record.storageKey || r.backingId === record.backingId
  );

  const now = new Date().toISOString();
  const full: LibraryConsistencyRecord = {
    id: record.id ?? (existingIdx >= 0 ? manifest.records[existingIdx]!.id : randomUUID()),
    createdAt:
      record.createdAt ??
      (existingIdx >= 0 ? manifest.records[existingIdx]!.createdAt : now),
    updatedAt: now,
    status: "completed",
    ownerId: record.ownerId,
    createdBy: record.createdBy,
    generationType: record.generationType,
    category: record.category,
    registryAssetId: record.registryAssetId,
    backingStore: record.backingStore,
    backingId: record.backingId,
    assetUrl: record.assetUrl,
    storageKey: record.storageKey,
    thumbnailUrl: record.thumbnailUrl ?? null,
    assetName: record.assetName,
    promptSummary: record.promptSummary ?? null,
    projectId: record.projectId ?? null,
    projectTitle: record.projectTitle ?? null,
    sourceModule: record.sourceModule,
    sourceRoute: record.sourceRoute ?? null,
    assetType: record.assetType ?? record.generationType,
    workflow: record.workflow ?? null,
    storyboardId: record.storyboardId ?? null,
    characterCompleteness: record.characterCompleteness ?? null,
    motionReadinessScore: record.motionReadinessScore ?? null,
    motionReady: record.motionReady ?? null,
    missingParts: record.missingParts ?? null,
    characterType: record.characterType ?? null,
    fusionIntent: record.fusionIntent ?? null,
    fusionArchetype: record.fusionArchetype ?? null,
    fusionMetadata: record.fusionMetadata ?? null,
    motionMetadata: record.motionMetadata ?? null,
    publishMetadata: record.publishMetadata ?? null,
    usedInModules: record.usedInModules ?? [record.sourceModule],
  };

  if (existingIdx >= 0) {
    manifest.records[existingIdx] = full;
  } else {
    manifest.records.unshift(full);
  }
  manifest.records = manifest.records.slice(0, MAX_RECORDS);
  await writeManifest(manifest);
  return full;
}

export async function listLibraryConsistencyRecords(
  ownerId: string,
  limit = 40
): Promise<LibraryConsistencyRecord[]> {
  const manifest = await readLibraryConsistencyManifest(ownerId);
  return manifest.records.slice(0, limit);
}

export function isStorageKeyInLibrary(
  records: LibraryConsistencyRecord[],
  storageKey: string
): boolean {
  return records.some((r) => r.storageKey === storageKey);
}
