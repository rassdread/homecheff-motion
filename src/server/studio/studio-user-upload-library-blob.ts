import { randomUUID } from "node:crypto";
import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  UserLibraryUploadAssetType,
  UserLibraryUploadManifest,
  UserLibraryUploadRecord,
} from "@/types/studio-user-upload-library";

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/user-uploads/manifest.json`;
}

export async function readUserUploadLibraryManifest(
  ownerId: string
): Promise<UserLibraryUploadManifest> {
  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return { version: 1, ownerId, updatedAt: new Date().toISOString(), uploads: [] };
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { version: 1, ownerId, updatedAt: new Date().toISOString(), uploads: [] };
    }
    const raw = (await res.json()) as UserLibraryUploadManifest;
    if (raw?.version !== 1 || !Array.isArray(raw.uploads)) {
      return { version: 1, ownerId, updatedAt: new Date().toISOString(), uploads: [] };
    }
    return {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      uploads: raw.uploads.filter((u) => u && typeof u.id === "string"),
    };
  } catch {
    return { version: 1, ownerId, updatedAt: new Date().toISOString(), uploads: [] };
  }
}

async function writeManifest(manifest: UserLibraryUploadManifest): Promise<void> {
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_user_upload_manifest",
    },
  });
}

export async function registerUserLibraryUpload(params: {
  ownerId: string;
  assetType: UserLibraryUploadAssetType;
  mimeType: string;
  fileName: string;
  storageKey: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  originContext?: string;
}): Promise<UserLibraryUploadRecord> {
  const manifest = await readUserUploadLibraryManifest(params.ownerId);
  const existing = manifest.uploads.find((u) => u.storageKey === params.storageKey);
  if (existing) {
    return existing;
  }

  const record: UserLibraryUploadRecord = {
    id: randomUUID(),
    ownerId: params.ownerId,
    assetType: params.assetType,
    sourceType: "uploaded",
    mimeType: params.mimeType,
    fileName: params.fileName,
    storageKey: params.storageKey,
    publicUrl: params.publicUrl,
    thumbnailUrl: params.thumbnailUrl ?? null,
    createdAt: new Date().toISOString(),
    originContext: params.originContext,
    usedIn: [],
  };

  manifest.uploads.unshift(record);
  manifest.uploads = manifest.uploads.slice(0, 200);
  await writeManifest(manifest);
  return record;
}

export async function listUserLibraryUploads(ownerId: string): Promise<UserLibraryUploadRecord[]> {
  const manifest = await readUserUploadLibraryManifest(ownerId);
  return manifest.uploads;
}
