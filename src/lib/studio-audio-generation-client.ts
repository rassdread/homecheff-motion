import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export type GenerateStudioMusicResponse = {
  ok: true;
  asset: UserAudioLibraryAsset;
  cacheHit: boolean;
  provider: string;
  providerAssetId: string;
  previewUrl: string;
  audioUrl: string;
  durationSeconds: number;
};

export async function generateStudioMusicApi(params: {
  prompt: string;
  genre: string;
  mood: string;
  durationSeconds: number;
  instrumental?: boolean;
  name?: string;
}) {
  return fetchSameOriginJson<GenerateStudioMusicResponse>(
    sameOriginApiPath("/api/studio/audio-library/generate-music"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}

export async function generateStudioSfxApi(params: {
  prompt: string;
  category: string;
  durationSeconds?: number;
  name?: string;
  sceneLabel?: string;
}) {
  return fetchSameOriginJson<GenerateStudioMusicResponse>(
    sameOriginApiPath("/api/studio/audio-library/generate-sfx"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}
