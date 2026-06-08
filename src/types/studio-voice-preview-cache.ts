/** Global lazy voice preview cache (Blob manifest — no schema migration). */

export type VoicePreviewType =
  | "chef"
  | "garden"
  | "designer"
  | "community"
  | "generic"
  | "custom";

export type VoicePreviewCacheEntry = {
  cacheKey: string;
  voiceId: string;
  textHash: string;
  previewType: VoicePreviewType;
  language: string;
  modelId: string;
  provider: string;
  blobPathname: string;
  blobUrl: string;
  previewTextLength: number;
  createdAt: string;
  estimatedCostSavedCount: number;
  lastHitAt?: string;
};

export type VoicePreviewCacheManifest = {
  version: 1;
  updatedAt: string;
  entries: Record<string, VoicePreviewCacheEntry>;
};
