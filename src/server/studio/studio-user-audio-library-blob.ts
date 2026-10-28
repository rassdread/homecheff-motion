/**
 * SERVER_ONLY — Vercel Blob I/O for user audio library manifests/assets.
 * Do not import from `"use client"` graphs (enforced by S.1 architecture tests).
 * Pure lookup: `@/lib/studio-user-audio-library-find`.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import { localMediaDir, safeLocalFileName, writeCertifiedLocalFile } from "@/lib/studio-local-media";
import { findUserAudioLibraryAsset } from "@/lib/studio-user-audio-library-find";
import type {
  UserAudioLibraryAsset,
  UserAudioLibraryManifest,
} from "@/types/studio-user-audio-library";

export { findUserAudioLibraryAsset };

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/audio-library/manifest.json`;
}

function assetPathname(ownerId: string, assetId: string, extension: string): string {
  return `studio/${ownerId}/audio-library/assets/${assetId}.${extension}`;
}

function localManifestPath(ownerId: string): string | null {
  const dir = localMediaDir();
  if (!dir) return null;
  return path.join(dir, "audio-manifests", `${safeLocalFileName(ownerId)}.json`);
}

export async function readUserAudioLibraryManifest(
  ownerId: string
): Promise<UserAudioLibraryManifest> {
  const localPath = localManifestPath(ownerId);
  if (localPath) {
    try {
      const raw = JSON.parse(await readFile(localPath, "utf8")) as UserAudioLibraryManifest;
      if (raw?.version === 1 && Array.isArray(raw.assets)) {
        return {
          version: 1,
          ownerId,
          updatedAt: raw.updatedAt ?? new Date().toISOString(),
          assets: raw.assets.filter((asset) => asset && typeof asset.id === "string"),
        };
      }
    } catch {
      /* A missing local manifest is an empty library. */
    }
    return { version: 1, ownerId, updatedAt: new Date().toISOString(), assets: [] };
  }
  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return {
      version: 1,
      ownerId,
      updatedAt: new Date().toISOString(),
      assets: [],
    };
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return {
        version: 1,
        ownerId,
        updatedAt: new Date().toISOString(),
        assets: [],
      };
    }
    const raw = (await res.json()) as UserAudioLibraryManifest;
    if (raw?.version !== 1 || !Array.isArray(raw.assets)) {
      return {
        version: 1,
        ownerId,
        updatedAt: new Date().toISOString(),
        assets: [],
      };
    }
    return {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      assets: raw.assets.filter((a) => a && typeof a.id === "string"),
    };
  } catch {
    return {
      version: 1,
      ownerId,
      updatedAt: new Date().toISOString(),
      assets: [],
    };
  }
}

async function writeUserAudioLibraryManifest(manifest: UserAudioLibraryManifest): Promise<void> {
  const localPath = localManifestPath(manifest.ownerId);
  if (localPath) {
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }));
    return;
  }
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify(manifest), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_audio_library_manifest",
    },
  });
}

export async function uploadUserAudioLibraryAsset(params: {
  ownerId: string;
  kind: UserAudioLibraryAsset["kind"];
  name: string;
  category: string;
  mood: string;
  energy: UserAudioLibraryAsset["energy"];
  audioBuffer: Buffer;
  contentType: string;
  extension: string;
  durationSeconds: number;
}): Promise<UserAudioLibraryAsset> {
  if (localMediaDir()) {
    const stored = await writeCertifiedLocalFile({
      ownerId: params.ownerId,
      body: params.audioBuffer,
      mimeType: params.contentType,
      fileName: `${params.name}.${params.extension}`,
    });
    if (!stored) throw new Error("Local audio store is not configured.");
    const asset: UserAudioLibraryAsset = {
      id: stored.record.id,
      kind: params.kind,
      name: params.name.trim().slice(0, 120) || "Audio",
      category: params.category.trim().slice(0, 64) || "custom",
      mood: params.mood.trim().slice(0, 64) || "neutral",
      energy: params.energy,
      audioUrl: stored.browserPath,
      storageKey: stored.browserPath,
      durationSeconds: params.durationSeconds,
      createdAt: new Date().toISOString(),
    };
    const manifest = await readUserAudioLibraryManifest(params.ownerId);
    manifest.assets.unshift(asset);
    manifest.updatedAt = new Date().toISOString();
    await writeUserAudioLibraryManifest(manifest);
    return asset;
  }
  const assetId = randomUUID();
  const pathname = assetPathname(params.ownerId, assetId, params.extension);
  const uploaded = await uploadPublicBlob({
    pathname,
    body: params.audioBuffer,
    contentType: params.contentType,
    allowOverwrite: false,
    context: {
      uploadTarget: pathname,
      provider: "studio_audio_library_asset",
    },
  });

  const asset: UserAudioLibraryAsset = {
    id: assetId,
    kind: params.kind,
    name: params.name.trim().slice(0, 120) || "Audio",
    category: params.category.trim().slice(0, 64) || "custom",
    mood: params.mood.trim().slice(0, 64) || "neutral",
    energy: params.energy,
    audioUrl: uploaded.url,
    storageKey: uploaded.pathname,
    durationSeconds: params.durationSeconds,
    createdAt: new Date().toISOString(),
  };

  const manifest = await readUserAudioLibraryManifest(params.ownerId);
  manifest.assets.unshift(asset);
  manifest.updatedAt = new Date().toISOString();
  await writeUserAudioLibraryManifest(manifest);
  return asset;
}

export async function listUserAudioLibraryAssets(ownerId: string): Promise<UserAudioLibraryAsset[]> {
  const manifest = await readUserAudioLibraryManifest(ownerId);
  return manifest.assets;
}
