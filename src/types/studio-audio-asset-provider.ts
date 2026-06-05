/**
 * V38 future hooks — external audio asset providers (not integrated in V38).
 */

export type StudioAudioAssetProviderId =
  | "homecheff_library"
  | "elevenlabs"
  | "suno"
  | "udio"
  | "artlist"
  | "epidemic"
  | "soundly"
  | "custom";

export type StudioAudioAssetSearchRequest = {
  category: "voice" | "music" | "ambience" | "sfx";
  query?: string;
  moodTags?: string[];
  energyTags?: string[];
  language?: string;
};

export type StudioAudioAssetSearchResult = {
  providerId: StudioAudioAssetProviderId;
  status: "not_implemented" | "completed" | "failed";
  assets: Array<{
    externalId: string;
    name: string;
    previewUrl?: string;
  }>;
  message?: string;
};

export interface StudioAudioAssetProviderAdapter {
  id: StudioAudioAssetProviderId;
  displayName: string;
  isConfigured(): boolean;
  search(request: StudioAudioAssetSearchRequest): Promise<StudioAudioAssetSearchResult>;
}
