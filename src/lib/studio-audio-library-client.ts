import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { StoryboardAudioAssetLinks, UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export async function fetchUserAudioLibraryApi() {
  return fetchSameOriginJson<{ assets: UserAudioLibraryAsset[] }>(
    sameOriginApiPath("/api/studio/audio-library")
  );
}

export async function uploadUserAudioLibraryAssetApi(
  file: File,
  params: {
    kind: "music" | "sfx";
    name: string;
    category: string;
    mood?: string;
    energy?: string;
  }
) {
  const form = new FormData();
  form.append("audio", file);
  form.append("kind", params.kind);
  form.append("name", params.name);
  form.append("category", params.category);
  if (params.mood) {
    form.append("mood", params.mood);
  }
  if (params.energy) {
    form.append("energy", params.energy);
  }
  return fetchSameOriginJson<{ ok: boolean; asset?: UserAudioLibraryAsset; error?: string }>(
    sameOriginApiPath("/api/studio/audio-library/upload"),
    { method: "POST", body: form }
  );
}

export async function linkStoryboardAudioAssetsApi(
  storyboardId: string,
  links: { musicAssetId?: string | null; soundAssetId?: string | null }
) {
  return fetchSameOriginJson<{ ok: boolean; links?: StoryboardAudioAssetLinks; error?: string }>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/audio-assets`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(links),
    }
  );
}
