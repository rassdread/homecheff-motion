import { randomUUID } from "node:crypto";
import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  UserAudioLibraryAsset,
  UserAudioLibraryManifest,
} from "@/types/studio-user-audio-library";

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/audio-library/manifest.json`;
}

function assetPathname(ownerId: string, assetId: string, extension: string): string {
  return `studio/${ownerId}/audio-library/assets/${assetId}.${extension}`;
}

export async function readUserAudioLibraryManifest(
  ownerId: string
): Promise<UserAudioLibraryManifest> {
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

export function findUserAudioLibraryAsset(
  assets: UserAudioLibraryAsset[],
  assetId: string | null | undefined
): UserAudioLibraryAsset | null {
  const id = assetId?.trim();
  if (!id) {
    return null;
  }
  return assets.find((a) => a.id === id) ?? null;
}
