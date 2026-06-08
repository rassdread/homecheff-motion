import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  AssetLibraryPreferencesManifest,
  AssetLibraryRecent,
  VoiceLibraryFavorite,
  VoiceLibraryRecent,
} from "@/types/studio-asset-library-preferences";

const MAX_RECENT = 40;

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/asset-library/manifest.json`;
}

function emptyManifest(ownerId: string): AssetLibraryPreferencesManifest {
  return {
    version: 1,
    ownerId,
    updatedAt: new Date().toISOString(),
    favorites: [],
    voiceFavorites: [],
    recentAssets: [],
    recentVoices: [],
  };
}

export async function readAssetLibraryPreferencesManifest(
  ownerId: string
): Promise<AssetLibraryPreferencesManifest> {
  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return emptyManifest(ownerId);
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return emptyManifest(ownerId);
    }
    const raw = (await res.json()) as AssetLibraryPreferencesManifest;
    if (raw?.version !== 1) {
      return emptyManifest(ownerId);
    }
    return {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
      voiceFavorites: Array.isArray(raw.voiceFavorites) ? raw.voiceFavorites : [],
      recentAssets: Array.isArray(raw.recentAssets) ? raw.recentAssets : [],
      recentVoices: Array.isArray(raw.recentVoices) ? raw.recentVoices : [],
    };
  } catch {
    return emptyManifest(ownerId);
  }
}

async function writeManifest(manifest: AssetLibraryPreferencesManifest): Promise<void> {
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_asset_library_manifest",
    },
  });
}

export async function toggleAssetFavorite(params: {
  ownerId: string;
  assetId: string;
  favorite: boolean;
}): Promise<string[]> {
  const manifest = await readAssetLibraryPreferencesManifest(params.ownerId);
  const ids = new Set(manifest.favorites.map((f) => f.assetId));
  if (params.favorite) {
    ids.add(params.assetId);
  } else {
    ids.delete(params.assetId);
  }
  manifest.favorites = [...ids].map((assetId) => ({
    assetId,
    addedAt: manifest.favorites.find((f) => f.assetId === assetId)?.addedAt ?? new Date().toISOString(),
  }));
  await writeManifest(manifest);
  return [...ids];
}

export async function setVoiceFavorite(params: {
  ownerId: string;
  voiceRef: string;
  favorite: boolean;
  note?: string;
}): Promise<VoiceLibraryFavorite[]> {
  const manifest = await readAssetLibraryPreferencesManifest(params.ownerId);
  const ref = params.voiceRef.trim();
  if (!ref) {
    return manifest.voiceFavorites;
  }
  let list = manifest.voiceFavorites.filter((v) => v.voiceRef !== ref);
  if (params.favorite) {
    const existing = manifest.voiceFavorites.find((v) => v.voiceRef === ref);
    list = [
      {
        voiceRef: ref,
        addedAt: existing?.addedAt ?? new Date().toISOString(),
        note: params.note?.trim() || existing?.note,
      },
      ...list,
    ];
  }
  manifest.voiceFavorites = list;
  await writeManifest(manifest);
  return list;
}

export async function recordAssetLibraryRecent(params: {
  ownerId: string;
  assetId: string;
}): Promise<void> {
  const manifest = await readAssetLibraryPreferencesManifest(params.ownerId);
  const now = new Date().toISOString();
  const rest = manifest.recentAssets.filter((r) => r.assetId !== params.assetId);
  const next: AssetLibraryRecent[] = [{ assetId: params.assetId, lastUsedAt: now }, ...rest].slice(
    0,
    MAX_RECENT
  );
  manifest.recentAssets = next;
  await writeManifest(manifest);
}

export async function recordVoiceLibraryRecent(params: {
  ownerId: string;
  voiceRef: string;
}): Promise<void> {
  const ref = params.voiceRef.trim();
  if (!ref) {
    return;
  }
  const manifest = await readAssetLibraryPreferencesManifest(params.ownerId);
  const now = new Date().toISOString();
  const rest = manifest.recentVoices.filter((r) => r.voiceRef !== ref);
  const next: VoiceLibraryRecent[] = [{ voiceRef: ref, lastUsedAt: now }, ...rest].slice(
    0,
    MAX_RECENT
  );
  manifest.recentVoices = next;
  await writeManifest(manifest);
}

export function preferencesToResponse(
  manifest: AssetLibraryPreferencesManifest
): import("@/types/studio-asset-library-preferences").AssetLibraryPreferencesResponse {
  return {
    favorites: manifest.favorites.map((f) => f.assetId),
    voiceFavorites: manifest.voiceFavorites,
    recentAssetIds: manifest.recentAssets.map((r) => r.assetId),
    recentVoiceRefs: manifest.recentVoices.map((r) => r.voiceRef),
  };
}
