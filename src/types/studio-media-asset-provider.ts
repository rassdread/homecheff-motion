/**
 * V40 future hooks — external media providers (not integrated in V40).
 */

export type StudioMediaProviderId =
  | "elevenlabs_voice"
  | "openai_voice"
  | "suno_music"
  | "udio_music"
  | "freesound_sfx"
  | "character_pack"
  | "marketplace";

export type StudioMediaProviderAssetRequest = {
  category: import("@/types/studio-media-asset").StudioAssetCategory;
  query: string;
  language?: string;
};

export type StudioMediaProviderAssetResult = {
  providerId: StudioMediaProviderId;
  status: "not_implemented" | "queued" | "completed" | "failed";
  assets: Array<{ providerAssetId: string; name: string }>;
  message?: string;
};

export interface StudioMediaProviderAdapter {
  id: StudioMediaProviderId;
  displayName: string;
  supportedCategories: import("@/types/studio-media-asset").StudioAssetCategory[];
  isConfigured(): boolean;
  searchAssets(request: StudioMediaProviderAssetRequest): Promise<StudioMediaProviderAssetResult>;
  importAsset(providerAssetId: string): Promise<StudioMediaProviderAssetResult>;
}
