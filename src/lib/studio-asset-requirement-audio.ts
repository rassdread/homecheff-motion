import { STUDIO_ASSET_REQUIREMENT_ENDPOINTS } from "@/lib/studio-asset-requirement-routing";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";

export type StudioAudioCacheLookup = {
  hit: boolean;
  source: "user_voice_library" | "user_audio_library" | "voice_catalog" | "none";
  previewUrl?: string;
  provider?: string;
  providerAssetId?: string;
};

export function findCachedVoiceAsset(
  voices: UserVoiceLibraryEntry[],
  label: string
): StudioAudioCacheLookup {
  const needle = label.trim().toLowerCase();
  const match =
    voices.find((v) => v.name.toLowerCase() === needle) ??
    voices.find((v) => v.status === "completed" && v.previewUrl);
  if (match?.previewUrl) {
    return {
      hit: true,
      source: "user_voice_library",
      previewUrl: match.previewUrl,
      provider: match.provider,
      providerAssetId: match.cloneId,
    };
  }
  return { hit: false, source: "none" };
}

export function findCachedMusicAsset(
  assets: UserAudioLibraryAsset[],
  label: string,
  mood = "warm"
): StudioAudioCacheLookup {
  const needle = label.trim().toLowerCase();
  const match =
    assets.find((a) => a.kind === "music" && a.name.toLowerCase() === needle) ??
    assets.find((a) => a.kind === "music" && a.mood === mood);
  if (match?.audioUrl) {
    return {
      hit: true,
      source: "user_audio_library",
      previewUrl: match.audioUrl,
      provider: "library",
      providerAssetId: match.id,
    };
  }
  return { hit: false, source: "none" };
}

export function findCachedSfxAsset(
  assets: UserAudioLibraryAsset[],
  label: string,
  category = "ambience"
): StudioAudioCacheLookup {
  const needle = label.trim().toLowerCase();
  const match =
    assets.find((a) => a.kind === "sfx" && a.name.toLowerCase() === needle) ??
    assets.find((a) => a.kind === "sfx" && a.category === category);
  if (match?.audioUrl) {
    return {
      hit: true,
      source: "user_audio_library",
      previewUrl: match.audioUrl,
      provider: "library",
      providerAssetId: match.id,
    };
  }
  return { hit: false, source: "none" };
}

export function audioLibraryEndpointForKind(kind: "music" | "sfx" | "voice"): string {
  if (kind === "voice") {
    return STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voiceLibrary;
  }
  return STUDIO_ASSET_REQUIREMENT_ENDPOINTS.audioLibrary;
}
