import type {
  AssetLibraryPreferencesResponse,
  GeneratedReferenceHistoryItem,
  VoiceLibraryFavorite,
} from "@/types/studio-asset-library-preferences";

export async function fetchAssetLibraryPreferences(): Promise<
  { ok: true; data: AssetLibraryPreferencesResponse } | { ok: false; error: string }
> {
  const res = await fetch("/api/studio/asset-library/preferences", { cache: "no-store" });
  if (!res.ok) {
    return { ok: false, error: "Failed to load preferences" };
  }
  const json = (await res.json()) as { ok: boolean; data: AssetLibraryPreferencesResponse };
  return json.ok ? { ok: true, data: json.data } : { ok: false, error: "Failed to load preferences" };
}

export async function toggleAssetFavoriteApi(
  assetId: string,
  favorite: boolean
): Promise<{ ok: true; favorites: string[] } | { ok: false }> {
  const res = await fetch("/api/studio/asset-library/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle_favorite", assetId, favorite }),
  });
  if (!res.ok) {
    return { ok: false };
  }
  const json = (await res.json()) as { ok: boolean; data: { favorites: string[] } };
  return json.ok ? { ok: true, favorites: json.data.favorites } : { ok: false };
}

export async function toggleVoiceFavoriteApi(params: {
  voiceRef: string;
  favorite: boolean;
  note?: string;
}): Promise<{ ok: true; voiceFavorites: VoiceLibraryFavorite[] } | { ok: false }> {
  const res = await fetch("/api/studio/asset-library/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "toggle_voice_favorite",
      voiceRef: params.voiceRef,
      favorite: params.favorite,
      note: params.note,
    }),
  });
  if (!res.ok) {
    return { ok: false };
  }
  const json = (await res.json()) as { ok: boolean; data: { voiceFavorites: VoiceLibraryFavorite[] } };
  return json.ok ? { ok: true, voiceFavorites: json.data.voiceFavorites } : { ok: false };
}

export async function recordAssetRecentApi(assetId: string): Promise<void> {
  await fetch("/api/studio/asset-library/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "record_recent", assetId }),
  });
}

export async function recordVoiceRecentApi(voiceRef: string): Promise<void> {
  await fetch("/api/studio/asset-library/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "record_voice_recent", voiceRef }),
  });
}

export async function fetchUserUploadLibrary(): Promise<
  { ok: true; uploads: import("@/types/studio-user-upload-library").UserLibraryUploadRecord[] } | { ok: false }
> {
  const res = await fetch("/api/studio/asset-library/uploads", { cache: "no-store" });
  if (!res.ok) {
    return { ok: false };
  }
  const json = (await res.json()) as {
    ok: boolean;
    uploads: import("@/types/studio-user-upload-library").UserLibraryUploadRecord[];
  };
  return json.ok ? { ok: true, uploads: json.uploads } : { ok: false };
}

export async function fetchGeneratedReferenceHistory(): Promise<
  { ok: true; data: GeneratedReferenceHistoryItem[] } | { ok: false; error: string }
> {
  const res = await fetch("/api/studio/asset-references/history?limit=50", { cache: "no-store" });
  if (!res.ok) {
    return { ok: false, error: "Failed to load history" };
  }
  const json = (await res.json()) as { ok: boolean; data: { items: GeneratedReferenceHistoryItem[] } };
  return json.ok ? { ok: true, data: json.data.items } : { ok: false, error: "Failed to load history" };
}
