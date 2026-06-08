import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import {
  buildVoicePreviewTextHash,
  voicePreviewBlobPathname,
  VOICE_PREVIEW_CACHE_MANIFEST_PATH,
} from "@/lib/studio-voice-preview-cache-key";
import type {
  VoicePreviewCacheEntry,
  VoicePreviewCacheManifest,
  VoicePreviewType,
} from "@/types/studio-voice-preview-cache";

export type VoicePreviewCacheLookup = {
  audioUrl: string;
  blobPathname: string;
  textHash: string;
  cacheKey: string;
};

export async function readVoicePreviewCacheManifest(): Promise<VoicePreviewCacheManifest> {
  const url = await resolvePublicBlobUrlByPathname(VOICE_PREVIEW_CACHE_MANIFEST_PATH);
  if (!url) {
    return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
    }
    const raw = (await res.json()) as VoicePreviewCacheManifest;
    if (raw?.version !== 1 || !raw.entries || typeof raw.entries !== "object") {
      return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
    }
    return {
      version: 1,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      entries: raw.entries,
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), entries: {} };
  }
}

async function writeVoicePreviewCacheManifest(manifest: VoicePreviewCacheManifest): Promise<void> {
  await uploadPublicBlob({
    pathname: VOICE_PREVIEW_CACHE_MANIFEST_PATH,
    body: Buffer.from(JSON.stringify(manifest), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: VOICE_PREVIEW_CACHE_MANIFEST_PATH,
      provider: "studio_voice_preview_cache_manifest",
    },
  });
}

function recordManifestHit(entry: VoicePreviewCacheEntry): void {
  void (async () => {
    try {
      const manifest = await readVoicePreviewCacheManifest();
      const existing = manifest.entries[entry.cacheKey];
      if (!existing) {
        return;
      }
      manifest.entries[entry.cacheKey] = {
        ...existing,
        estimatedCostSavedCount: (existing.estimatedCostSavedCount ?? 0) + 1,
        lastHitAt: new Date().toISOString(),
      };
      manifest.updatedAt = new Date().toISOString();
      await writeVoicePreviewCacheManifest(manifest);
    } catch (err) {
      console.error("[voice-preview-cache] manifest hit update failed", err);
    }
  })();
}

export async function lookupVoicePreviewCache(params: {
  voiceId: string;
  previewText: string;
  language: string;
  modelId: string;
}): Promise<VoicePreviewCacheLookup | null> {
  const textHash = buildVoicePreviewTextHash(params);
  const blobPathname = voicePreviewBlobPathname(params.voiceId, textHash);
  const audioUrl = await resolvePublicBlobUrlByPathname(blobPathname);
  if (!audioUrl) {
    return null;
  }

  const manifest = await readVoicePreviewCacheManifest();
  const entry = manifest.entries[textHash];
  if (entry) {
    recordManifestHit(entry);
  }

  return {
    audioUrl,
    blobPathname,
    textHash,
    cacheKey: textHash,
  };
}

export async function storeVoicePreviewCache(params: {
  voiceId: string;
  previewText: string;
  language: string;
  modelId: string;
  provider: string;
  previewType: VoicePreviewType;
  audioBuffer: Buffer;
  contentType?: string;
}): Promise<VoicePreviewCacheLookup> {
  const textHash = buildVoicePreviewTextHash(params);
  const blobPathname = voicePreviewBlobPathname(params.voiceId, textHash);
  const contentType = params.contentType?.trim() || "audio/mpeg";

  const uploaded = await uploadPublicBlob({
    pathname: blobPathname,
    body: params.audioBuffer,
    contentType,
    allowOverwrite: true,
    context: {
      uploadTarget: blobPathname,
      provider: "studio_voice_preview_cache",
    },
  });

  void (async () => {
    try {
      const manifest = await readVoicePreviewCacheManifest();
      manifest.entries[textHash] = {
        cacheKey: textHash,
        voiceId: params.voiceId,
        textHash,
        previewType: params.previewType,
        language: params.language,
        modelId: params.modelId,
        provider: params.provider,
        blobPathname: uploaded.pathname,
        blobUrl: uploaded.url,
        previewTextLength: params.previewText.length,
        createdAt: new Date().toISOString(),
        estimatedCostSavedCount: 0,
      };
      manifest.updatedAt = new Date().toISOString();
      await writeVoicePreviewCacheManifest(manifest);
    } catch (err) {
      console.error("[voice-preview-cache] manifest write failed", err);
    }
  })();

  return {
    audioUrl: uploaded.url,
    blobPathname: uploaded.pathname,
    textHash,
    cacheKey: textHash,
  };
}
