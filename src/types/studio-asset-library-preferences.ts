/** User asset library preferences — blob manifest (no schema migration). */

export type AssetLibraryFavorite = {
  assetId: string;
  addedAt: string;
};

export type VoiceLibraryFavorite = {
  voiceRef: string;
  addedAt: string;
  note?: string;
};

export type AssetLibraryRecent = {
  assetId: string;
  lastUsedAt: string;
};

export type VoiceLibraryRecent = {
  voiceRef: string;
  lastUsedAt: string;
};

export type AssetLibraryPreferencesManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  favorites: AssetLibraryFavorite[];
  voiceFavorites: VoiceLibraryFavorite[];
  recentAssets: AssetLibraryRecent[];
  recentVoices: VoiceLibraryRecent[];
};

export type GeneratedReferenceHistoryItem = {
  generationId: string;
  kind: string;
  createdAt: string;
  promptSummary: string;
  referenceImageUrl: string | null;
  referenceStorageKey: string | null;
  thumbnailUrl: string | null;
  sourceAssetName: string | null;
  sourceAssetId: string | null;
  origin: "generated" | "derived";
  costEventId: string;
  provider: string | null;
};

export type AssetLibraryPreferencesResponse = {
  favorites: string[];
  voiceFavorites: VoiceLibraryFavorite[];
  recentAssetIds: string[];
  recentVoiceRefs: string[];
};
