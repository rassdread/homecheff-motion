import { createHash } from "node:crypto";
import type { StudioProviderAudioCacheEntry } from "@/types/studio-v10-story-planning";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export function buildProviderAudioCacheKey(input: {
  kind: "music" | "sfx" | "voice";
  prompt: string;
  provider: string;
  genre?: string;
  mood?: string;
  sfxCategory?: string;
}): string {
  const raw = [
    input.kind,
    input.provider,
    input.prompt.trim().toLowerCase(),
    input.genre ?? "",
    input.mood ?? "",
    input.sfxCategory ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function findCachedProviderAudioAsset(
  entries: StudioProviderAudioCacheEntry[],
  key: string
): StudioProviderAudioCacheEntry | null {
  return entries.find((e) => e.providerAssetId === key || e.id === key) ?? null;
}

export function libraryAssetToCacheEntry(asset: UserAudioLibraryAsset, prompt: string): StudioProviderAudioCacheEntry {
  const key = buildProviderAudioCacheKey({
    kind: asset.kind === "music" ? "music" : "sfx",
    prompt,
    provider: "library",
    mood: asset.mood,
    sfxCategory: asset.category,
  });
  return {
    id: asset.id,
    kind: asset.kind === "music" ? "music" : "sfx",
    provider: "library",
    providerAssetId: key,
    audioUrl: asset.audioUrl,
    previewUrl: asset.audioUrl,
    prompt,
    durationSeconds: asset.durationSeconds,
    createdAt: asset.createdAt,
    usageCount: 1,
    lastUsedAt: new Date().toISOString(),
    libraryAssetId: asset.id,
  };
}

export function touchProviderAudioCacheEntry(entry: StudioProviderAudioCacheEntry): StudioProviderAudioCacheEntry {
  return {
    ...entry,
    usageCount: entry.usageCount + 1,
    lastUsedAt: new Date().toISOString(),
  };
}

export function findLibraryCacheMatch(
  assets: UserAudioLibraryAsset[],
  input: {
    kind: "music" | "sfx";
    prompt: string;
    mood?: string;
    category?: string;
  }
): { hit: true; asset: UserAudioLibraryAsset } | { hit: false } {
  const needle = input.prompt.trim().toLowerCase();
  const byName = assets.find(
    (a) => a.kind === input.kind && a.name.trim().toLowerCase() === needle
  );
  if (byName) {
    return { hit: true, asset: byName };
  }
  if (input.kind === "music" && input.mood) {
    const byMood = assets.find((a) => a.kind === "music" && a.mood === input.mood);
    if (byMood) {
      return { hit: true, asset: byMood };
    }
  }
  if (input.kind === "sfx" && input.category) {
    const byCat = assets.find((a) => a.kind === "sfx" && a.category === input.category);
    if (byCat) {
      return { hit: true, asset: byCat };
    }
  }
  return { hit: false };
}
